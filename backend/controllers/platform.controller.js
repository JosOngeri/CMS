const BaseController = require('./BaseController');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const churchPlatformGateway = require('../services/churchPlatformGateway.service');
const PlatformRepository = require('../repositories/PlatformRepository');
const { auditPlatformAction } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');
const { pool } = require('../config/database');
const { ROLE_PERMISSIONS } = require('../constants/platformPermissions');

const PLATFORM_USER_ROLES = ['platform_admin', 'support_staff'];
const EDITABLE_SETTINGS = new Set(['platform_name', 'support_email', 'tier_pricing', 'trial_days']);

/**
 * Platform Controller (SaaS Owner Dashboard)
 * Manages platform-level operations for the SaaS owner
 */
class PlatformController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PlatformController');
  }

  /**
   * Platform-wide statistics — computed live from churches/users/members.
   * The platform_stats snapshot table is never refreshed by a job, so
   * reading it would show whatever the migration or seeds last wrote.
   * MRR = Σ active churches per tier × configured tier price.
   */
  async getPlatformStats(req, res) {
    try {
      const [stats, settings] = await Promise.all([
        PlatformRepository.getLiveStats(),
        PlatformRepository.getSettings()
      ]);

      const pricing = settings.tier_pricing || {};
      let totalMRR = 0;
      const tierBreakdown = stats.tierBreakdown.map((row) => {
        const monthlyPrice = Number(pricing[row.tier] || 0);
        const activeCount = Number(row.active_count || 0);
        totalMRR += monthlyPrice * activeCount;
        return { tier: row.tier, activeCount, monthlyPrice, mrr: monthlyPrice * activeCount };
      });

      const totalChurches = Number(stats.total_churches || 0);
      const activeChurches = Number(stats.active_churches || 0);
      const dbHealth = await this._checkDatabase();

      this.success(res, {
        totalChurches,
        activeChurches,
        suspendedChurches: Number(stats.suspended_churches || 0),
        totalMRR,
        newChurchesThisMonth: Number(stats.new_this_month || 0),
        churnRate: totalChurches > 0 ? (Number(stats.churned_this_month || 0) / totalChurches) * 100 : 0,
        arpc: activeChurches > 0 ? totalMRR / activeChurches : 0,
        totalUsers: Number(stats.total_users || 0),
        totalMembers: Number(stats.total_members || 0),
        tierBreakdown,
        platformHealthScore: dbHealth.status === 'healthy' ? 100 : dbHealth.status === 'degraded' ? 60 : 10
      });
    } catch (error) {
      this.logger.error('getPlatformStats', error);
      this.error(res, 'Failed to fetch platform statistics');
    }
  }

  async _checkDatabase() {
    const started = Date.now();
    try {
      await pool.query('SELECT 1');
      const latencyMs = Date.now() - started;
      return { status: latencyMs > 500 ? 'degraded' : 'healthy', latencyMs };
    } catch {
      return { status: 'down', latencyMs: null };
    }
  }

  /**
   * Platform health — live DB probe + process metrics merged with any
   * recent per-service rows in platform_health.
   */
  async getPlatformHealth(req, res) {
    try {
      const dbHealth = await this._checkDatabase();
      const memory = process.memoryUsage();
      const live = {
        dbLatencyMs: dbHealth.latencyMs,
        uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
        memoryMb: Math.round(memory.rss / 1024 / 1024),
        nodeVersion: process.version
      };

      const healthResult = await pool.query(`
        SELECT service_name, status, response_time, error_rate, last_check
        FROM platform_health
        WHERE last_check >= NOW() - INTERVAL '1 hour'
        ORDER BY last_check DESC
      `);

      const services = healthResult.rows.map((row) => ({
        name: row.service_name,
        status: row.status,
        responseTime: row.response_time,
        errorRate: row.error_rate,
        lastCheck: row.last_check
      }));

      const statuses = [...services.map(s => s.status), dbHealth.status];
      let overall = 'healthy';
      if (statuses.includes('down')) {
        overall = 'down';
      } else if (statuses.includes('degraded')) {
        overall = 'degraded';
      }

      this.success(res, {
        api: 'healthy',
        database: dbHealth.status,
        overall,
        live,
        services
      });
    } catch (error) {
      this.logger.error('getPlatformHealth', error);
      this.error(res, 'Failed to fetch platform health');
    }
  }

  /**
   * Paginated platform audit log with actor names — powers the Audit page.
   */
  async getAuditLogs(req, res) {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;
    const action = typeof req.query.action === 'string' ? req.query.action.trim().slice(0, 100) : null;
    const resourceType = typeof req.query.resourceType === 'string' ? req.query.resourceType.trim().slice(0, 50) : null;

    try {
      const { logs, total } = await PlatformRepository.getAuditLogs({ action, resourceType, page, limit });
      this.success(res, { logs, pagination: this.buildPaginationMeta(total, page, limit) });
    } catch (error) {
      this.logger.error('getAuditLogs', error);
      this.error(res, 'Failed to fetch audit logs');
    }
  }

  async getAuditActions(req, res) {
    try {
      const actions = await PlatformRepository.getAuditActions();
      this.success(res, actions);
    } catch (error) {
      this.logger.error('getAuditActions', error);
      this.error(res, 'Failed to fetch audit actions');
    }
  }

  /**
   * Platform settings — editable SaaS configuration (tier pricing drives
   * the MRR estimate).
   */
  async getSettings(req, res) {
    try {
      const settings = await PlatformRepository.getSettings();
      this.success(res, settings);
    } catch (error) {
      this.logger.error('getSettings', error);
      this.error(res, 'Failed to fetch platform settings');
    }
  }

  async updateSettings(req, res) {
    const entries = Object.entries(req.body || {}).filter(([key]) => EDITABLE_SETTINGS.has(key));
    if (entries.length === 0) {
      return this.badRequest(res, 'No editable settings provided');
    }

    for (const [key, value] of entries) {
      if (key === 'tier_pricing' && (typeof value !== 'object' || value === null ||
          Object.values(value).some((price) => typeof price !== 'number' || price < 0))) {
        return this.badRequest(res, 'tier_pricing must be an object of non-negative numbers');
      }
      if (key === 'support_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return this.badRequest(res, 'support_email must be a valid email');
      }
      if (key === 'trial_days' && (!Number.isInteger(value) || value < 0 || value > 365)) {
        return this.badRequest(res, 'trial_days must be an integer between 0 and 365');
      }
    }

    try {
      await PlatformRepository.upsertSettings(entries);
      await auditPlatformAction(req, {
        action: 'platform_settings.updated',
        resourceType: 'platform_settings',
        details: { keys: entries.map(([key]) => key) },
      });
      const settings = await PlatformRepository.getSettings();
      this.success(res, settings, 'Settings updated');
    } catch (error) {
      this.logger.error('updateSettings', error);
      this.error(res, 'Failed to update platform settings');
    }
  }

  /**
   * Platform user management — owner-only (routes gate with
   * requirePlatformRole). Covers onboarding support/admin staff.
   */
  async listPlatformUsers(req, res) {
    try {
      const users = await PlatformRepository.getPlatformUsers();
      this.success(res, users);
    } catch (error) {
      this.logger.error('listPlatformUsers', error);
      this.error(res, 'Failed to fetch platform users');
    }
  }

  async createPlatformUser(req, res) {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const role = req.body.role;

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return this.badRequest(res, 'Name and a valid email are required');
    }
    if (!PLATFORM_USER_ROLES.includes(role)) {
      return this.badRequest(res, `Role must be one of: ${PLATFORM_USER_ROLES.join(', ')}`);
    }

    const password = typeof req.body.password === 'string' && req.body.password.length >= 8
      ? req.body.password
      : crypto.randomBytes(9).toString('base64url');
    const generatedPassword = !(typeof req.body.password === 'string' && req.body.password.length >= 8);

    try {
      if (await PlatformRepository.getPlatformUserByEmail(email)) {
        return this.error(res, new Error('A platform user with that email already exists'), 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await PlatformRepository.createPlatformUser({
        email, name, role, passwordHash,
        permissions: ROLE_PERMISSIONS[role] || []
      });

      await auditPlatformAction(req, {
        action: 'platform_user.created',
        resourceType: 'platform_user',
        resourceId: String(user.id),
        details: { email, role },
      });

      this.created(res, {
        ...user,
        temporaryPassword: generatedPassword ? password : null
      }, 'Platform user created');
    } catch (error) {
      this.logger.error('createPlatformUser', error);
      this.error(res, 'Failed to create platform user');
    }
  }

  async updatePlatformUser(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return this.badRequest(res, 'Invalid user id');
    }

    const { name, role, is_active, mfa_required } = req.body || {};
    if (role !== undefined && !['platform_owner', ...PLATFORM_USER_ROLES].includes(role)) {
      return this.badRequest(res, 'Invalid role');
    }

    try {
      const target = await PlatformRepository.getPlatformUserById(id);
      if (!target) {
        return this.notFound(res, 'Platform user not found');
      }

      // Self-lockout guard: you cannot demote or deactivate your own account.
      if (id === req.platformUser.id && ((role !== undefined && role !== target.role) || is_active === false)) {
        return this.badRequest(res, 'You cannot change your own role or deactivate your own account');
      }

      // Last-owner guard: the platform must always have an active owner.
      const demotesOrDisablesOwner = target.role === 'platform_owner' &&
        ((role !== undefined && role !== 'platform_owner') || is_active === false);
      if (demotesOrDisablesOwner && (await PlatformRepository.countActiveOwners(id)) === 0) {
        return this.badRequest(res, 'Cannot remove the last active platform owner');
      }

      const updated = await PlatformRepository.updatePlatformUser(id, { name, role, is_active, mfa_required });
      await auditPlatformAction(req, {
        action: 'platform_user.updated',
        resourceType: 'platform_user',
        resourceId: String(id),
        details: { changed: Object.keys({ name, role, is_active, mfa_required }).filter(k => ({ name, role, is_active, mfa_required })[k] !== undefined) },
      });

      this.success(res, updated, 'Platform user updated');
    } catch (error) {
      this.logger.error('updatePlatformUser', error);
      this.error(res, 'Failed to update platform user');
    }
  }

  async resetPlatformUserPassword(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return this.badRequest(res, 'Invalid user id');
    }

    try {
      const target = await PlatformRepository.getPlatformUserById(id);
      if (!target) {
        return this.notFound(res, 'Platform user not found');
      }

      const password = typeof req.body.password === 'string' && req.body.password.length >= 8
        ? req.body.password
        : crypto.randomBytes(9).toString('base64url');
      const generated = !(typeof req.body.password === 'string' && req.body.password.length >= 8);

      const passwordHash = await bcrypt.hash(password, 10);
      await PlatformRepository.setPlatformUserPassword(id, passwordHash);
      await auditPlatformAction(req, {
        action: 'platform_user.password_reset',
        resourceType: 'platform_user',
        resourceId: String(id),
        details: { email: target.email },
      });

      this.success(res, { temporaryPassword: generated ? password : null }, 'Password reset');
    } catch (error) {
      this.logger.error('resetPlatformUserPassword', error);
      this.error(res, 'Failed to reset password');
    }
  }

  /**
   * Get all tenants (churches)
   */
  async getAllTenants(req, res) {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const status = ['active', 'suspended'].includes(req.query.status) ? req.query.status : null;
    const tier = ['basic', 'professional', 'enterprise'].includes(req.query.tier) ? req.query.tier : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : null;
    const sortBy = ['created_at', 'name', 'updated_at'].includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    try {
      const { tenants, total } = await churchPlatformGateway.getTenantSummaries({ search, status, tier, sortBy, sortOrder, page, limit });
      this.success(res, {
        tenants,
        pagination: this.buildPaginationMeta(total, page, limit)
      });
    } catch (error) {
      this.logger.error('getAllTenants', error);
      this.error(res, new Error('Failed to fetch tenants'));
    }
  }

  async createTenant(req, res) {
    try {
      const tenant = await churchPlatformGateway.createTenant(req.body);
      await auditPlatformAction(req, {
        action: 'tenant.created',
        tenantId: tenant.id,
        details: { subscriptionTier: tenant.subscription_tier, billingCycle: tenant.billing_cycle },
      });
      this.created(res, tenant, 'Church created successfully');
    } catch (error) {
      this.logger.error('createTenant', error);
      const statusCode = (error.message === 'Church slug already exists' || error.code === 'ADMIN_EMAIL_TAKEN') ? 409 : 400;
      this.error(res, error, statusCode);
    }
  }

  async updateTenant(req, res) {
    const { id } = req.params;
    try {
      const tenant = await churchPlatformGateway.updateTenant(id, req.body);
      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }
      await auditPlatformAction(req, {
        action: 'tenant.updated',
        tenantId: id,
        details: { subscriptionTier: tenant.subscription_tier, billingCycle: tenant.billing_cycle },
      });
      this.success(res, tenant, 'Church updated successfully');
    } catch (error) {
      this.logger.error('updateTenant', error);
      const statusCode = error.message === 'Church slug already exists' ? 409 : 400;
      this.error(res, error, statusCode);
    }
  }

  async archiveTenant(req, res) {
    const { id } = req.params;
    try {
      const tenant = await churchPlatformGateway.archiveTenant(id);
      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }
      await auditPlatformAction(req, {
        action: 'tenant.archived',
        tenantId: id,
        details: { reason: req.body?.reason || null },
      });
      this.success(res, null, 'Church archived successfully');
    } catch (error) {
      this.logger.error('archiveTenant', error);
      this.error(res, new Error('Failed to archive church'));
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(req, res) {
    const { id } = req.params;

    try {
      const tenant = await churchPlatformGateway.getTenant(id);

      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }

      const metrics = await churchPlatformGateway.getTenantMetrics(id);
      this.success(res, { ...tenant, metrics });
    } catch (error) {
      this.logger.error('getTenantById', error);
      this.error(res, 'Failed to fetch tenant');
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(req, res) {
    const { id } = req.params;

    try {
      const tenant = await churchPlatformGateway.getTenant(id);
      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }

      const metrics = await churchPlatformGateway.getTenantMetrics(id);
      this.success(res, metrics);
    } catch (error) {
      this.logger.error('getTenantStats', error);
      this.error(res, 'Failed to fetch tenant statistics');
    }
  }

  /**
   * Get tenant activity
   */
  async getTenantActivity(req, res) {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
      const activity = await churchPlatformGateway.getTenantActivity(id, limit);
      this.success(res, activity);
    } catch (error) {
      this.logger.error('getTenantActivity', error);
      this.error(res, 'Failed to fetch tenant activity');
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(req, res) {
    const { id } = req.params;

    try {
      const tenant = await churchPlatformGateway.getTenant(id);
      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }

      await churchPlatformGateway.setTenantStatus(id, false);
      await auditPlatformAction(req, {
        action: 'tenant.suspended',
        tenantId: id,
        details: { reason: req.body?.reason || null },
      });

      this.logger.info(`Church suspended: ${id}`);
      this.success(res, null, 'Church suspended successfully');
    } catch (error) {
      this.logger.error('suspendTenant', error);
      this.error(res, 'Failed to suspend church');
    }
  }

  /**
   * Activate tenant
   */
  async activateTenant(req, res) {
    const { id } = req.params;

    try {
      const tenant = await churchPlatformGateway.getTenant(id);
      if (!tenant) {
        return this.notFound(res, 'Church not found');
      }

      await churchPlatformGateway.setTenantStatus(id, true);
      await auditPlatformAction(req, {
        action: 'tenant.activated',
        tenantId: id,
        details: { reason: req.body?.reason || null },
      });

      this.logger.info(`Church activated: ${id}`);
      this.success(res, null, 'Church activated successfully');
    } catch (error) {
      this.logger.error('activateTenant', error);
      this.error(res, 'Failed to activate church');
    }
  }

  /**
   * Get platform activity
   */
  async getPlatformActivity(req, res) {
    const limit = parseInt(req.query.limit) || 10;

    try {
      // Get recent platform activities
      const activityResult = await pool.query(`
        SELECT 
          pa.action as type,
          CONCAT('Platform action: ', pa.action) as title,
          COALESCE(pa.details->>'description', 'System activity') as description,
          pa.created_at as time
        FROM platform_audit_logs pa
        ORDER BY pa.created_at DESC
        LIMIT $1
      `, [limit]);

      const formattedActivities = activityResult.rows.map(row => ({
        ...row,
        time: new Date(row.time).toLocaleString()
      }));

      this.success(res, { data: formattedActivities });
    } catch (error) {
      this.logger.error('getPlatformActivity', error);
      this.error(res, 'Failed to fetch platform activity');
    }
  }
}

module.exports = new PlatformController();