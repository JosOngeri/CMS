/**
 * Platform Business Controller — sections 9-13 of the superadmin
 * console: Billing & Revenue, Analytics & Reporting, Communication,
 * Support Operations, Platform Configuration.
 */
const BaseController = require('./BaseController');
const { pool } = require('../config/database');
const { auditPlatformAction } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');
const dunning = require('../services/platformDunning.service');
const maintenanceMode = require('../middleware/maintenanceMode');
const { startImpersonation } = require('../services/platformImpersonation.service');

const IMPERSONATION_COOKIE_MAX_AGE = 60 * 60 * 1000;

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
      // Instant auto-restore (9.5): paying the last overdue invoice lifts
      // a dunning suspension without waiting for the next scheduled pass.
      if (status === 'paid') {
        try {
          const { restored } = await dunning.restorePaidTenants(result.rows[0].church_id);
          if (restored > 0) {
            return this.success(res, result.rows[0], 'Invoice paid — tenant reactivated');
          }
        } catch (restoreError) {
          this.logger.warn('updateInvoiceStatus: auto-restore check failed', restoreError);
        }
      }
      this.success(res, result.rows[0], `Invoice ${status}`);
    } catch (error) {
      this.logger.error('updateInvoiceStatus', error);
      this.error(res, 'Failed to update invoice');
    }
  }

  /**
   * POST /billing/invoices/:id/credit — §9.4 credit note. Capped at the
   * invoice amount; the effective balance is amount - credit_amount.
   */
  async creditInvoice(req, res) {
    const { id } = req.params;
    const { amount, reason } = req.body || {};
    const credit = Number(amount);
    if (!credit || credit <= 0) return this.badRequest(res, 'amount must be positive');
    if (!reason || reason.trim().length < 3) return this.badRequest(res, 'reason is required');
    try {
      const result = await pool.query(
        `UPDATE platform_invoices
         SET credit_amount = LEAST($2, amount),
             credit_reason = $3,
             credited_at = CURRENT_TIMESTAMP,
             credited_by = $4
         WHERE id = $1 AND status <> 'void'
         RETURNING *`,
        [id, credit, reason.trim(), req.platformUser.id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Invoice not found (or voided)');
      await auditPlatformAction(req, {
        action: 'billing.invoice_credited',
        tenantId: result.rows[0].church_id,
        resourceType: 'invoice',
        resourceId: id,
        details: { credit_amount: result.rows[0].credit_amount, reason: reason.trim() }
      });
      this.success(res, result.rows[0], `Credit of ${result.rows[0].currency} ${result.rows[0].credit_amount} applied`);
    } catch (error) {
      this.logger.error('creditInvoice', error);
      this.error(res, 'Failed to credit invoice');
    }
  }

  /**
   * GET /billing/invoices/:id/print — §9.4 printable invoice. Returns a
   * self-contained HTML document the operator prints/saves as PDF.
   */
  async printInvoice(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT i.*, c.name AS church_name, c.slug AS church_slug
         FROM platform_invoices i JOIN churches c ON c.id = i.church_id WHERE i.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Invoice not found');
      const inv = result.rows[0];
      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
      const balance = Math.max(Number(inv.amount) - Number(inv.credit_amount || 0), 0);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.number)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#1f2937}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}.total{font-size:20px;font-weight:700}.meta{color:#6b7280;font-size:13px}.badge{display:inline-block;padding:3px 10px;border-radius:99px;border:1px solid #9ca3af;font-size:12px;text-transform:uppercase}</style>
</head><body>
<h1>Msabato Platform — Invoice</h1>
<p class="meta">Invoice <strong>${esc(inv.number)}</strong> &nbsp;·&nbsp; Status <span class="badge">${esc(inv.status)}</span></p>
<table>
<tr><th>Bill to</th><td>${esc(inv.church_name)} (${esc(inv.church_slug)})</td></tr>
<tr><th>Period</th><td>${fmtDate(inv.period_start)} → ${fmtDate(inv.period_end)}</td></tr>
<tr><th>Due date</th><td>${fmtDate(inv.due_date)}</td></tr>
<tr><th>Amount</th><td>${esc(inv.currency)} ${Number(inv.amount).toLocaleString()}</td></tr>
${Number(inv.credit_amount) > 0 ? `<tr><th>Credit note</th><td>- ${esc(inv.currency)} ${Number(inv.credit_amount).toLocaleString()} (${esc(inv.credit_reason)})</td></tr>` : ''}
<tr><th class="total">Balance due</th><td class="total">${esc(inv.currency)} ${balance.toLocaleString()}</td></tr>
</table>
${inv.notes ? `<p class="meta">Notes: ${esc(inv.notes)}</p>` : ''}
<p class="meta">Generated ${fmtDate(new Date())} · Msabato Church Management Platform</p>
</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      this.logger.error('printInvoice', error);
      this.error(res, 'Failed to render invoice');
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

  /** GET /analytics/adoption — per-tenant module usage counters (§10.3). */
  async getAdoptionReport(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name,
                (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS members,
                (SELECT COUNT(*) FROM payments p WHERE p.church_id = c.id) AS payments,
                (SELECT COUNT(*) FROM events e WHERE e.church_id = c.id) AS events,
                (SELECT COUNT(*) FROM documents d WHERE d.church_id = c.id) AS documents,
                (SELECT COUNT(*) FROM sms_organizations s WHERE s.church_id = c.id) AS sms_orgs,
                (SELECT COUNT(*) FROM announcements a WHERE a.church_id = c.id) AS announcements,
                (SELECT COUNT(*) FROM departments d WHERE d.church_id = c.id) AS departments
         FROM churches c ORDER BY c.name`
      );
      // Mark the modules each tenant actually uses — adoption is a set of
      // flags, not just raw counts.
      const rows = result.rows.map((r) => ({
        ...r,
        modules: {
          members: Number(r.members) > 0,
          payments: Number(r.payments) > 0,
          events: Number(r.events) > 0,
          documents: Number(r.documents) > 0,
          sms: Number(r.sms_orgs) > 0,
          announcements: Number(r.announcements) > 0,
          departments: Number(r.departments) > 0,
        },
      }));
      this.success(res, rows);
    } catch (error) {
      this.logger.error('getAdoptionReport', error);
      this.error(res, 'Failed to compute adoption report');
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

  /**
   * POST /support/tickets/:id/grant-access — §12.2. Time-boxed
   * impersonation of the ticket's church admin, recorded in
   * platform_support_access. The impersonation JWT itself enforces
   * expiry — this table is the audit link between ticket and session.
   */
  async grantSupportAccess(req, res) {
    const { id } = req.params;
    const { mode = 'readonly', ttlMinutes = 60, reason } = req.body || {};
    if (!['readonly', 'full'].includes(mode)) {
      return this.badRequest(res, "mode must be 'readonly' or 'full'");
    }
    try {
      const ticket = await pool.query(
        'SELECT t.*, c.name AS church_name FROM support_tickets t JOIN churches c ON c.id = t.church_id WHERE t.id = $1',
        [id]
      );
      if (ticket.rows.length === 0) return this.notFound(res, 'Ticket not found');
      const churchId = ticket.rows[0].church_id;

      // Impersonate the church's admin — the account support work
      // most often needs to see.
      const admin = await pool.query(
        `SELECT id, email, role FROM users
         WHERE church_id = $1 AND is_active = true AND deleted_at IS NULL
           AND role ILIKE '%admin%'
         ORDER BY created_at ASC LIMIT 1`,
        [churchId]
      );
      if (admin.rows.length === 0) {
        return this.badRequest(res, 'Church has no active admin user to impersonate');
      }
      const target = admin.rows[0];

      const { sessionId, token, expiresAt } = await startImpersonation({
        platformUserId: req.platformUser.id,
        churchId,
        tenantUserId: target.id,
        roles: target.role ? [target.role] : [],
        mode,
        reason: reason || `support ticket #${id}`,
        ttlMinutes
      });

      const grant = await pool.query(
        `INSERT INTO platform_support_access
           (ticket_id, church_id, impersonation_id, granted_by, mode, reason, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, churchId, sessionId, req.platformUser.id, mode, reason || `support ticket #${id}`, expiresAt]
      );

      await auditPlatformAction(req, {
        action: 'support.access_granted',
        tenantId: churchId,
        resourceType: 'support_access',
        resourceId: grant.rows[0].id,
        details: { ticket_id: id, mode, expires_at: expiresAt, as_user: target.email }
      });

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: IMPERSONATION_COOKIE_MAX_AGE
      });
      this.success(res, { grant: grant.rows[0], impersonating: target.email, expiresAt }, `Access granted as ${target.email} until ${expiresAt} — open the church app in a new tab`);
    } catch (error) {
      this.logger.error('grantSupportAccess', error);
      this.error(res, 'Failed to grant support access');
    }
  }

  /** GET /support/access — §12.2 list of grants (active + expired). */
  async listSupportAccess(req, res) {
    try {
      const result = await pool.query(
        `SELECT a.*, c.name AS church_name, pu.email AS granted_by_email,
                (a.revoked_at IS NULL AND a.expires_at > CURRENT_TIMESTAMP) AS active
         FROM platform_support_access a
         JOIN churches c ON c.id = a.church_id
         JOIN platform_users pu ON pu.id = a.granted_by
         ORDER BY a.created_at DESC LIMIT 100`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('listSupportAccess', error);
      this.error(res, 'Failed to fetch access grants');
    }
  }

  /** POST /support/access/:id/revoke — end the grant + its session early. */
  async revokeSupportAccess(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `UPDATE platform_support_access SET revoked_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND revoked_at IS NULL RETURNING impersonation_id`,
        [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Grant not found or already revoked');
      const impId = result.rows[0].impersonation_id;
      if (impId) {
        await pool.query(
          `UPDATE platform_impersonations SET ended_at = CURRENT_TIMESTAMP, end_reason = 'grant_revoked'
           WHERE id = $1 AND ended_at IS NULL`,
          [impId]
        );
      }
      await auditPlatformAction(req, {
        action: 'support.access_revoked',
        resourceType: 'support_access',
        resourceId: id
      });
      this.success(res, null, 'Access revoked — the session row is closed (its JWT still expires on schedule)');
    } catch (error) {
      this.logger.error('revokeSupportAccess', error);
      this.error(res, 'Failed to revoke access');
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

  // ── 9.5 Dunning ─────────────────────────────────────────────────────────

  /** GET /billing/dunning — overdue invoices + suspension preview. */
  async getDunningPreview(req, res) {
    try {
      const grace = await pool.query('SELECT value FROM platform_settings WHERE key = $1', ['dunning_grace_days']);
      const graceDays = Number(grace.rows[0]?.value ?? 14) || 14;
      const overdue = await pool.query(
        `SELECT i.id, i.number, i.amount, i.currency, i.due_date, i.church_id,
                c.name AS church_name, c.is_active,
                CURRENT_DATE - i.due_date AS days_overdue
         FROM platform_invoices i
         JOIN churches c ON c.id = i.church_id
         WHERE i.status = 'overdue'
         ORDER BY i.due_date ASC`
      );
      this.success(res, {
        graceDays,
        invoices: overdue.rows,
        willSuspend: overdue.rows.filter((i) => i.days_overdue > graceDays && i.is_active).length
      });
    } catch (error) {
      this.logger.error('getDunningPreview', error);
      this.error(res, 'Failed to load dunning state');
    }
  }

  /** POST /billing/dunning/run — execute one dunning pass now. */
  async runDunning(req, res) {
    try {
      const summary = await dunning.run();
      await auditPlatformAction(req, { action: 'billing.dunning_executed', details: summary });
      this.success(res, summary,
        `Dunning: ${summary.markedOverdue} newly overdue, ${summary.reminded} reminders, ${summary.suspended} suspended`);
    } catch (error) {
      this.logger.error('runDunning', error);
      this.error(res, 'Dunning run failed');
    }
  }

  // ── 13.6 Maintenance mode ───────────────────────────────────────────────

  /** GET /maintenance — current flag state. */
  async getMaintenance(req, res) {
    try {
      const r = await pool.query('SELECT value FROM platform_settings WHERE key = $1', ['maintenance_mode']);
      this.success(res, r.rows[0]?.value || { enabled: false });
    } catch (error) {
      this.logger.error('getMaintenance', error);
      this.error(res, 'Failed to fetch maintenance state');
    }
  }

  /** PUT /maintenance — {enabled, message?, endsAt?} */
  async setMaintenance(req, res) {
    const { enabled, message, endsAt } = req.body || {};
    if (typeof enabled !== 'boolean') return this.badRequest(res, 'enabled must be boolean');
    try {
      const current = await pool.query('SELECT value FROM platform_settings WHERE key = $1', ['maintenance_mode']);
      const next = {
        ...(current.rows[0]?.value || {}),
        enabled,
        message: message ?? current.rows[0]?.value?.message ?? 'Scheduled maintenance in progress — please try again shortly.',
        ends_at: endsAt ?? current.rows[0]?.value?.ends_at ?? null
      };
      await pool.query(
        `INSERT INTO platform_settings (key, value, description, updated_at)
         VALUES ('maintenance_mode', $1::jsonb, 'Tenant-facing maintenance switch', CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(next)]
      );
      maintenanceMode._resetCache(); // middleware picks it up immediately, not in 30s
      await auditPlatformAction(req, {
        action: enabled ? 'platform.maintenance_enabled' : 'platform.maintenance_disabled',
        details: { message: next.message, ends_at: next.ends_at }
      });
      this.success(res, next, enabled ? 'Maintenance mode ON — tenant API calls now return 503' : 'Maintenance mode off');
    } catch (error) {
      this.logger.error('setMaintenance', error);
      this.error(res, 'Failed to update maintenance mode');
    }
  }
}

module.exports = new PlatformBusinessController();
