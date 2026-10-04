/**
 * Platform Ops Controller — sections 4-8 of the superadmin console:
 * Monitoring & Health, Payments & Oversight, Security & Compliance,
 * Data Management, Disaster & Incident.
 */
const BaseController = require('./BaseController');
const { pool } = require('../config/database');
const { auditPlatformAction } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');
const alertEngine = require('../services/platformAlertEngine.service');
const backupService = require('../services/platformBackup.service');
const {
  PLATFORM_PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  OWNER_ONLY_PERMISSIONS,
} = require('../constants/platformPermissions');

class PlatformOpsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PlatformOpsController');
  }

  // ── §4 Monitoring & Health ────────────────────────────────────────────

  /**
   * GET /fleet — per-tenant status cards: members, users, last payment,
   * SMS usage this month, open alerts, subscription state.
   */
  async getFleet(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name, c.slug, c.is_active, c.quarantined, c.is_demo,
                c.subscription_tier, c.trial_ends_at, c.created_at,
                ts.status AS subscription_status,
                (SELECT COUNT(*) FROM users u WHERE u.church_id = c.id AND u.deleted_at IS NULL) AS user_count,
                (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS member_count,
                (SELECT MAX(p.created_at) FROM payments p WHERE p.church_id = c.id) AS last_payment_at,
                (SELECT COUNT(*) FROM payments p WHERE p.church_id = c.id AND p.status = 'pending' AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours') AS stuck_payments,
                (SELECT COUNT(*) FROM users u WHERE u.church_id = c.id AND u.last_login > CURRENT_TIMESTAMP - INTERVAL '7 days') AS active_users_7d
         FROM churches c
         LEFT JOIN tenant_subscriptions ts ON ts.church_id = c.id
         ORDER BY c.created_at DESC`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getFleet', error);
      this.error(res, 'Failed to fetch fleet status');
    }
  }

  /**
   * GET /jobs — platform job queue view (§4.5).
   */
  async getJobs(req, res) {
    try {
      // Aliased to the shape the fleet page reads: name/last_run_at/last_error.
      const result = await pool.query(
        `SELECT id, job_type AS name, status, error AS last_error,
                finished_at AS last_run_at, run_at, started_at, attempts, payload
         FROM platform_jobs ORDER BY run_at DESC LIMIT $1`,
        [Math.min(parseInt(req.query.limit, 10) || 50, 200)]
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getJobs', error);
      this.error(res, 'Failed to fetch jobs');
    }
  }

  /**
   * POST /jobs/:id/retry — requeue a failed job.
   */
  async retryJob(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `UPDATE platform_jobs
         SET status = 'queued', attempts = attempts + 1, error = NULL, started_at = NULL, finished_at = NULL
         WHERE id = $1 AND status = 'failed'
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'No failed job with that id');
      await auditPlatformAction(req, { action: 'ops.job_retried', resourceType: 'platform_job', resourceId: id });
      this.success(res, result.rows[0], 'Job requeued');
    } catch (error) {
      this.logger.error('retryJob', error);
      this.error(res, 'Failed to retry job');
    }
  }

  /**
   * GET /alerts — platform_alerts list (§4.6); POST /alerts/:id/resolve.
   */
  async getAlerts(req, res) {
    try {
      const result = await pool.query(
        `SELECT * FROM platform_alerts ORDER BY created_at DESC LIMIT $1`,
        [Math.min(parseInt(req.query.limit, 10) || 50, 200)]
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getAlerts', error);
      this.error(res, 'Failed to fetch alerts');
    }
  }

  async resolveAlert(req, res) {
    const { id } = req.params;
    const { notes } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE platform_alerts
         SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = $2, resolution_notes = $3
         WHERE id = $1 AND status <> 'resolved'
         RETURNING *`,
        [id, req.platformUser.id, notes || null]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Alert not found or already resolved');
      await auditPlatformAction(req, { action: 'ops.alert_resolved', resourceType: 'platform_alert', resourceId: id, details: { notes } });
      this.success(res, result.rows[0], 'Alert resolved');
    } catch (error) {
      this.logger.error('resolveAlert', error);
      this.error(res, 'Failed to resolve alert');
    }
  }

  // ── §5 Payments & Oversight ───────────────────────────────────────────

  /**
   * GET /payments — cross-tenant payment feed (§5.1).
   * Query: churchId, status, from, to, limit, page.
   */
  async getPaymentFeed(req, res) {
    const { churchId, status, from, to } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const clauses = [];
    const params = [];
    if (churchId) { params.push(churchId); clauses.push(`p.church_id = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`p.status = $${params.length}`); }
    if (from) { params.push(from); clauses.push(`p.created_at >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`p.created_at <= $${params.length}::date + INTERVAL '1 day'`); }
    params.push(limit, (page - 1) * limit);
    try {
      const result = await pool.query(
        `SELECT p.id, p.church_id, c.name AS church_name, p.amount, p.currency,
                p.status, p.payment_method,
                COALESCE(p.mpesa_receipt_number, p.mpesa_receipt, p.reference_number) AS transaction_reference,
                p.created_at, p.member_id, p.user_id
         FROM payments p
         JOIN churches c ON c.id = p.church_id
         ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
         ORDER BY p.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      const count = await pool.query(
        `SELECT COUNT(*) FROM payments p ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}`,
        params.slice(0, params.length - 2)
      );
      this.success(res, { payments: result.rows, total: parseInt(count.rows[0].count, 10), page, limit });
    } catch (error) {
      this.logger.error('getPaymentFeed', error);
      this.error(res, 'Failed to fetch payment feed');
    }
  }

  /**
   * GET /payments/stuck — pending > 24h across tenants (§5.2).
   */
  async getStuckPayments(req, res) {
    try {
      const result = await pool.query(
        `SELECT p.id, p.church_id, c.name AS church_name, p.amount, p.currency,
                p.status,
                COALESCE(p.mpesa_receipt_number, p.mpesa_receipt, p.reference_number) AS transaction_reference,
                p.created_at,
                CURRENT_TIMESTAMP - p.created_at AS stuck_for
         FROM payments p
         JOIN churches c ON c.id = p.church_id
         WHERE p.status = 'pending' AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
         ORDER BY p.created_at ASC
         LIMIT 200`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getStuckPayments', error);
      this.error(res, 'Failed to fetch stuck payments');
    }
  }

  /**
   * POST /payments/:id/reconcile — manually mark a payment completed or
   * failed (§5.2). Obligation recalc happens inside PaymentsRepository.
   */
  async reconcilePayment(req, res) {
    const { id } = req.params;
    const { status, note } = req.body || {};
    if (!['completed', 'failed'].includes(status)) {
      return this.badRequest(res, "status must be 'completed' or 'failed'");
    }
    try {
      const result = await pool.query(
        `UPDATE payments SET status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id, church_id, status`,
        [id, status]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Payment not found');
      await auditPlatformAction(req, {
        action: 'payments.reconciled',
        tenantId: result.rows[0].church_id,
        resourceType: 'payment',
        resourceId: id,
        details: { status, note: note || null }
      });
      this.success(res, result.rows[0], `Payment marked ${status}`);
    } catch (error) {
      this.logger.error('reconcilePayment', error);
      this.error(res, 'Failed to reconcile payment');
    }
  }

  /**
   * GET /payments/refunds — cross-tenant refund oversight (§5.4).
   */
  async getRefunds(req, res) {
    const { status } = req.query;
    const clauses = [];
    const params = [];
    if (status) { params.push(status); clauses.push(`r.status = $${params.length}`); }
    try {
      const result = await pool.query(
        `SELECT r.id, r.church_id, c.name AS church_name, r.payment_id,
                r.amount, r.reason, r.status, r.created_at, r.updated_at
         FROM refunds r
         JOIN churches c ON c.id = r.church_id
         ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
         ORDER BY r.created_at DESC LIMIT 200`,
        params
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getRefunds', error);
      this.error(res, 'Failed to fetch refunds');
    }
  }

  /**
   * POST /payments/refunds/:id/decision — platform approve/reject of a
   * pending refund (§5.4). The platform actor lives in the audit trail;
   * refunds.processed_by is a church-user FK and stays untouched.
   */
  async decideRefund(req, res) {
    const { id } = req.params;
    const { decision, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return this.badRequest(res, "decision must be 'approved' or 'rejected'");
    }
    try {
      const result = await pool.query(
        `UPDATE refunds SET status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'
         RETURNING id, church_id, payment_id, amount, status`,
        [id, decision]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Refund not found or already decided');
      await auditPlatformAction(req, {
        action: 'payments.refund_decided',
        tenantId: result.rows[0].church_id,
        resourceType: 'refund',
        resourceId: id,
        details: { decision, note: note || null, payment_id: result.rows[0].payment_id, amount: result.rows[0].amount }
      });
      this.success(res, result.rows[0], `Refund ${decision}`);
    } catch (error) {
      this.logger.error('decideRefund', error);
      this.error(res, 'Failed to decide refund');
    }
  }

  /**
   * GET /sms-ledger — per-tenant SMS spend view (§5.5): send counts by
   * status over the last 30 days, last activity and remaining credits.
   * sms_logs has no church_id — the sender's user row provides the scope.
   */
  async getSmsLedger(req, res) {
    try {
      // Per-message price comes from platform_settings.sms_pricing
      // ({cost_per_message, currency}) — message counts always show even
      // when no price is configured.
      const [result, pricing] = await Promise.all([
        pool.query(
          `SELECT c.id, c.name, c.sms_credits,
                  COUNT(s.id) FILTER (WHERE s.sent_at > CURRENT_TIMESTAMP - INTERVAL '30 days') AS sent_30d,
                  COUNT(s.id) FILTER (WHERE s.status IN ('failed','error') AND s.sent_at > CURRENT_TIMESTAMP - INTERVAL '30 days') AS failed_30d,
                  COUNT(s.id) AS total_sent,
                  MAX(s.sent_at) AS last_sent_at
           FROM churches c
           LEFT JOIN users u ON u.church_id = c.id
           LEFT JOIN sms_logs s ON s.sender_id = u.id
           GROUP BY c.id, c.name, c.sms_credits
           ORDER BY sent_30d DESC, c.name`
        ),
        pool.query(`SELECT value FROM platform_settings WHERE key = 'sms_pricing'`).catch(() => ({ rows: [] })),
      ]);
      const rate = Number(pricing.rows[0]?.value?.cost_per_message) || null;
      const currency = pricing.rows[0]?.value?.currency || 'KES';
      this.success(res, {
        pricing: rate ? { costPerMessage: rate, currency } : null,
        rows: result.rows.map((t) => ({
          ...t,
          cost_30d: rate ? Number((Number(t.sent_30d) * rate).toFixed(2)) : null,
          cost_total: rate ? Number((Number(t.total_sent) * rate).toFixed(2)) : null,
        })),
      });
    } catch (error) {
      this.logger.error('getSmsLedger', error);
      this.error(res, 'Failed to compute SMS ledger');
    }
  }

  // ── §6 Security & Compliance ──────────────────────────────────────────

  /**
   * GET /security — the security center rollup (§6.2): failed logins,
   * locked accounts, active impersonations, IP rules count.
   */
  async getSecurityCenter(req, res) {
    try {
      const [failedLogins, lockedUsers, activeImpersonations, ipRules, suspicious] = await Promise.all([
        pool.query(
          `SELECT u.email, c.name AS church_name, u.failed_login_attempts, u.last_login
           FROM users u JOIN churches c ON c.id = u.church_id
           WHERE u.failed_login_attempts > 0 AND u.deleted_at IS NULL
           ORDER BY u.failed_login_attempts DESC LIMIT 50`
        ),
        pool.query(
          `SELECT u.email, c.name AS church_name, u.locked_until
           FROM users u JOIN churches c ON c.id = u.church_id
           WHERE u.locked_until > CURRENT_TIMESTAMP`
        ),
        pool.query(
          `SELECT i.id, i.mode, i.started_at, i.expires_at, c.name AS church_name, pu.email AS operator
           FROM platform_impersonations i
           JOIN churches c ON c.id = i.church_id
           JOIN platform_users pu ON pu.id = i.platform_user_id
           WHERE i.ended_at IS NULL AND i.expires_at > CURRENT_TIMESTAMP`
        ),
        pool.query('SELECT * FROM platform_ip_rules WHERE is_active = true ORDER BY created_at DESC'),
        pool.query(
          `SELECT u.email, c.name AS church_name, COUNT(*) AS attempts
           FROM users u JOIN churches c ON c.id = u.church_id
           WHERE u.failed_login_attempts >= 3 AND u.deleted_at IS NULL
           GROUP BY u.email, c.name LIMIT 20`
        )
      ]);
      this.success(res, {
        failedLogins: failedLogins.rows,
        lockedUsers: lockedUsers.rows,
        activeImpersonations: activeImpersonations.rows,
        ipRules: ipRules.rows,
        suspicious: suspicious.rows
      });
    } catch (error) {
      this.logger.error('getSecurityCenter', error);
      this.error(res, 'Failed to load security center');
    }
  }

  /** POST /security/ip-rules — §6.3: add an allow/deny CIDR rule. */
  async createIpRule(req, res) {
    const { cidr, mode, reason } = req.body || {};
    if (!cidr || !['allow', 'deny'].includes(mode)) {
      return this.badRequest(res, "cidr and mode ('allow'|'deny') are required");
    }
    try {
      const result = await pool.query(
        `INSERT INTO platform_ip_rules (cidr, mode, reason, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [cidr.trim(), mode, reason || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'security.ip_rule_created', resourceType: 'ip_rule', resourceId: result.rows[0].id, details: { cidr, mode } });
      this.created(res, result.rows[0], 'IP rule added');
    } catch (error) {
      if (error.code === '23505') return this.error(res, new Error('Rule already exists'), 409);
      this.logger.error('createIpRule', error);
      this.error(res, 'Failed to create IP rule');
    }
  }

  /** DELETE /security/ip-rules/:id — deactivate a rule (audit keeps history). */
  async deleteIpRule(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'UPDATE platform_ip_rules SET is_active = false WHERE id = $1 RETURNING *', [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Rule not found');
      await auditPlatformAction(req, { action: 'security.ip_rule_deleted', resourceType: 'ip_rule', resourceId: id, details: { cidr: result.rows[0].cidr } });
      this.success(res, result.rows[0], 'Rule deactivated');
    } catch (error) {
      this.logger.error('deleteIpRule', error);
      this.error(res, 'Failed to delete IP rule');
    }
  }

  /** POST /security/unlock — clear a tenant user's lockout. Body {userId, churchId} */
  async unlockTenantUser(req, res) {
    const { userId, churchId } = req.body || {};
    if (!userId || !churchId) return this.badRequest(res, 'userId and churchId are required');
    try {
      const result = await pool.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND church_id = $2 RETURNING email`,
        [userId, churchId]
      );
      if (result.rows.length === 0) return this.notFound(res, 'User not found');
      await auditPlatformAction(req, { action: 'security.user_unlocked', tenantId: churchId, details: { userId, email: result.rows[0].email } });
      this.success(res, null, 'User unlocked');
    } catch (error) {
      this.logger.error('unlockTenantUser', error);
      this.error(res, 'Failed to unlock user');
    }
  }

  /** GET /security/data-requests + POST + PATCH — §6.6 DSAR/deletion log. */
  async getDataRequests(req, res) {
    try {
      const result = await pool.query(
        `SELECT dr.*, c.name AS church_name
         FROM platform_data_requests dr JOIN churches c ON c.id = dr.church_id
         ORDER BY dr.created_at DESC LIMIT 200`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getDataRequests', error);
      this.error(res, 'Failed to fetch data requests');
    }
  }

  async createDataRequest(req, res) {
    const { churchId, requestType, subjectEmail, requestedBy, notes } = req.body || {};
    if (!churchId || !['export', 'dsar', 'deletion', 'correction'].includes(requestType)) {
      return this.badRequest(res, 'churchId and a valid requestType are required');
    }
    try {
      const result = await pool.query(
        `INSERT INTO platform_data_requests (church_id, request_type, subject_email, requested_by, notes, handled_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [churchId, requestType, subjectEmail || null, requestedBy || null, notes || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'data.request_created', tenantId: churchId, resourceType: 'data_request', resourceId: result.rows[0].id, details: { requestType, subjectEmail } });
      this.created(res, result.rows[0], 'Request logged');
    } catch (error) {
      this.logger.error('createDataRequest', error);
      this.error(res, 'Failed to log request');
    }
  }

  async updateDataRequest(req, res) {
    const { id } = req.params;
    const { status, notes } = req.body || {};
    if (!['open', 'in_progress', 'fulfilled', 'rejected'].includes(status)) {
      return this.badRequest(res, 'Invalid status');
    }
    try {
      const result = await pool.query(
        `UPDATE platform_data_requests
         SET status = $2, notes = COALESCE($3, notes),
             fulfilled_at = CASE WHEN $2 = 'fulfilled' THEN CURRENT_TIMESTAMP ELSE fulfilled_at END,
             handled_by = $4
         WHERE id = $1 RETURNING *`,
        [id, status, notes || null, req.platformUser.id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Request not found');
      await auditPlatformAction(req, { action: 'data.request_updated', tenantId: result.rows[0].church_id, resourceType: 'data_request', resourceId: id, details: { status } });
      this.success(res, result.rows[0], 'Request updated');
    } catch (error) {
      this.logger.error('updateDataRequest', error);
      this.error(res, 'Failed to update request');
    }
  }

  /** GET + POST /security/credentials — §6.5 rotation registry. */
  async getCredentialRotations(req, res) {
    try {
      const result = await pool.query(
        `SELECT *, next_due_at < CURRENT_TIMESTAMP AS overdue
         FROM platform_credential_rotations ORDER BY next_due_at ASC NULLS LAST`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getCredentialRotations', error);
      this.error(res, 'Failed to fetch rotation registry');
    }
  }

  async markCredentialRotated(req, res) {
    const { secretName, nextDueAt, notes } = req.body || {};
    if (!secretName) return this.badRequest(res, 'secretName is required');
    try {
      const result = await pool.query(
        `INSERT INTO platform_credential_rotations (secret_name, last_rotated_at, next_due_at, notes, updated_by)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)
         ON CONFLICT (secret_name)
         DO UPDATE SET last_rotated_at = CURRENT_TIMESTAMP, next_due_at = $2,
                       notes = COALESCE($3, platform_credential_rotations.notes), updated_by = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [secretName, nextDueAt || null, notes || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'security.credential_rotated', resourceType: 'credential', resourceId: result.rows[0].id, details: { secretName } });
      this.success(res, result.rows[0], 'Rotation recorded');
    } catch (error) {
      this.logger.error('markCredentialRotated', error);
      this.error(res, 'Failed to record rotation');
    }
  }

  // ── §7 Data Management ────────────────────────────────────────────────

  /** GET /data/backups + POST + POST /:id/verify — §7.1 backup registry. */
  async getBackups(req, res) {
    try {
      const result = await pool.query(
        `SELECT b.*, c.name AS church_name FROM platform_backups b
         LEFT JOIN churches c ON c.id = b.church_id
         ORDER BY b.created_at DESC LIMIT 100`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getBackups', error);
      this.error(res, 'Failed to fetch backups');
    }
  }

  async recordBackup(req, res) {
    const { scope = 'full', churchId, filePath, sizeBytes, status = 'completed' } = req.body || {};
    try {
      const result = await pool.query(
        `INSERT INTO platform_backups (scope, church_id, file_path, size_bytes, status, initiated_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [scope, churchId || null, filePath || null, sizeBytes || null, status, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'data.backup_recorded', tenantId: churchId || undefined, resourceType: 'backup', resourceId: result.rows[0].id, details: { scope, status } });
      this.created(res, result.rows[0], 'Backup recorded');
    } catch (error) {
      this.logger.error('recordBackup', error);
      this.error(res, 'Failed to record backup');
    }
  }

  async verifyBackup(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `UPDATE platform_backups SET status = 'verified', verified_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Backup not found');
      await auditPlatformAction(req, { action: 'data.backup_verified', resourceType: 'backup', resourceId: id });
      this.success(res, result.rows[0], 'Backup verified');
    } catch (error) {
      this.logger.error('verifyBackup', error);
      this.error(res, 'Failed to verify backup');
    }
  }

  /**
   * GET /integrations — last-success/failure signals per external
   * integration (4.4). Derived from real tables — no synthetic pings.
   * status: green | amber | red | unconfigured | unknown.
   */
  async getIntegrations(req, res) {
    const daysAgo = (rows, col) => rows[0]?.[col]
      ? Math.floor((Date.now() - new Date(rows[0][col]).getTime()) / 86400000)
      : null;
    const pick = (lastSuccessAt, lastFailAt, failures24h, opts = {}) => {
      if (opts.unconfigured) return { status: 'unconfigured', detail: opts.detail };
      if (!lastSuccessAt && !lastFailAt) return { status: 'unknown', detail: opts.detail || 'No traffic recorded yet' };
      const age = daysAgo([{ t: lastSuccessAt }], 't');
      let status = 'green';
      if (failures24h > 5 || (lastFailAt && !lastSuccessAt)) status = 'red';
      else if (failures24h > 0 || age === null || age > 14) status = 'amber';
      return { status, last_success_at: lastSuccessAt, last_failure_at: lastFailAt, failures_24h: failures24h, detail: opts.detail };
    };

    try {
      const [mpesaOk, mpesaStuck, smsRecent, smsFailed, tgLast, tgCfg] = await Promise.all([
        pool.query(`SELECT MAX(created_at) AS t FROM payments WHERE status = 'completed' AND mpesa_receipt IS NOT NULL`),
        pool.query(`SELECT COUNT(*)::int AS n, MAX(created_at) AS t FROM payments WHERE status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`),
        pool.query(`SELECT MAX(sent_at) AS t FROM sms_logs WHERE status IN ('delivered','sent')`),
        pool.query(`SELECT COUNT(*)::int AS n, MAX(sent_at) AS t FROM sms_logs WHERE status IN ('failed','error') AND sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`),
        pool.query(`SELECT MAX(posted_at) AS t FROM telegram_posts`),
        pool.query(`SELECT COUNT(*)::int AS n FROM telegram_settings WHERE bot_token IS NOT NULL AND bot_token != ''`),
      ]);

      const integrations = [
        { name: 'M-Pesa payments', key: 'mpesa', ...pick(
            mpesaOk.rows[0].t,
            null,
            mpesaStuck.rows[0].n,
            { detail: mpesaStuck.rows[0].n > 0 ? `${mpesaStuck.rows[0].n} payment(s) stuck pending >24h` : 'Receiving payments' }) },
        { name: 'SMS provider', key: 'sms', ...pick(
            smsRecent.rows[0].t,
            smsFailed.rows[0].t,
            smsFailed.rows[0].n,
            { detail: 'Derived from sms_logs delivery records' }) },
        { name: 'Telegram', key: 'telegram', ...(tgCfg.rows[0].n === 0
            ? { status: 'unconfigured', detail: 'No bot token in telegram_settings' }
            : pick(tgLast.rows[0].t, null, 0, { detail: 'Last channel post' })) },
        { name: 'Email (SMTP)', key: 'email', ...(process.env.EMAIL_USER && process.env.EMAIL_PASS
            ? { status: 'unknown', detail: 'SMTP configured — sends are not logged, so health cannot be measured' }
            : { status: 'unconfigured', detail: 'EMAIL_USER/EMAIL_PASS not set — outbound email disabled' }) },
      ];

      this.success(res, integrations);
    } catch (error) {
      this.logger.error('getIntegrations', error);
      this.error(res, 'Failed to compute integration health');
    }
  }

  /**
   * GET /status — §11.3 public status page. No auth: tenants need this
   * reachable when things are broken. Deliberately reveals only component
   * health + incident titles, never internals.
   */
  async getPublicStatus(req, res) {
    try {
      const dbCheck = await pool.query('SELECT 1 AS ok').then(() => true).catch(() => false);
      const [maint, incidents, externalProbe] = await Promise.all([
        pool.query(`SELECT value FROM platform_settings WHERE key = 'maintenance_mode'`).catch(() => ({ rows: [] })),
        pool.query(
          `SELECT title, severity, status, created_at, resolved_at
           FROM platform_incidents
           WHERE tenant_id IS NULL
           ORDER BY created_at DESC LIMIT 10`
        ).catch(() => ({ rows: [] })),
        // Latest uptimeProbe row — 'api.external' means the cron is firing;
        // a stale probe (>15 min old) is itself a warning sign.
        pool.query(
          `SELECT status, response_time, last_check FROM platform_health
            WHERE service_name = 'api.external' ORDER BY last_check DESC LIMIT 1`
        ).catch(() => ({ rows: [] })),
      ]);
      const maintValue = maint.rows[0]?.value || {};
      const maintenance = maintValue.enabled === true;
      const active = incidents.rows.filter((i) => i.status !== 'resolved');
      const status = maintenance ? 'maintenance'
        : active.some((i) => i.severity === 'critical') ? 'major_outage'
        : active.length > 0 ? 'degraded'
        : dbCheck ? 'operational' : 'major_outage';
      this.success(res, {
        status,
        checked_at: new Date().toISOString(),
        components: [
          { name: 'API', status: 'operational' },
          { name: 'Database', status: dbCheck ? 'operational' : 'major_outage' },
          { name: 'Tenant access', status: maintenance ? 'maintenance' : 'operational' },
          ...(() => {
            const probe = externalProbe.rows[0];
            if (!probe) return [{ name: 'External probe', status: 'unknown' }];
            const staleMs = Date.now() - new Date(probe.last_check).getTime();
            const probeStatus = staleMs > 15 * 60 * 1000 ? 'degraded'
              : probe.status === 'healthy' ? 'operational' : 'major_outage';
            return [{ name: 'External probe', status: probeStatus }];
          })(),
        ],
        maintenance: maintenance ? { enabled: true, message: maintValue.message || null, ends_at: maintValue.ends_at || null } : { enabled: false },
        incidents: incidents.rows,
      });
    } catch (error) {
      this.logger.error('getPublicStatus', error);
      this.error(res, 'Status unavailable');
    }
  }

  /** POST /data/backups/:id/restore-staging — pg_restore into STAGING_DATABASE_URL only (7.1). */
  async restoreBackupToStaging(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM platform_backups WHERE id = $1', [id]);
      const backup = result.rows[0];
      if (!backup) return this.notFound(res, 'Backup not found');
      if (!['completed', 'verified'].includes(backup.status)) {
        return this.badRequest(res, 'Only completed or verified backups can be restored');
      }
      await backupService.restoreToStaging(backup.file_path);
      await auditPlatformAction(req, {
        action: 'data.backup_restored_staging',
        resourceType: 'backup',
        resourceId: id,
        details: { file: backup.file_path }
      });
      this.success(res, null, 'Backup restored into the staging database');
    } catch (error) {
      this.logger.error('restoreBackupToStaging', error);
      this.error(res, error.message.includes('STAGING_DATABASE_URL')
        ? 'Staging restore is not configured — set STAGING_DATABASE_URL on the server'
        : 'Restore failed');
    }
  }

  /** GET /data/storage — §7.4 per-tenant storage usage. */
  async getTenantStorage(req, res) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name, c.storage_cap_mb,
                (SELECT COUNT(*) FROM documents d WHERE d.church_id = c.id) AS document_count,
                (SELECT COUNT(*) FROM gallery_photos g WHERE g.church_id = c.id) AS photo_count,
                (SELECT COUNT(*) FROM payments p WHERE p.church_id = c.id) AS payment_count,
                (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) AS member_count
         FROM churches c ORDER BY member_count DESC`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getTenantStorage', error);
      this.error(res, 'Failed to fetch storage usage');
    }
  }

  /** GET /data/schema — §7.5 applied vs available migrations. */
  async getSchemaVersion(req, res) {
    try {
      let applied = [];
      try {
        const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
        applied = result.rows.map((r) => r.filename);
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }
      const fs = require('fs');
      const path = require('path');
      const available = fs.readdirSync(path.join(__dirname, '..', 'migrations'))
        .filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
      const pending = available.filter((f) => !applied.includes(f));
      this.success(res, { appliedCount: applied.length, availableCount: available.length, pending });
    } catch (error) {
      this.logger.error('getSchemaVersion', error);
      this.error(res, 'Failed to fetch schema version');
    }
  }

  // ── §8 Disaster & Incident ────────────────────────────────────────────

  /** GET/POST /incidents, PATCH /incidents/:id — §8.1 playbook. */
  async getIncidents(req, res) {
    try {
      const result = await pool.query(
        `SELECT i.*, c.name AS tenant_name, pu.name AS created_by_name
         FROM platform_incidents i
         LEFT JOIN churches c ON c.id = i.tenant_id
         LEFT JOIN platform_users pu ON pu.id = i.created_by
         ORDER BY CASE i.status WHEN 'resolved' THEN 1 ELSE 0 END, i.created_at DESC
         LIMIT 100`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getIncidents', error);
      this.error(res, 'Failed to fetch incidents');
    }
  }

  async createIncident(req, res) {
    const { title, summary, severity = 'medium', tenantId } = req.body || {};
    if (!title) return this.badRequest(res, 'title is required');
    try {
      const result = await pool.query(
        `INSERT INTO platform_incidents (title, summary, severity, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, summary || null, severity, tenantId || null, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'incident.created', tenantId: tenantId || undefined, resourceType: 'incident', resourceId: result.rows[0].id, details: { title, severity } });
      this.created(res, result.rows[0], 'Incident opened');
    } catch (error) {
      this.logger.error('createIncident', error);
      this.error(res, 'Failed to create incident');
    }
  }

  async updateIncident(req, res) {
    const { id } = req.params;
    const { status, summary, resolutionNotes } = req.body || {};
    if (!['open', 'investigating', 'monitoring', 'resolved'].includes(status)) {
      return this.badRequest(res, 'Invalid status');
    }
    try {
      const result = await pool.query(
        `UPDATE platform_incidents
         SET status = $2, summary = COALESCE($3, summary),
             resolution_notes = COALESCE($4, resolution_notes),
             resolved_at = CASE WHEN $2 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
         WHERE id = $1 RETURNING *`,
        [id, status, summary || null, resolutionNotes || null]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Incident not found');
      await auditPlatformAction(req, { action: 'incident.updated', tenantId: result.rows[0].tenant_id || undefined, resourceType: 'incident', resourceId: id, details: { status } });
      this.success(res, result.rows[0], `Incident ${status}`);
    } catch (error) {
      this.logger.error('updateIncident', error);
      this.error(res, 'Failed to update incident');
    }
  }

  // ── 4.6 Alert rules ─────────────────────────────────────────────────────

  /** GET /alert-rules — the rules the engine evaluates each cycle. */
  async getAlertRules(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM platform_alert_rules ORDER BY severity DESC, id ASC'
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getAlertRules', error);
      this.error(res, 'Failed to fetch alert rules');
    }
  }

  /** POST /alert-rules — {metric, comparator, threshold, severity, message, cooldownMinutes} */
  async createAlertRule(req, res) {
    const { metric, comparator, threshold, severity, message, cooldownMinutes, notifyChannels } = req.body || {};
    if (!metric || !alertEngine.METRICS[metric]) {
      return this.badRequest(res, `metric must be one of: ${Object.keys(alertEngine.METRICS).join(', ')}`);
    }
    if (!['>', '<', '>=', '<=', '='].includes(comparator) || typeof threshold !== 'number' || !message) {
      return this.badRequest(res, 'comparator (>,<,>=,<=,=), numeric threshold, and message are required');
    }
    const channels = Array.isArray(notifyChannels)
      ? notifyChannels.filter((c) => ['email', 'telegram'].includes(c))
      : [];
    try {
      const result = await pool.query(
        `INSERT INTO platform_alert_rules (metric, comparator, threshold, severity, message, cooldown_minutes, notify_channels, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [metric, comparator, threshold, severity || 'medium', message,
         Math.min(Math.max(Number(cooldownMinutes) || 60, 5), 1440), channels, req.platformUser.id]
      );
      await auditPlatformAction(req, { action: 'ops.alert_rule_created', resourceType: 'alert_rule', resourceId: result.rows[0].id, details: { metric, comparator, threshold } });
      this.created(res, result.rows[0], 'Alert rule created');
    } catch (error) {
      this.logger.error('createAlertRule', error);
      this.error(res, 'Failed to create alert rule');
    }
  }

  /** PATCH /alert-rules/:id — toggle enabled or adjust threshold/cooldown. */
  async updateAlertRule(req, res) {
    const { id } = req.params;
    const { enabled, threshold, cooldownMinutes, severity, message, notifyChannels } = req.body || {};
    const channels = Array.isArray(notifyChannels)
      ? notifyChannels.filter((c) => ['email', 'telegram'].includes(c))
      : null;
    try {
      const result = await pool.query(
        `UPDATE platform_alert_rules SET
           enabled = COALESCE($2, enabled),
           threshold = COALESCE($3, threshold),
           cooldown_minutes = COALESCE($4, cooldown_minutes),
           severity = COALESCE($5, severity),
           message = COALESCE($6, message),
           notify_channels = COALESCE($7, notify_channels)
         WHERE id = $1 RETURNING *`,
        [id, enabled, threshold, cooldownMinutes, severity, message, channels]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Rule not found');
      await auditPlatformAction(req, { action: 'ops.alert_rule_updated', resourceType: 'alert_rule', resourceId: id, details: req.body });
      this.success(res, result.rows[0], 'Rule updated');
    } catch (error) {
      this.logger.error('updateAlertRule', error);
      this.error(res, 'Failed to update rule');
    }
  }

  /** POST /alerts/evaluate — run one engine pass on demand. */
  async evaluateAlerts(req, res) {
    try {
      const summary = await alertEngine.evaluate();
      await auditPlatformAction(req, { action: 'ops.alerts_evaluated', details: summary });
      this.success(res, summary, `Evaluated ${summary.evaluated} rules — ${summary.fired} fired`);
    } catch (error) {
      this.logger.error('evaluateAlerts', error);
      this.error(res, 'Evaluation failed');
    }
  }

  // ── 7.1 Real backups ────────────────────────────────────────────────────

  /** POST /data/backups/run — execute a pg_dump now. */
  async runBackup(req, res) {
    try {
      const row = await backupService.runBackup(req.platformUser.id);
      await auditPlatformAction(req, {
        action: 'data.backup_executed', resourceType: 'backup', resourceId: row.id,
        details: { size_bytes: row.size_bytes, status: row.status }
      });
      this.success(res, row, `Backup ${row.status} — ${(row.size_bytes / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      this.logger.error('runBackup', error);
      this.error(res, `Backup failed: ${error.message}`);
    }
  }

  /**
   * GET /security/permission-audit (6.7) — every staff member's stored
   * permissions, resolved effective set, and drift warnings (owner-only
   * capabilities held by non-owners, perms outside the catalog).
   */
  async getPermissionAudit(req, res) {
    try {
      const users = await pool.query(
        'SELECT id, email, name, role, permissions, is_active, mfa_enabled FROM platform_users ORDER BY role, email'
      );
      const catalog = new Set(Object.values(PLATFORM_PERMISSION_GROUPS).flat());

      const audit = users.rows.map((u) => {
        let stored = u.permissions;
        if (typeof stored === 'string') {
          try { stored = JSON.parse(stored); } catch { stored = null; }
        }
        const effective = Array.isArray(stored) ? stored : (ROLE_PERMISSIONS[u.role] || []);
        const wildcard = effective.includes('*') || effective.includes('all');
        const warnings = [];
        if (!wildcard && u.role !== 'platform_owner') {
          for (const p of effective) {
            if (OWNER_ONLY_PERMISSIONS.includes(p)) {
              warnings.push(`holds owner-only '${p}'`);
            }
          }
        }
        if (Array.isArray(stored)) {
          for (const p of stored) {
            if (!catalog.has(p) && p !== '*' && p !== 'all') {
              warnings.push(`unknown permission '${p}' not in catalog`);
            }
          }
        }
        return {
          id: u.id, email: u.email, name: u.name, role: u.role,
          is_active: u.is_active, mfa_enabled: u.mfa_enabled,
          permissions_source: Array.isArray(stored) ? 'stored' : 'role-default',
          effective: wildcard ? ['* (all)'] : effective,
          warnings,
        };
      });

      this.success(res, {
        users: audit,
        catalog: PLATFORM_PERMISSION_GROUPS,
        roleDefaults: ROLE_PERMISSIONS,
      });
    } catch (error) {
      this.logger.error('getPermissionAudit', error);
      this.error(res, 'Failed to build permission audit');
    }
  }

  // ── 7.2 Tenant export ───────────────────────────────────────────────────

  /**
   * GET /tenants/:id/export — full church dump as a JSON download (7.2).
   * Owner-only (data:export). Every table is queried church-scoped; user
   * rows are stripped of credential columns before serialization.
   */
  async exportTenant(req, res) {
    const { id } = req.params;
    // Core tables a church needs to rebuild elsewhere. Order = dependency
    // order so a re-import can replay top-down.
    const TABLES = [
      'roles', 'departments', 'department_subcommittees', 'members',
      'users', 'events', 'event_attendance', 'payments', 'contributions',
      'pledges', 'expenses', 'budgets', 'documents', 'announcements',
      'sms_contacts', 'sms_logs', 'tenant_feature_flags',
      'tenant_subscriptions', 'platform_invoices',
    ];
    // Columns that must never leave the server.
    const STRIP = {
      users: ['password_hash', 'mfa_secret', 'password_reset_token', 'reset_token'],
    };

    try {
      const church = await pool.query(
        'SELECT id, name, slug, subscription_tier, is_active, created_at FROM churches WHERE id = $1',
        [id]
      );
      if (church.rows.length === 0) return this.notFound(res, 'Tenant not found');

      const dump = {
        exported_at: new Date().toISOString(),
        exported_by: req.platformUser.email,
        church: church.rows[0],
        tables: {},
      };

      for (const table of TABLES) {
        try {
          const result = await pool.query(
            `SELECT * FROM ${table} WHERE church_id = $1`, [id]
          );
          const strip = STRIP[table] || [];
          dump.tables[table] = result.rows.map((row) => {
            const clean = { ...row };
            for (const col of strip) delete clean[col];
            return clean;
          });
        } catch (tableErr) {
          // 42P01 = table genuinely absent (expected); anything else is a
          // real failure we must not disguise as "not present".
          this.logger.warn('exportTenant', `skipping ${table}: ${tableErr.message}`);
          dump.tables[table] = tableErr.code === '42P01'
            ? { skipped: 'table not present in this schema' }
            : { skipped: `export error: ${tableErr.message}` };
        }
      }

      await auditPlatformAction(req, {
        action: 'data.tenant_exported',
        tenantId: id,
        resourceType: 'church',
        resourceId: id,
        details: {
          church: church.rows[0].name,
          tables: Object.fromEntries(
            Object.entries(dump.tables).map(([t, rows]) => [t, Array.isArray(rows) ? rows.length : -1])
          ),
        },
      });

      const filename = `tenant-export-${church.rows[0].slug || id}-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(dump, null, 2));
    } catch (error) {
      this.logger.error('exportTenant', error);
      this.error(res, 'Export failed');
    }
  }

  /**
   * POST /payments/reconcile-statement — 5.3 M-Pesa statement import.
   * Accepts normalized rows (frontend parses the CSV): {reference, amount,
   * date}. Matches payments by transaction_reference; pending matches are
   * auto-completed, the rest come back classified for review.
   */
  async reconcileStatement(req, res) {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 5000) : [];
    if (rows.length === 0) return this.badRequest(res, 'rows[] required — parsed M-Pesa statement entries');
    const refs = [...new Set(rows.map((r) => String(r.reference || '').trim()).filter(Boolean))];
    if (refs.length === 0) return this.badRequest(res, 'No transaction references found in rows');

    try {
      const { rows: payments } = await pool.query(
        `SELECT p.id, p.church_id, c.name AS church_name, p.amount, p.status,
                COALESCE(p.mpesa_receipt_number, p.mpesa_receipt, p.reference_number) AS transaction_reference,
                p.created_at
           FROM payments p JOIN churches c ON c.id = p.church_id
          WHERE p.mpesa_receipt_number = ANY($1::text[])
             OR p.mpesa_receipt = ANY($1::text[])
             OR p.reference_number = ANY($1::text[])`,
        [refs]
      );
      const byRef = new Map(payments.map((p) => [p.transaction_reference, p]));

      const completedNow = [];
      const alreadySettled = [];
      const unmatched = [];
      for (const row of rows) {
        const ref = String(row.reference || '').trim();
        if (!ref) continue;
        const p = byRef.get(ref);
        if (!p) { unmatched.push({ reference: ref, amount: row.amount, date: row.date }); continue; }
        if (p.status === 'pending') {
          completedNow.push(p);
        } else {
          alreadySettled.push({ reference: ref, status: p.status, church: p.church_name });
        }
      }

      if (completedNow.length > 0) {
        await pool.query(
          `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::uuid[])`,
          [completedNow.map((p) => p.id)]
        );
      }

      // Pending payments NOT covered by this statement — still stuck.
      const stillPending = await pool.query(
        `SELECT p.id, c.name AS church_name, p.amount,
                COALESCE(p.mpesa_receipt_number, p.mpesa_receipt, p.reference_number) AS transaction_reference,
                p.created_at
           FROM payments p JOIN churches c ON c.id = p.church_id
          WHERE p.status = 'pending'
            AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
          ORDER BY p.created_at LIMIT 100`
      );

      await auditPlatformAction(req, {
        action: 'payments.statement_reconciled',
        details: {
          statement_rows: rows.length,
          completed_now: completedNow.length,
          already_settled: alreadySettled.length,
          unmatched: unmatched.length,
        },
      });

      this.success(res, {
        completedNow: completedNow.map((p) => ({ id: p.id, reference: p.transaction_reference, church: p.church_name, amount: p.amount })),
        alreadySettled,
        unmatched,
        stillPending: stillPending.rows,
      }, `Reconciled ${completedNow.length} payment(s) from ${rows.length} statement rows`);
    } catch (error) {
      this.logger.error('reconcileStatement', error);
      this.error(res, 'Statement reconciliation failed');
    }
  }

  /**
   * GET /logs — 4.7 log explorer over platform_app_logs (warn+ entries the
   * app writes itself). Filters: level, search (msg ILIKE), from, to, limit.
   */
  async getAppLogs(req, res) {
    try {
      const { level, search, from, to } = req.query;
      const limit = Math.min(Number(req.query.limit) || 200, 1000);
      const where = [];
      const params = [];
      if (level && ['warn', 'error', 'fatal'].includes(level)) {
        params.push(level); where.push(`level = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`); where.push(`msg ILIKE $${params.length}`);
      }
      if (from) { params.push(from); where.push(`created_at >= $${params.length}`); }
      if (to) { params.push(to); where.push(`created_at <= $${params.length}`); }
      params.push(limit);
      const { rows } = await pool.query(
        `SELECT id, level, msg, context, created_at
           FROM platform_app_logs
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY created_at DESC
          LIMIT $${params.length}`,
        params
      );
      this.success(res, rows);
    } catch (error) {
      if (error.code === '42P01') return this.success(res, []); // pre-migration
      this.logger.error('getAppLogs', error);
      this.error(res, 'Failed to load logs');
    }
  }
}

module.exports = new PlatformOpsController();
