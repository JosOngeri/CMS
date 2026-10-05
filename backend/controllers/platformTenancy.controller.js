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
const { importMembers } = require('../services/memberImport.service');
const { createLogger } = require('../helpers/controllerLogger');
const settingsRepo = require('../repositories/SettingsRepository');
const churchSettings = require('../helpers/churchSettings');
const { KEYS: SETTING_KEYS, SECRET_KEYS, GLOBAL_ONLY_KEYS, validateValue } = require('../constants/settingKeys');
const { invalidateChurchFlags } = require('../middleware/tenantFeatureFlag');
const { TENANT_FLAGS } = require('../constants/tenantFlags');

const IMPERSONATION_COOKIE_MAX_AGE = 60 * 60 * 1000; // cap cookie at 1h; token TTL is shorter anyway

// TENANT_FLAGS lives in constants/tenantFlags.js — shared with the
// enforcement middleware's route map and the church-facing features map.

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
        `SELECT id, email, username, first_name, last_name,
                COALESCE(to_jsonb(u)->>'role',
                         (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                          WHERE ur.user_id = u.id LIMIT 1)) AS role,
                is_active, mfa_enabled, last_login,
                failed_login_attempts, locked_until, created_at
         FROM users u
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
      invalidateChurchFlags(id);
      churchSettings.clearChurchCache(id); // /auth/profile features reflect it now
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

  /**
   * PUT /tenants/:id/settings — §2.5: config override. Merges the posted
   * JSON object into churches.settings (jsonb ||). Operator-level tool —
   * audited with the changed keys so forensics can see what was pushed.
   * Body: { settings: { ... } }
   */
  async updateTenantSettings(req, res) {
    const { id } = req.params;
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return this.badRequest(res, 'settings must be a JSON object');
    }
    try {
      const result = await pool.query(
        `UPDATE churches
         SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING settings`,
        [id, JSON.stringify(settings)]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Church not found');
      await auditPlatformAction(req, {
        action: 'tenant.settings_overridden',
        tenantId: id,
        details: { changed_keys: Object.keys(settings) }
      });
      this.success(res, result.rows[0].settings, 'Tenant settings updated');
    } catch (error) {
      this.logger.error('updateTenantSettings', error);
      this.error(res, 'Failed to update tenant settings');
    }
  }

  // ── Church settings catalog (settings table — functional config) ────
  // These endpoints operate on the `settings` key/value table where church
  // feature config actually lives — distinct from churches.settings jsonb
  // above, which holds tenancy metadata. Resolution: a church-scoped
  // override row wins over the church_id IS NULL global default.
  // Secrets (mpesa_passkey, sms_api_key) are masked to '***' on every read
  // and accepted write-only.

  _maskSetting(row, def) {
    const isOverride = row.church_id != null;
    return {
      key: row.key,
      category: row.category,
      label: row.label || def?.label || row.key,
      type: row.value_type || def?.type || 'string',
      scope: def?.scope || 'both',
      secret: !!def?.secret,
      managed: def ? GLOBAL_ONLY_KEYS.has(row.key) : false,
      editable: row.is_editable !== false,
      source: isOverride ? 'override' : 'global',
      value: def?.secret ? (row.value ? '***' : '') : row.value,
      defaultValue: def?.secret ? '' : row.default_value,
      validation: row.validation_rules || def?.validation || null,
      updatedAt: row.updated_at,
    };
  }

  /**
   * GET /tenants/:id/settings — resolved per-church catalog grouped by
   * category: each entry shows effective value + whether it's a church
   * override or the inherited global default.
   */
  async getTenantSettingsCatalog(req, res) {
    const { id } = req.params;
    try {
      const grouped = await settingsRepo.getAll(id);
      const catalog = {};
      for (const def of SETTING_KEYS) {
        catalog[def.category] = catalog[def.category] || [];
      }
      for (const [category, rows] of Object.entries(grouped)) {
        catalog[category] = rows
          .filter((r) => r.key !== 'key' && r.key !== 'value')
          .map((r) => this._maskSetting(r, SETTING_KEYS.find((d) => d.key === r.key)));
      }
      this.success(res, catalog);
    } catch (error) {
      this.logger.error('getTenantSettingsCatalog', error);
      this.error(res, 'Failed to fetch tenant settings catalog');
    }
  }

  /**
   * PUT /tenants/:id/settings — bulk upsert church overrides.
   * Body: { settings: { 'category/key': 'value', ... } }
   * Validates each entry against the manifest; rejects platform-managed
   * (global-scope) keys — those change via /settings/catalog.
   */
  async updateTenantSettingsCatalog(req, res) {
    const { id } = req.params;
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return this.badRequest(res, 'settings must be a JSON object');
    }
    const entries = Object.entries(settings);
    if (entries.length === 0) return this.badRequest(res, 'No settings provided');

    const errors = [];
    for (const [key, value] of entries) {
      if (GLOBAL_ONLY_KEYS.has(key)) {
        errors.push(`${key} is platform-managed and cannot be set per church`);
        continue;
      }
      const err = validateValue(key, value);
      if (err) errors.push(err);
    }
    if (errors.length) return this.badRequest(res, errors.join('; '));

    try {
      const church = await pool.query('SELECT id FROM churches WHERE id = $1', [id]);
      if (!church.rows[0]) return this.notFound(res, 'Church not found');

      for (const [key, value] of entries) {
        await settingsRepo.upsert(key, String(value ?? ''), id);
      }
      // Bust the 60s resolved-settings cache so church-side readers
      // (login, SMS gates, feature flags) see the new values now.
      churchSettings.clearChurchCache(id);
      await auditPlatformAction(req, {
        action: 'tenant.settings_catalog_updated',
        tenantId: id,
        details: { changed_keys: entries.map(([k]) => k) }
      });
      this.success(res, { updated: entries.length }, 'Tenant settings updated');
    } catch (error) {
      this.logger.error('updateTenantSettingsCatalog', error);
      this.error(res, 'Failed to update tenant settings');
    }
  }

  /**
   * DELETE /tenants/:id/settings/:key — drop the church override so the
   * key reverts to the global default. :key is the name after the
   * category slash (e.g. DELETE .../settings/site_name).
   */
  async deleteTenantSetting(req, res) {
    const { id, key } = req.params;
    try {
      const deleted = await settingsRepo.deleteByKey(key, id);
      churchSettings.clearChurchCache(id);
      await auditPlatformAction(req, {
        action: 'tenant.settings_override_removed',
        tenantId: id,
        details: { key }
      });
      this.success(res, { key, reverted: true }, deleted
        ? `Override removed; '${key}' now inherits the platform default`
        : `No override existed for '${key}'`);
    } catch (error) {
      this.logger.error('deleteTenantSetting', error);
      this.error(res, 'Failed to remove setting override');
    }
  }

  /**
   * GET /settings/catalog — all global default rows, manifest-shaped,
   * secrets masked. This is where platform-managed keys (provider creds)
   * are configured.
   */
  async getSettingsCatalog(req, res) {
    try {
      const grouped = await settingsRepo.getAll(null);
      const catalog = {};
      for (const def of SETTING_KEYS) catalog[def.category] = [];
      for (const [category, rows] of Object.entries(grouped)) {
        catalog[category] = (rows || [])
          .filter((r) => r.church_id == null && r.key !== 'key' && r.key !== 'value')
          .map((r) => this._maskSetting(r, SETTING_KEYS.find((d) => d.key === r.key)));
      }
      this.success(res, catalog);
    } catch (error) {
      this.logger.error('getSettingsCatalog', error);
      this.error(res, 'Failed to fetch settings catalog');
    }
  }

  /**
   * PUT /settings/catalog — update global defaults / platform-managed
   * keys. Body: { settings: { key: value } }
   */
  async updateSettingsCatalog(req, res) {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return this.badRequest(res, 'settings must be a JSON object');
    }
    const entries = Object.entries(settings);
    if (entries.length === 0) return this.badRequest(res, 'No settings provided');

    const errors = [];
    for (const [key, value] of entries) {
      const err = validateValue(key, value);
      if (err) errors.push(err);
    }
    if (errors.length) return this.badRequest(res, errors.join('; '));

    try {
      for (const [key, value] of entries) {
        // Secret fields submit the mask or empty to mean "unchanged".
        if (SECRET_KEYS.has(key) && (value === '***' || value === '' || value == null)) continue;
        await settingsRepo.upsert(key, String(value ?? ''), null);
      }
      // Global rows are every church's fallback — clear the whole cache.
      churchSettings.clearChurchCache();
      await auditPlatformAction(req, {
        action: 'platform.settings_catalog_updated',
        details: { changed_keys: entries.map(([k]) => k) }
      });
      this.success(res, { updated: entries.length }, 'Global settings updated');
    } catch (error) {
      this.logger.error('updateSettingsCatalog', error);
      this.error(res, 'Failed to update global settings');
    }
  }

  // ── 1.5 Offboarding ───────────────────────────────────────────────────

  /**
   * POST /tenants/:id/offboard — begin the offboarding lifecycle:
   * deactivate the church now, keep its data until retention_deadline.
   */
  async offboardTenant(req, res) {
    const { id } = req.params;
    const { reason, retentionDays = 30 } = req.body || {};
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return this.badRequest(res, 'A reason (min 5 chars) is required — it goes in the audit trail');
    }
    const days = Math.min(Math.max(Number(retentionDays) || 30, 1), 365);
    try {
      const result = await pool.query(
        `UPDATE churches
         SET is_active = false,
             offboarded_at = CURRENT_TIMESTAMP,
             retention_deadline = CURRENT_TIMESTAMP + ($2 || ' days')::interval,
             offboard_reason = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, offboarded_at, retention_deadline`,
        [id, days, reason.trim()]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Church not found');
      await auditPlatformAction(req, {
        action: 'tenant.offboarded',
        tenantId: id,
        details: { reason: reason.trim(), retention_days: days }
      });
      this.success(res, result.rows[0], `Tenant offboarded — data retained until ${result.rows[0].retention_deadline}`);
    } catch (error) {
      this.logger.error('offboardTenant', error);
      this.error(res, 'Failed to offboard tenant');
    }
  }

  // ── 6.4 Tenant session oversight ───────────────────────────────────────
  // Church sessions are refresh_tokens rows; revoking marks them used so
  // the refresh flow refuses them. Access JWTs still live out their TTL.

  /** GET /tenants/:id/sessions — refresh-token sessions per church user. */
  async getTenantSessions(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT rt.id, rt.user_id, u.email, to_jsonb(u)->>'role' AS role, rt.created_at, rt.expires_at,
                CASE WHEN rt.used THEN 'revoked' WHEN rt.expires_at < CURRENT_TIMESTAMP THEN 'expired' ELSE 'active' END AS status
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE u.church_id = $1
         ORDER BY rt.created_at DESC LIMIT 200`,
        [id]
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('getTenantSessions', error);
      this.error(res, 'Failed to fetch tenant sessions');
    }
  }

  /** POST /tenants/:id/users/:userId/revoke-sessions — force logout. */
  async revokeTenantUserSessions(req, res) {
    const { id, userId } = req.params;
    try {
      const user = await pool.query(
        'SELECT id, email FROM users WHERE id = $1 AND church_id = $2',
        [userId, id]
      );
      if (user.rows.length === 0) return this.notFound(res, 'User not found in this church');
      const result = await pool.query(
        'UPDATE refresh_tokens SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );
      await auditPlatformAction(req, {
        action: 'security.tenant_sessions_revoked',
        tenantId: id,
        resourceType: 'tenant_user',
        resourceId: userId,
        details: { email: user.rows[0].email, revoked: result.rowCount }
      });
      this.success(res, { revoked: result.rowCount }, `Revoked ${result.rowCount} session(s) for ${user.rows[0].email}`);
    } catch (error) {
      this.logger.error('revokeTenantUserSessions', error);
      this.error(res, 'Failed to revoke sessions');
    }
  }

  /** PATCH /tenants/:id/demo — §7.6 flag/unflag a church as demo data. */
  async setTenantDemo(req, res) {
    const { id } = req.params;
    const { isDemo } = req.body || {};
    if (typeof isDemo !== 'boolean') return this.badRequest(res, 'isDemo boolean required');
    try {
      const result = await pool.query(
        'UPDATE churches SET is_demo = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_demo',
        [id, isDemo]
      );
      if (result.rows.length === 0) return this.notFound(res, 'Church not found');
      await auditPlatformAction(req, {
        action: isDemo ? 'tenant.demo_flagged' : 'tenant.demo_unflagged',
        tenantId: id
      });
      this.success(res, result.rows[0], isDemo ? 'Marked as demo tenant' : 'Demo flag removed');
    } catch (error) {
      this.logger.error('setTenantDemo', error);
      this.error(res, 'Failed to update demo flag');
    }
  }

  /**
   * POST /tenants/purge-demos — §7.6 delete every demo church + its data.
   * Demos skip the retention window by design; owner-only via data:export.
   */
  async purgeDemoTenants(req, res) {
    const PURGE_TABLES = [
      'roles', 'departments', 'department_subcommittees', 'members',
      'users', 'events', 'event_attendance', 'payments', 'contributions',
      'pledges', 'expenses', 'budgets', 'documents', 'announcements',
      'sms_contacts', 'sms_logs', 'tenant_feature_flags',
      'tenant_subscriptions', 'platform_invoices',
    ];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const demos = await client.query('SELECT id, name FROM churches WHERE is_demo = true FOR UPDATE');
      if (demos.rows.length === 0) {
        await client.query('ROLLBACK');
        return this.success(res, { churches: 0 }, 'No demo tenants to purge');
      }
      const ids = demos.rows.map((d) => d.id);
      const deleted = {};
      for (const table of PURGE_TABLES) {
        const exists = await client.query('SELECT to_regclass($1) AS t', [table]);
        if (!exists.rows[0].t) continue;
        const r = await client.query(`DELETE FROM ${table} WHERE church_id = ANY($1)`, [ids]);
        deleted[table] = r.rowCount;
      }
      await client.query('DELETE FROM churches WHERE id = ANY($1)', [ids]);
      await client.query('COMMIT');
      await auditPlatformAction(req, {
        action: 'tenant.demo_purged',
        details: { churches: demos.rows.map((d) => d.name), deleted }
      });
      this.success(res, { churches: demos.rows.length, deleted }, `Purged ${demos.rows.length} demo tenant(s)`);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.error('purgeDemoTenants', error);
      this.error(res, `Demo purge failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * POST /tenants/:id/purge — permanently delete an offboarded tenant's
   * core data + the church row. Requires the retention deadline to have
   * passed; owner-only via the data:export permission gate.
   */
  async purgeTenant(req, res) {
    const { id } = req.params;
    const PURGE_TABLES = [
      'roles', 'departments', 'department_subcommittees', 'members',
      'users', 'events', 'event_attendance', 'payments', 'contributions',
      'pledges', 'expenses', 'budgets', 'documents', 'announcements',
      'sms_contacts', 'sms_logs', 'tenant_feature_flags',
      'tenant_subscriptions', 'platform_invoices',
    ];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const church = await client.query(
        'SELECT id, name, offboarded_at, retention_deadline FROM churches WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (church.rows.length === 0) {
        await client.query('ROLLBACK');
        return this.notFound(res, 'Church not found');
      }
      const { offboarded_at, retention_deadline } = church.rows[0];
      if (!offboarded_at) {
        await client.query('ROLLBACK');
        return this.badRequest(res, 'Tenant must be offboarded before it can be purged');
      }
      if (retention_deadline && new Date(retention_deadline) > new Date()) {
        await client.query('ROLLBACK');
        return this.badRequest(res, `Retention deadline ${new Date(retention_deadline).toISOString()} has not passed — purge is locked`);
      }

      const deleted = {};
      for (const table of PURGE_TABLES) {
        // to_regclass NULLs on a missing table — skipping is safer than
        // try/catch because any error would abort the whole transaction.
        const exists = await client.query('SELECT to_regclass($1) AS t', [table]);
        if (!exists.rows[0].t) { deleted[table] = 'missing'; continue; }
        const r = await client.query(`DELETE FROM ${table} WHERE church_id = $1`, [id]);
        deleted[table] = r.rowCount;
      }
      await client.query('DELETE FROM churches WHERE id = $1', [id]);
      await client.query('COMMIT');

      await auditPlatformAction(req, {
        action: 'tenant.purged',
        tenantId: id,
        details: { name: church.rows[0].name, deleted }
      });
      this.success(res, { deleted }, `Tenant ${church.rows[0].name} permanently purged`);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.error('purgeTenant', error);
      this.error(res, `Purge failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // ---- 6.8 per-tenant rate-limit overrides ---------------------------------

  async getTenantRateLimit(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT trl.church_id, trl.max_requests, trl.window_seconds, trl.note, trl.updated_at, c.name AS church_name
           FROM tenant_rate_limits trl JOIN churches c ON c.id = trl.church_id
          WHERE trl.church_id = $1`,
        [req.params.id]
      );
      this.success(res, rows[0] || null);
    } catch (error) {
      this.logger.error('getTenantRateLimit', error);
      this.error(res, 'Failed to load rate limit');
    }
  }

  async setTenantRateLimit(req, res) {
    const { maxRequests, windowSeconds = 60, note } = req.body || {};
    const max = Number.parseInt(maxRequests, 10);
    const window = Number.parseInt(windowSeconds, 10);
    if (!Number.isInteger(max) || max < 10 || max > 100000 || !Number.isInteger(window) || window < 10 || window > 3600) {
      return this.badRequest(res, 'maxRequests 10-100000, windowSeconds 10-3600');
    }
    try {
      const church = await pool.query('SELECT id FROM churches WHERE id = $1', [req.params.id]);
      if (church.rows.length === 0) return this.notFound(res, 'Church not found');
      const { rows } = await pool.query(
        `INSERT INTO tenant_rate_limits (church_id, max_requests, window_seconds, note, updated_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (church_id) DO UPDATE SET
           max_requests = EXCLUDED.max_requests, window_seconds = EXCLUDED.window_seconds,
           note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.params.id, max, window, note || null, req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'tenant.rate_limit_set',
        tenantId: req.params.id,
        details: { max_requests: max, window_seconds: window },
      });
      this.success(res, rows[0], `Rate limit set to ${max} req/${window}s`);
    } catch (error) {
      this.logger.error('setTenantRateLimit', error);
      this.error(res, 'Failed to set rate limit');
    }
  }

  async deleteTenantRateLimit(req, res) {
    try {
      const { rowCount } = await pool.query('DELETE FROM tenant_rate_limits WHERE church_id = $1', [req.params.id]);
      if (rowCount === 0) return this.notFound(res, 'No override for this tenant');
      await auditPlatformAction(req, {
        action: 'tenant.rate_limit_removed',
        tenantId: req.params.id,
      });
      this.success(res, { removed: true }, 'Override removed — global limit applies');
    } catch (error) {
      this.logger.error('deleteTenantRateLimit', error);
      this.error(res, 'Failed to remove rate limit');
    }
  }

  // ---- 1.4 tenant templates -------------------------------------------------

  /** Snapshot a church's departments + roles into a reusable template. */
  async createTemplate(req, res) {
    const { name, description, sourceChurchId } = req.body || {};
    if (!name || !sourceChurchId) return this.badRequest(res, 'name and sourceChurchId are required');
    try {
      const source = await pool.query('SELECT id, name FROM churches WHERE id = $1', [sourceChurchId]);
      if (source.rows.length === 0) return this.notFound(res, 'Source church not found');
      const [depts, roles] = await Promise.all([
        pool.query(
          `SELECT name, description, category, dept_type FROM departments
            WHERE church_id = $1 AND is_active = true ORDER BY name`,
          [sourceChurchId]
        ),
        pool.query(
          `SELECT name, description FROM roles WHERE church_id = $1 ORDER BY name`,
          [sourceChurchId]
        ),
      ]);
      const snapshot = { departments: depts.rows, roles: roles.rows };
      const { rows } = await pool.query(
        `INSERT INTO tenant_templates (name, description, source_church_id, snapshot, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, created_at`,
        [name, description || null, sourceChurchId, JSON.stringify(snapshot), req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'tenant_template.created',
        tenantId: sourceChurchId,
        details: { template: name, departments: depts.rows.length, roles: roles.rows.length },
      });
      this.created(res, { ...rows[0], counts: { departments: depts.rows.length, roles: roles.rows.length } },
        `Template "${name}" captured (${depts.rows.length} departments, ${roles.rows.length} roles)`);
    } catch (error) {
      this.logger.error('createTemplate', error);
      this.error(res, 'Failed to create template');
    }
  }

  async listTemplates(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT t.id, t.name, t.description, t.created_at, c.name AS source_church_name,
                jsonb_array_length(COALESCE(t.snapshot->'departments', '[]'::jsonb)) AS department_count,
                jsonb_array_length(COALESCE(t.snapshot->'roles', '[]'::jsonb)) AS role_count
           FROM tenant_templates t
           LEFT JOIN churches c ON c.id = t.source_church_id
          ORDER BY t.created_at DESC`
      );
      this.success(res, rows);
    } catch (error) {
      this.logger.error('listTemplates', error);
      this.error(res, 'Failed to list templates');
    }
  }

  /** Apply a template's departments + roles to an existing (usually new) tenant. */
  async applyTemplate(req, res) {
    const { id } = req.params; // church id
    const { templateId } = req.body || {};
    if (!templateId) return this.badRequest(res, 'templateId is required');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const church = await client.query('SELECT id, name FROM churches WHERE id = $1', [id]);
      if (church.rows.length === 0) { await client.query('ROLLBACK'); return this.notFound(res, 'Church not found'); }
      const tpl = await client.query('SELECT id, name, snapshot FROM tenant_templates WHERE id = $1', [templateId]);
      if (tpl.rows.length === 0) { await client.query('ROLLBACK'); return this.notFound(res, 'Template not found'); }

      const { departments = [], roles = [] } = tpl.rows[0].snapshot || {};
      let createdDepts = 0; let createdRoles = 0;
      for (const d of departments) {
        const r = await client.query(
          `INSERT INTO departments (church_id, name, description, category, dept_type)
           SELECT $1, $2, $3, $4, $5
            WHERE NOT EXISTS (SELECT 1 FROM departments WHERE church_id = $1 AND name = $2)`,
          [id, d.name, d.description || null, d.category || null, d.dept_type || 'ministry']
        );
        createdDepts += r.rowCount;
      }
      for (const role of roles) {
        const r = await client.query(
          `INSERT INTO roles (church_id, name, description)
           SELECT $1, $2, $3
            WHERE NOT EXISTS (SELECT 1 FROM roles WHERE church_id = $1 AND name = $2)`,
          [id, role.name, role.description || null]
        );
        createdRoles += r.rowCount;
      }
      await client.query('COMMIT');
      await auditPlatformAction(req, {
        action: 'tenant_template.applied',
        tenantId: id,
        details: { template: tpl.rows[0].name, departments_created: createdDepts, roles_created: createdRoles },
      });
      this.success(res, { departmentsCreated: createdDepts, rolesCreated: createdRoles },
        `Template applied: ${createdDepts} departments, ${createdRoles} roles created`);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.error('applyTemplate', error);
      this.error(res, 'Failed to apply template');
    } finally {
      client.release();
    }
  }

  // ---- 11.2 platform <-> church messaging -----------------------------------

  /** Thread view; marks church-authored messages read by platform on fetch. */
  async getTenantMessages(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT id, sender_type, sender_label, body, created_at
           FROM platform_tenant_messages
          WHERE church_id = $1
          ORDER BY created_at ASC LIMIT 200`,
        [req.params.id]
      );
      await pool.query(
        `UPDATE platform_tenant_messages
            SET read_by_platform_at = COALESCE(read_by_platform_at, CURRENT_TIMESTAMP)
          WHERE church_id = $1 AND sender_type = 'church' AND read_by_platform_at IS NULL`,
        [req.params.id]
      );
      this.success(res, rows);
    } catch (error) {
      if (error.code === '42P01') return this.success(res, []);
      this.logger.error('getTenantMessages', error);
      this.error(res, 'Failed to load messages');
    }
  }

  /**
   * 7.3 member CSV import wizard — the frontend parses the file and posts
   * normalized rows; the shared service dedups on name+phone per church.
   */
  async importTenantMembers(req, res) {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || rows.length === 0) return this.badRequest(res, 'rows[] required — parsed member records');
    try {
      const church = await pool.query('SELECT id, name FROM churches WHERE id = $1', [req.params.id]);
      if (church.rows.length === 0) return this.notFound(res, 'Church not found');
      const result = await importMembers(req.params.id, rows);
      await auditPlatformAction(req, {
        action: 'tenant.members_imported',
        tenantId: req.params.id,
        details: { inserted: result.inserted, skipped: result.skipped, failed: result.errors.length },
      });
      this.success(res, result, `Import complete: ${result.inserted} inserted, ${result.skipped} duplicates skipped, ${result.errors.length} failed`);
    } catch (error) {
      this.logger.error('importTenantMembers', error);
      this.error(res, 'Member import failed');
    }
  }

  async sendTenantMessage(req, res) {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 2000) return this.badRequest(res, 'Message body required (max 2000 chars)');
    try {
      const church = await pool.query('SELECT id, name FROM churches WHERE id = $1', [req.params.id]);
      if (church.rows.length === 0) return this.notFound(res, 'Church not found');
      const { rows } = await pool.query(
        `INSERT INTO platform_tenant_messages (church_id, sender_type, sender_label, body, read_by_platform_at)
         VALUES ($1, 'platform', $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
        [req.params.id, req.platformUser.name || 'Platform staff', body]
      );
      await auditPlatformAction(req, {
        action: 'tenant.message_sent',
        tenantId: req.params.id,
        details: { message_id: rows[0].id },
      });
      this.created(res, rows[0], `Message sent to ${church.rows[0].name}`);
    } catch (error) {
      this.logger.error('sendTenantMessage', error);
      this.error(res, 'Failed to send message');
    }
  }
}

module.exports = new PlatformTenancyController();
