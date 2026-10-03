/**
 * Platform Tenancy Controller — sections 1 (Tenant Lifecycle) and 2
 * (Tenant Administration) of the superadmin console.
 *
 * Covers: tenant users list, reset tenant admin, impersonation (F4),
 * per-tenant feature flags, quotas, onboarding state, trials.
 * Every mutation is permission-gated at the route layer and audit-logged
 * via auditPlatformAction — see constants/platformPermissions.js.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const BaseController = require('./BaseController');
const { pool } = require('../config/database');
const { auditPlatformAction } = require('../services/platformAudit.service');
const { startImpersonation, endImpersonation, listImpersonations } = require('../services/platformImpersonation.service');
const { createLogger } = require('../helpers/controllerLogger');

const IMPERSONATION_COOKIE_MAX_AGE = 60 * 60 * 1000; // cap cookie at 1h; token TTL is shorter anyway

// The tenant feature flags a church can have toggled — keep in sync with
// what the church app checks via useFeatureFlag/module checks.
const TENANT_FLAGS = ['sms', 'telegram', 'treasury', 'gallery', 'documents', 'departments', 'approvals', 'mobile_app'];

const QUOTA_FIELDS = ['member_cap', 'storage_cap_mb', 'sms_credits', 'admin_seats'];

class PlatformTenancyController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PlatformTenancyController');
  }

  /**
   * GET /tenants/:id/users — §2.6: church users with role, MFA, lockout.
   */
  async getTenantUsers(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT id, email, username, first_name, last_name, role,
                is_active, mfa_enabled, last_login,
                failed_login_attempts, locked_until, created_at
         FROM users
         WHERE church_id = $1 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [id]
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getTenantUsers', error);
      this.error(res, 'Failed to fetch tenant users');
    }
  }

  /**
   * POST /tenants/:id/reset-admin — §2.2: force-reset a church admin's
   * password + clear lockout. Returns the temp password ONCE.
   * Body: { userId } — defaults to the church's first admin user.
   */
  async resetTenantAdmin(req, res) {
    const { id } = req.params;
    const { userId } = req.body || {};
    try {
      const target = userId
        ? await pool.query('SELECT id, email, role FROM users WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL', [userId, id])
        : await pool.query(
            `SELECT id, email, role FROM users
             WHERE church_id = $1 AND deleted_at IS NULL
               AND (role ILIKE '%admin%' OR role ILIKE '%pastor%')
             ORDER BY created_at ASC LIMIT 1`,
            [id]
          );
      if (target.rows.length === 0) {
        return this.notFound(res, 'No admin user found for this church');
      }
      const user = target.rows[0];
      const tempPassword = crypto.randomBytes(9).toString('base64url');
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      await pool.query(
        `UPDATE users
         SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, user.id]
      );
      await auditPlatformAction(req, {
        action: 'tenant.admin_password_reset',
        tenantId: id,
        details: { userId: user.id, email: user.email }
      });
      this.success(res, { userId: user.id, email: user.email, temporaryPassword: tempPassword }, 'Admin password reset — share the temporary password securely');
    } catch (error) {
      this.logger.error('resetTenantAdmin', error);
      this.error(res, 'Failed to reset tenant admin');
    }
  }

  /**
   * POST /tenants/:id/impersonate — §2.1 (F4): mint a church session as a
   * tenant user. Sets the same HttpOnly `jwt` cookie the church app uses.
   * Body: { userId, mode: 'readonly'|'full', reason, ttlMinutes? }
   */
  async impersonateTenant(req, res) {
    const { id } = req.params;
    const { userId, mode = 'readonly', reason, ttlMinutes } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return this.badRequest(res, 'A reason (min 5 chars) is required — it goes in the audit trail');
    }
    if (!['readonly', 'full'].includes(mode)) {
      return this.badRequest(res, "mode must be 'readonly' or 'full'");
    }
    try {
      const userResult = await pool.query(
        `SELECT id, email, role, is_active FROM users
         WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL`,
        [userId, id]
      );
      if (userResult.rows.length === 0) {
        return this.notFound(res, 'User not found in this church');
      }
      const target = userResult.rows[0];
      if (!target.is_active) {
        return this.badRequest(res, 'Cannot impersonate an inactive user');
      }

      const { sessionId, token, expiresAt } = await startImpersonation({
        platformUserId: req.platformUser.id,
        churchId: id,
        tenantUserId: target.id,
        roles: target.role ? [target.role] : [],
        mode,
        reason: reason.trim(),
        ttlMinutes
      });

      await auditPlatformAction(req, {
        action: 'tenant.impersonation_started',
        tenantId: id,
        resourceType: 'impersonation',
        resourceId: sessionId,
        details: { tenantUserId: target.id, email: target.email, mode, reason: reason.trim() }
      });

      // Same cookie the church login sets — the SPA treats this as a
      // normal session; req.impersonation marks it server-side.
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: IMPERSONATION_COOKIE_MAX_AGE
      });
      this.success(res, { sessionId, expiresAt, mode, impersonating: target.email }, 'Impersonation started — open the church app in a new tab');
    } catch (error) {
      this.logger.error('impersonateTenant', error);
      this.error(res, 'Failed to start impersonation');
    }
  }

  /**
   * POST /impersonate/end — end the current impersonation session and
   * clear the church session cookie.
   * Body: { sessionId }
   */
  async endImpersonationSession(req, res) {
    const { sessionId } = req.body || {};
    try {
      await endImpersonation({
        sessionId,
        endedBy: req.platformUser.id,
        reason: 'operator_end'
      });
      res.clearCookie('jwt');
      this.success(res, null, 'Impersonation ended');
    } catch (error) {
      this.logger.error('endImpersonationSession', error);
      this.error(res, 'Failed to end impersonation');
    }
  }

  /**
   * GET /impersonations — audit view of sessions, filterable by church.
   */
  async getImpersonations(req, res) {
    try {
      const rows = await listImpersonations({
        churchId: req.query.churchId || null,
        activeOnly: req.query.active === 'true',
        limit: Math.min(parseInt(req.query.limit, 10) || 50, 200)
      });
      this.success(res, rows);
    } catch (error) {
      this.logger.error('getImpersonations', error);
      this.error(res, 'Failed to list impersonations');
    }
  }

  /**
   * GET /tenants/:id/flags — §2.3: per-tenant feature flags.
   * Returns the full catalog merged with stored overrides.
   */
  async getTenantFlags(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT flag, enabled FROM tenant_feature_flags WHERE church_id = $1', [id]);
      const stored = Object.fromEntries(result.rows.map((r) => [r.flag, r.enabled]));
      const flags = TENANT_FLAGS.map((flag) => ({ flag, enabled: stored[flag] ?? true }));
      this.success(res, flags);
    } catch (error) {
      this.logger.error('getTenantFlags', error);
      this.error(res, 'Failed to fetch tenant flags');
    }
  }

  /**
   * PUT /tenants/:id/flags — body: { flag, enabled }
   */
  async setTenantFlag(req, res) {
    const { id } = req.params;
    const { flag, enabled } = req.body || {};
    if (!TENANT_FLAGS.includes(flag) || typeof enabled !== 'boolean') {
      return this.badRequest(res, `flag must be one of ${TENANT_FLAGS.join(', ')} and enabled a boolean`);
    }
    try {
      await pool.query(
        `INSERT INTO tenant_feature_flags (church_id, flag, enabled, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (church_id, flag)
         DO UPDATE SET enabled = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP`,
        [id, flag, enabled, req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'tenant.flag_updated',
        tenantId: id,
        details: { flag, enabled }
      });
      this.success(res, { flag, enabled }, 'Flag updated');
    } catch (error) {
      this.logger.error('setTenantFlag', error);
      this.error(res, 'Failed to update flag');
    }
  }

  /**
   * GET /tenants/:id/quotas — §2.4: limits on the churches row.
   */
  async getTenantQuotas(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT member_cap, storage_cap_mb, sms_credits, admin_seats,
                (SELECT COUNT(*) FROM users WHERE church_id = $1 AND deleted_at IS NULL) AS member_count
         FROM churches WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Church not found');
      this.success(res, result.rows[0]);
    } catch (error) {
      this.logger.error('getTenantQuotas', error);
      this.error(res, 'Failed to fetch quotas');
    }
  }

  /**
   * PUT /tenants/:id/quotas — body: { member_cap?, storage_cap_mb?, sms_credits?, admin_seats? }
   * null clears a cap (unlimited).
   */
  async setTenantQuotas(req, res) {
    const { id } = req.params;
    const updates = {};
    for (const field of QUOTA_FIELDS) {
      if (field in (req.body || {})) {
        const value = req.body[field];
        if (value !== null && (!Number.isInteger(value) || value < 0)) {
          return this.badRequest(res, `${field} must be a non-negative integer or null`);
        }
        updates[field] = value;
      }
    }
    if (Object.keys(updates).length === 0) {
      return this.badRequest(res, 'No quota fields supplied');
    }
    try {
      const setClauses = Object.keys(updates).map((f, i) => `${f} = $${i + 2}`).join(', ');
      await pool.query(
        `UPDATE churches SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id, ...Object.values(updates)]
      );
      await auditPlatformAction(req, {
        action: 'tenant.quotas_updated',
        tenantId: id,
        details: updates
      });
      this.success(res, updates, 'Quotas updated');
    } catch (error) {
      this.logger.error('setTenantQuotas', error);
      this.error(res, 'Failed to update quotas');
    }
  }

  /**
   * PUT /tenants/:id/onboarding — §1.2: update the checklist JSONB.
   * Body merges into onboarding_state.
   */
  async updateTenantOnboarding(req, res) {
    const { id } = req.params;
    const state = req.body || {};
    try {
      await pool.query(
        `UPDATE churches
         SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || $2::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, JSON.stringify(state)]
      );
      await auditPlatformAction(req, {
        action: 'tenant.onboarding_updated',
        tenantId: id,
        details: state
      });
      this.success(res, state, 'Onboarding updated');
    } catch (error) {
      this.logger.error('updateTenantOnboarding', error);
      this.error(res, 'Failed to update onboarding');
    }
  }

  /**
   * POST /tenants/:id/trial — §1.3: set or extend trial_ends_at.
   * Body: { days } — adds days to now (or to existing trial if later).
   * { end: true } ends the trial immediately.
   */
  async updateTenantTrial(req, res) {
    const { id } = req.params;
    const { days, end } = req.body || {};
    try {
      if (end) {
        await pool.query('UPDATE churches SET trial_ends_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      } else {
        const n = Number.parseInt(days, 10);
        if (!Number.isInteger(n) || n < 1 || n > 365) {
          return this.badRequest(res, 'days must be 1-365');
        }
        await pool.query(
          `UPDATE churches
           SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($2 || ' days')::INTERVAL
           WHERE id = $1`,
          [id, String(n)]
        );
      }
      await auditPlatformAction(req, {
        action: end ? 'tenant.trial_ended' : 'tenant.trial_extended',
        tenantId: id,
        details: end ? {} : { days }
      });
      this.success(res, null, end ? 'Trial ended' : 'Trial extended');
    } catch (error) {
      this.logger.error('updateTenantTrial', error);
      this.error(res, 'Failed to update trial');
    }
  }

  /**
   * POST /tenants/:id/quarantine — §8.2: isolate a tenant.
   * Body: { quarantined: boolean, reason }
   */
  async setTenantQuarantine(req, res) {
    const { id } = req.params;
    const { quarantined, reason } = req.body || {};
    if (typeof quarantined !== 'boolean') {
      return this.badRequest(res, 'quarantined must be boolean');
    }
    try {
      await pool.query('UPDATE churches SET quarantined = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id, quarantined]);
      await auditPlatformAction(req, {
        action: quarantined ? 'tenant.quarantined' : 'tenant.unquarantined',
        tenantId: id,
        details: { reason: reason || null }
      });
      this.success(res, { quarantined }, quarantined ? 'Tenant quarantined' : 'Quarantine lifted');
    } catch (error) {
      this.logger.error('setTenantQuarantine', error);
      this.error(res, 'Failed to update quarantine');
    }
  }
}

module.exports = new PlatformTenancyController();
