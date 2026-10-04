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
                p.status, p.payment_method, p.transaction_reference, p.created_at,
                p.member_id, p.user_id
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
                p.status, p.transaction_reference, p.created_at,
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
    const { metric, comparator, threshold, severity, message, cooldownMinutes } = req.body || {};
    if (!metric || !alertEngine.METRICS[metric]) {
      return this.badRequest(res, `metric must be one of: ${Object.keys(alertEngine.METRICS).join(', ')}`);
    }
    if (!['>', '<', '>=', '<=', '='].includes(comparator) || typeof threshold !== 'number' || !message) {
      return this.badRequest(res, 'comparator (>,<,>=,<=,=), numeric threshold, and message are required');
    }
    try {
      const result = await pool.query(
        `INSERT INTO platform_alert_rules (metric, comparator, threshold, severity, message, cooldown_minutes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [metric, comparator, threshold, severity || 'medium', message,
         Math.min(Math.max(Number(cooldownMinutes) || 60, 5), 1440), req.platformUser.id]
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
    const { enabled, threshold, cooldownMinutes, severity, message } = req.body || {};
    try {
      const result = await pool.query(
        `UPDATE platform_alert_rules SET
           enabled = COALESCE($2, enabled),
           threshold = COALESCE($3, threshold),
           cooldown_minutes = COALESCE($4, cooldown_minutes),
           severity = COALESCE($5, severity),
           message = COALESCE($6, message)
         WHERE id = $1 RETURNING *`,
        [id, enabled, threshold, cooldownMinutes, severity, message]
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
}

module.exports = new PlatformOpsController();
