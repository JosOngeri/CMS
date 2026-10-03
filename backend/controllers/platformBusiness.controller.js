/**
 * Platform Business Controller — sections 9-13 of the superadmin
 * console: Billing & Revenue, Analytics & Reporting, Communication,
 * Support Operations, Platform Configuration.
 */
const BaseController = require('./BaseController');
const { pool } = require('../config/database');
const { auditPlatformAction } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');

class PlatformBusinessController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PlatformBusinessController');
  }

  // ── §9 Billing & Revenue ──────────────────────────────────────────────

  /** GET /billing/plans — list subscription plans. */
  async getPlans(req, res) {
    try {
      const result = await pool.query('SELECT * FROM subscription_plans ORDER BY price_monthly ASC');
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getPlans', error);
      this.error(res, 'Failed to fetch plans');
    }
  }

  /** POST /billing/plans — create a plan. PATCH /billing/plans/:id — update. */
  async createPlan(req, res) {
    const { code, name, priceMonthly = 0, priceYearly = 0, currency = 'KES', features = [], memberCap, smsCreditsMonthly, storageCapMb, adminSeats } = req.body || {};
    if (!code || !name) return this.badRequest(res, 'code and name are required');
    try {
      const result = await pool.query(
        `INSERT INTO subscription_plans (code, name, price_monthly, price_yearly, currency, features, member_cap, sms_credits_monthly, storage_cap_mb, admin_seats)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [code, name, priceMonthly, priceYearly, currency, JSON.stringify(features), memberCap ?? null, smsCreditsMonthly ?? null, storageCapMb ?? null, adminSeats ?? null]
      );
      await auditPlatformAction(req, { action: 'billing.plan_created', resourceType: 'plan', resourceId: result.rows[0].id, details: { code } });
      this.created(res, result.rows[0], 'Plan created');
    } catch (error) {
      if (error.code === '23505') return this.error(res, new Error('Plan code already exists'), 409);
      this.logger.error('createPlan', error);
      this.error(res, 'Failed to create plan');
    }
  }

  async updatePlan(req, res) {
    const { id } = req.params;
    const fields = ['name', 'price_monthly', 'price_yearly', 'currency', 'member_cap', 'sms_credits_monthly', 'storage_cap_mb', 'admin_seats', 'is_active'];
    const camel = { price_monthly: 'priceMonthly', price_yearly: 'priceYearly', member_cap: 'memberCap', sms_credits_monthly: 'smsCreditsMonthly', storage_cap_mb: 'storageCapMb', admin_seats: 'adminSeats', is_active: 'isActive' };
    const updates = [];
    const params = [id];
    for (const field of fields) {
      const key = camel[field] || field;
      if (key in (req.body || {})) {
        params.push(field === 'features' ? JSON.stringify(req.body[key]) : req.body[key]);
        updates.push(`${field} = $${params.length}`);
      }
    }
    if ('features' in (req.body || {})) {
      params.push(JSON.stringify(req.body.features));
      updates.push(`features = $${params.length}`);
    }
    if (updates.length === 0) return this.badRequest(res, 'No fields to update');
    try {
      const result = await pool.query(`UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, params);
      if (result.rows.length === 0) return this.notFound(res, 'Plan not found');
      await auditPlatformAction(req, { action: 'billing.plan_updated', resourceType: 'plan', resourceId: id, details: { fields: updates.length } });
      this.success(res, result.rows[0], 'Plan updated');
    } catch (error) {
      this.logger.error('updatePlan', error);
      this.error(res, 'Failed to update plan');
    }
  }

  /** GET /billing/subscriptions — tenant subscription states with plan. */
  async getSubscriptions(req, res) {
    try {
      const result = await pool.query(
        `SELECT ts.*, c.name AS church_name, c.slug, sp.code AS plan_code, sp.name AS plan_name,
                sp.price_monthly, sp.price_yearly
         FROM tenant_subscriptions ts
         JOIN churches c ON c.id = ts.church_id
         LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
         ORDER BY ts.updated_at DESC`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getSubscriptions', error);
      this.error(res, 'Failed to fetch subscriptions');
    }
  }

  /** PUT /billing/subscriptions/:churchId — assign plan/status/cycle. */
  async updateSubscription(req, res) {
    const { churchId } = req.params;
    const { planId, status, billingCycle, currentPeriodEnd, trialEndsAt } = req.body || {};
    if (status && !['trialing', 'active', 'past_due', 'suspended', 'cancelled'].includes(status)) {
      return this.badRequest(res, 'Invalid status');
    }
    try {
      const result = await pool.query(
        `INSERT INTO tenant_subscriptions (church_id, plan_id, status, billing_cycle, current_period_end, trial_ends_at, cancelled_at, updated_by)
         VALUES ($1, $2, COALESCE($3, 'active'), COALESCE($4, 'monthly'), $5, $6,
                 CASE WHEN $3 = 'cancelled' THEN CURRENT_TIMESTAMP ELSE NULL END, $7)
         ON CONFLICT (church_id) DO UPDATE SET
           plan_id = COALESCE($2, tenant_subscriptions.plan_id),
           status = COALESCE($3, tenant_subscriptions.status),
           billing_cycle = COALESCE($4, tenant_subscriptions.billing_cycle),
           current_period_end = COALESCE($5, tenant_subscriptions.current_period_end),
           trial_ends_at = COALESCE($6, tenant_subscriptions.trial_ends_at),
           cancelled_at = CASE WHEN $3 = 'cancelled' THEN CURRENT_TIMESTAMP ELSE tenant_subscriptions.cancelled_at END,
           updated_by = $7, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [churchId, planId || null, status || null, billingCycle || null, currentPeriodEnd || null, trialEndsAt || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'billing.subscription_updated', tenantId: churchId, resourceType: 'subscription', resourceId: result.rows[0].id, details: { planId, status, billingCycle } });
      this.success(res, result.rows[0], 'Subscription updated');
    } catch (error) {
      this.logger.error('updateSubscription', error);
      this.error(res, 'Failed to update subscription');
    }
  }

  /** GET /billing/invoices + POST — invoice list and creation. */
  async getInvoices(req, res) {
    const { churchId, status } = req.query;
    const clauses = [];
    const params = [];
    if (churchId) { params.push(churchId); clauses.push(`i.church_id = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`i.status = $${params.length}`); }
    try {
      const result = await pool.query(
        `SELECT i.*, c.name AS church_name
         FROM platform_invoices i JOIN churches c ON c.id = i.church_id
         ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
         ORDER BY i.created_at DESC LIMIT 200`,
        params
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getInvoices', error);
      this.error(res, 'Failed to fetch invoices');
    }
  }

  async createInvoice(req, res) {
    const { churchId, amount, currency = 'KES', periodStart, periodEnd, dueDate, notes } = req.body || {};
    if (!churchId || amount == null) return this.badRequest(res, 'churchId and amount are required');
    try {
      const num = await pool.query(`SELECT 'INV-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY') || '-' || LPAD((COUNT(*) + 1)::text, 4, '0') AS n FROM platform_invoices`);
      const result = await pool.query(
        `INSERT INTO platform_invoices (church_id, number, status, amount, currency, period_start, period_end, due_date, notes, created_by)
         VALUES ($1, $2, 'open', $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [churchId, num.rows[0].n, amount, currency, periodStart || null, periodEnd || null, dueDate || null, notes || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'billing.invoice_created', tenantId: churchId, resourceType: 'invoice', resourceId: result.rows[0].id, details: { amount, currency } });
      this.created(res, result.rows[0], 'Invoice created');
    } catch (error) {
      this.logger.error('createInvoice', error);
      this.error(res, 'Failed to create invoice');
    }
  }

  /** POST /billing/invoices/:id/pay|void — invoice status transitions. */
  async updateInvoiceStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['paid', 'void', 'uncollectible', 'open'].includes(status)) {
      return this.badRequest(res, 'Invalid status');
    }
    try {
      const result = await pool.query(
        `UPDATE platform_invoices
         SET status = $2, paid_at = CASE WHEN $2 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
         WHERE id = $1 RETURNING *`,
        [id, status]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Invoice not found');
      await auditPlatformAction(req, { action: 'billing.invoice_updated', tenantId: result.rows[0].church_id, resourceType: 'invoice', resourceId: id, details: { status } });
      this.success(res, result.rows[0], `Invoice ${status}`);
    } catch (error) {
      this.logger.error('updateInvoiceStatus', error);
      this.error(res, 'Failed to update invoice');
    }
  }

  /** GET /billing/revenue — MRR, churn, collection rate (§9.6). */
  async getRevenueReport(req, res) {
    try {
      const [subs, collected, churned] = await Promise.all([
        pool.query(
          `SELECT ts.status, sp.price_monthly, sp.price_yearly, ts.billing_cycle
           FROM tenant_subscriptions ts LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
           WHERE ts.status IN ('active', 'trialing', 'past_due')`
        ),
        pool.query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM platform_invoices WHERE status = 'paid'`),
        pool.query(`SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'cancelled'`)
      ]);
      let mrr = 0;
      for (const row of subs.rows) {
        if (row.status !== 'active') continue;
        mrr += row.billing_cycle === 'yearly' ? (parseFloat(row.price_yearly) || 0) / 12 : (parseFloat(row.price_monthly) || 0);
      }
      const active = subs.rows.filter((r) => r.status === 'active').length;
      const cancelled = parseInt(churned.rows[0].count, 10);
      this.success(res, {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        activeSubscriptions: active,
        trialing: subs.rows.filter((r) => r.status === 'trialing').length,
        pastDue: subs.rows.filter((r) => r.status === 'past_due').length,
        cancelled,
        churnRate: active + cancelled > 0 ? Math.round((cancelled / (active + cancelled)) * 100) : 0,
        totalCollected: parseFloat(collected.rows[0].total),
        invoicesPaid: parseInt(collected.rows[0].count, 10)
      });
    } catch (error) {
      this.logger.error('getRevenueReport', error);
      this.error(res, 'Failed to compute revenue');
    }
  }

  // ── §10 Analytics & Reporting ─────────────────────────────────────────

  /** GET /analytics/growth — tenants by month, users, DAU/MAU (§10.2). */
  async getGrowthMetrics(req, res) {
    try {
      const [tenantsByMonth, users, activity] = await Promise.all([
        pool.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS tenants
           FROM churches GROUP BY 1 ORDER BY 1`
        ),
        pool.query('SELECT COUNT(*) AS total_users, COUNT(*) FILTER (WHERE is_active) AS active_users FROM users WHERE deleted_at IS NULL'),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '1 day') AS dau,
                  COUNT(*) FILTER (WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '30 days') AS mau
           FROM users WHERE deleted_at IS NULL`
        )
      ]);
      this.success(res, {
        tenantsByMonth: tenantsByMonth.rows,
        totalUsers: parseInt(users.rows[0].total_users, 10),
        activeUsers: parseInt(users.rows[0].active_users, 10),
        dau: parseInt(activity.rows[0].dau, 10),
        mau: parseInt(activity.rows[0].mau, 10)
      });
    } catch (error) {
      this.logger.error('getGrowthMetrics', error);
      this.error(res, 'Failed to compute growth metrics');
    }
  }

  /** GET /analytics/usage — payments volume, members per tenant (§10.4). */
  async getUsageReport(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS payment_volume,
                COUNT(p.id) AS payment_count,
                (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS members,
                (SELECT COUNT(*) FROM users u WHERE u.church_id = c.id AND u.deleted_at IS NULL) AS users
         FROM churches c
         LEFT JOIN payments p ON p.church_id = c.id
         GROUP BY c.id, c.name ORDER BY payment_volume DESC`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getUsageReport', error);
      this.error(res, 'Failed to compute usage report');
    }
  }

  // ── §11 Communication ─────────────────────────────────────────────────

  /** GET/POST /announcements, PATCH /:id — platform announcements (§11.1). */
  async getAnnouncements(req, res) {
    try {
      const result = await pool.query(
        `SELECT a.*, pu.name AS created_by_name
         FROM platform_announcements a LEFT JOIN platform_users pu ON pu.id = a.created_by
         ORDER BY a.created_at DESC LIMIT 100`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getAnnouncements', error);
      this.error(res, 'Failed to fetch announcements');
    }
  }

  async createAnnouncement(req, res) {
    const { title, body, severity = 'info', target = 'all', expiresAt } = req.body || {};
    if (!title || !body) return this.badRequest(res, 'title and body are required');
    try {
      const result = await pool.query(
        `INSERT INTO platform_announcements (title, body, severity, target, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [title, body, severity, target, expiresAt || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'communication.announcement_created', resourceType: 'announcement', resourceId: result.rows[0].id, details: { title, target } });
      this.created(res, result.rows[0], 'Announcement published');
    } catch (error) {
      this.logger.error('createAnnouncement', error);
      this.error(res, 'Failed to create announcement');
    }
  }

  async updateAnnouncement(req, res) {
    const { id } = req.params;
    const { isActive, title, body, severity } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE platform_announcements
         SET is_active = COALESCE($2, is_active), title = COALESCE($3, title),
             body = COALESCE($4, body), severity = COALESCE($5, severity)
         WHERE id = $1 RETURNING *`,
        [id, isActive ?? null, title || null, body || null, severity || null]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Announcement not found');
      await auditPlatformAction(req, { action: 'communication.announcement_updated', resourceType: 'announcement', resourceId: id, details: { isActive } });
      this.success(res, result.rows[0], 'Announcement updated');
    } catch (error) {
      this.logger.error('updateAnnouncement', error);
      this.error(res, 'Failed to update announcement');
    }
  }

  // ── §12 Support Operations ────────────────────────────────────────────

  /** GET /support/tickets + POST — ticket inbox (§12.1). */
  async getTickets(req, res) {
    const { status } = req.query;
    try {
      const result = await pool.query(
        `SELECT t.*, c.name AS church_name, pu.name AS assignee_name
         FROM support_tickets t
         LEFT JOIN churches c ON c.id = t.church_id
         LEFT JOIN platform_users pu ON pu.id = t.assignee_id
         ${status ? 'WHERE t.status = $1' : ''}
         ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.created_at DESC
         LIMIT 200`,
        status ? [status] : []
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getTickets', error);
      this.error(res, 'Failed to fetch tickets');
    }
  }

  async createTicket(req, res) {
    const { churchId, subject, priority = 'normal', requesterEmail, body } = req.body || {};
    if (!subject) return this.badRequest(res, 'subject is required');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO support_tickets (church_id, subject, priority, requester_email)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [churchId || null, subject, priority, requesterEmail || null]
      );
      if (body) {
        await client.query(
          `INSERT INTO support_ticket_messages (ticket_id, author_type, author_id, body)
           VALUES ($1, 'platform', $2, $3)`,
          [result.rows[0].id, String(req.platformUser.id), body]
        );
      }
      await client.query('COMMIT');
      await auditPlatformAction(req, { action: 'support.ticket_created', tenantId: churchId || undefined, resourceType: 'ticket', resourceId: result.rows[0].id, details: { subject } });
      this.created(res, result.rows[0], 'Ticket created');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('createTicket', error);
      this.error(res, 'Failed to create ticket');
    } finally {
      client.release();
    }
  }

  /** PATCH /support/tickets/:id — status/priority/assignee. */
  async updateTicket(req, res) {
    const { id } = req.params;
    const { status, priority, assigneeId } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE support_tickets
         SET status = COALESCE($2, status), priority = COALESCE($3, priority),
             assignee_id = COALESCE($4, assignee_id), updated_at = CURRENT_TIMESTAMP,
             resolved_at = CASE WHEN $2 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
         WHERE id = $1 RETURNING *`,
        [id, status || null, priority || null, assigneeId || null]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Ticket not found');
      await auditPlatformAction(req, { action: 'support.ticket_updated', tenantId: result.rows[0].church_id || undefined, resourceType: 'ticket', resourceId: id, details: { status, assigneeId } });
      this.success(res, result.rows[0], 'Ticket updated');
    } catch (error) {
      this.logger.error('updateTicket', error);
      this.error(res, 'Failed to update ticket');
    }
  }

  /** POST /support/tickets/:id/messages + GET — thread. */
  async getTicketMessages(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM support_ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getTicketMessages', error);
      this.error(res, 'Failed to fetch messages');
    }
  }

  async addTicketMessage(req, res) {
    const { id } = req.params;
    const { body } = req.body || {};
    if (!body) return this.badRequest(res, 'body is required');
    try {
      const result = await pool.query(
        `INSERT INTO support_ticket_messages (ticket_id, author_type, author_id, body)
         VALUES ($1, 'platform', $2, $3) RETURNING *`,
        [id, String(req.platformUser.id), body]
      );
      await pool.query(`UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP, status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END WHERE id = $1`, [id]);
      this.created(res, result.rows[0], 'Reply added');
    } catch (error) {
      this.logger.error('addTicketMessage', error);
      this.error(res, 'Failed to add message');
    }
  }

  /** GET/POST/PATCH /support/known-issues — §12.3. */
  async getKnownIssues(req, res) {
    try {
      const result = await pool.query('SELECT * FROM platform_known_issues ORDER BY created_at DESC LIMIT 100');
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getKnownIssues', error);
      this.error(res, 'Failed to fetch known issues');
    }
  }

  async createKnownIssue(req, res) {
    const { title, description, severity = 'medium' } = req.body || {};
    if (!title) return this.badRequest(res, 'title is required');
    try {
      const result = await pool.query(
        `INSERT INTO platform_known_issues (title, description, severity, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [title, description || null, severity, req.platformUser.id]
      );
      this.created(res, result.rows[0], 'Known issue recorded');
    } catch (error) {
      this.logger.error('createKnownIssue', error);
      this.error(res, 'Failed to create issue');
    }
  }

  async updateKnownIssue(req, res) {
    const { id } = req.params;
    const { status, affectedTenants } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE platform_known_issues
         SET status = COALESCE($2, status), affected_tenants = COALESCE($3, affected_tenants),
             resolved_at = CASE WHEN $2 = 'fixed' THEN CURRENT_TIMESTAMP ELSE resolved_at END
         WHERE id = $1 RETURNING *`,
        [id, status || null, affectedTenants ?? null]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Issue not found');
      this.success(res, result.rows[0], 'Issue updated');
    } catch (error) {
      this.logger.error('updateKnownIssue', error);
      this.error(res, 'Failed to update issue');
    }
  }

  /** GET /support/health-scores — §12.4 at-risk tenants. */
  async getHealthScores(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name, c.created_at,
                (SELECT MAX(u.last_login) FROM users u WHERE u.church_id = c.id) AS last_login,
                (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS members,
                (SELECT COUNT(*) FROM payments p WHERE p.church_id = c.id AND p.status = 'pending' AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours') AS stuck_payments,
                CASE
                  WHEN (SELECT MAX(u.last_login) FROM users u WHERE u.church_id = c.id) IS NULL THEN 0
                  WHEN (SELECT MAX(u.last_login) FROM users u WHERE u.church_id = c.id) < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 25
                  WHEN (SELECT MAX(u.last_login) FROM users u WHERE u.church_id = c.id) < CURRENT_TIMESTAMP - INTERVAL '14 days' THEN 50
                  WHEN (SELECT MAX(u.last_login) FROM users u WHERE u.church_id = c.id) < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 75
                  ELSE 100
                END AS health_score
         FROM churches c
         WHERE c.is_active = true
         ORDER BY health_score ASC, c.created_at ASC`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getHealthScores', error);
      this.error(res, 'Failed to compute health scores');
    }
  }

  // ── §13 Platform Configuration ────────────────────────────────────────

  /** GET/PUT /flags — global feature flags (§13.2). */
  async getPlatformFlags(req, res) {
    try {
      const result = await pool.query('SELECT * FROM platform_feature_flags ORDER BY flag');
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getPlatformFlags', error);
      this.error(res, 'Failed to fetch flags');
    }
  }

  async setPlatformFlag(req, res) {
    const { flag, enabled, rolloutPct = 100, description } = req.body || {};
    if (!flag || typeof enabled !== 'boolean') {
      return this.badRequest(res, 'flag and enabled are required');
    }
    try {
      const result = await pool.query(
        `INSERT INTO platform_feature_flags (flag, enabled, rollout_pct, description, updated_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (flag) DO UPDATE SET enabled = $2, rollout_pct = $3,
           description = COALESCE($4, platform_feature_flags.description), updated_by = $5, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [flag, enabled, rolloutPct, description || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'config.flag_updated', resourceType: 'feature_flag', resourceId: result.rows[0].id, details: { flag, enabled, rolloutPct } });
      this.success(res, result.rows[0], 'Flag updated');
    } catch (error) {
      this.logger.error('setPlatformFlag', error);
      this.error(res, 'Failed to update flag');
    }
  }

  /** GET /version — §13.7 deployed version info. */
  async getVersion(req, res) {
    try {
      const pkg = require('../../package.json');
      let sha = null;
      try {
        const { execSync } = require('child_process');
        sha = execSync('git rev-parse --short HEAD', { cwd: require('path').join(__dirname, '..', '..') }).toString().trim();
      } catch { /* deployed box may not have git — fine */ }
      this.success(res, { version: pkg.version, sha, node: process.version, uptime: Math.round(process.uptime()) });
    } catch (error) {
      this.logger.error('getVersion', error);
      this.error(res, 'Failed to fetch version');
    }
  }
}

module.exports = new PlatformBusinessController();
