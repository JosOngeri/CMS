const BaseController = require('./BaseController');
const churchPlatformGateway = require('../services/churchPlatformGateway.service');
const { logPlatformAudit } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');
const { pool } = require('../config/database');

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
   * Get platform-wide statistics
   */
  async getPlatformStats(req, res) {
    try {
      const statsResult = await pool.query(
        'SELECT * FROM platform_stats ORDER BY stat_date DESC LIMIT 1'
      );
      const stats = statsResult.rows[0] || {};
      const totalChurches = Number(stats.total_churches || 0);
      const totalMRR = Number(stats.total_mrr || 0);

      this.success(res, {
        totalChurches,
        activeChurches: Number(stats.active_churches || 0),
        totalMRR,
        newChurchesThisMonth: Number(stats.new_churches || 0),
        churnRate: totalChurches > 0 ? (Number(stats.churned_churches || 0) / totalChurches) * 100 : 0,
        arpc: Number(stats.arpc || (totalChurches > 0 ? totalMRR / totalChurches : 0)),
        platformHealthScore: Number(stats.platform_health_score || 0),
        statDate: stats.stat_date || null
      });
    } catch (error) {
      this.logger.error('getPlatformStats', error);
      this.error(res, 'Failed to fetch platform statistics');
    }
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(req, res) {
    try {
      // Get latest health checks
      const healthResult = await pool.query(`
        SELECT service_name, status, response_time, error_rate, last_check
        FROM platform_health
        WHERE last_check >= NOW() - INTERVAL '1 hour'
        ORDER BY last_check DESC
      `);

      const healthData = healthResult.rows.reduce((acc, row) => {
        acc[row.service_name] = {
          status: row.status,
          responseTime: row.response_time,
          errorRate: row.error_rate,
          lastCheck: row.last_check
        };
        return acc;
      }, {});

      // Determine overall health
      const statuses = Object.values(healthData).map(h => h.status);
      let overall = 'healthy';
      if (statuses.includes('down')) {
        overall = 'down';
      } else if (statuses.includes('degraded')) {
        overall = 'degraded';
      }

      this.success(res, {
        data: {
          api: healthData.api?.status || 'healthy',
          database: healthData.database?.status || 'healthy',
          overall
        }
      });
    } catch (error) {
      this.logger.error('getPlatformHealth', error);
      this.error(res, 'Failed to fetch platform health');
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
      await logPlatformAudit({
        actorId: req.platformUser.id,
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: tenant.id,
        details: { subscriptionTier: tenant.subscription_tier, billingCycle: tenant.billing_cycle },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      this.created(res, tenant, 'Church created successfully');
    } catch (error) {
      this.logger.error('createTenant', error);
      const statusCode = error.message === 'Church slug already exists' ? 409 : 400;
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
      await logPlatformAudit({
        actorId: req.platformUser.id,
        action: 'tenant.updated',
        resourceType: 'tenant',
        resourceId: id,
        details: { subscriptionTier: tenant.subscription_tier, billingCycle: tenant.billing_cycle },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
      await logPlatformAudit({
        actorId: req.platformUser.id,
        action: 'tenant.archived',
        resourceType: 'tenant',
        resourceId: id,
        details: { reason: req.body?.reason || null },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
      await logPlatformAudit({
        actorId: req.platformUser.id,
        action: 'tenant.suspended',
        resourceType: 'tenant',
        resourceId: id,
        details: { reason: req.body?.reason || null },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
      await logPlatformAudit({
        actorId: req.platformUser.id,
        action: 'tenant.activated',
        resourceType: 'tenant',
        resourceId: id,
        details: { reason: req.body?.reason || null },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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