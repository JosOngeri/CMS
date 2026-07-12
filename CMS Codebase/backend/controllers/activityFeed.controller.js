const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const activityFeedRepository = require('../repositories/ActivityFeedRepository');
const { hasAnyRole } = require('../helpers/permissionChecker');
const ActivityFeedService = require('../services/ActivityFeedService');

/**
 * Activity Feed Controller
 * Aggregates department activities from multiple sources
 */
class ActivityFeedController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ActivityFeedController');
  }

  /**
   * Get activity feed for a department
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} [req.params.departmentId] - Department ID
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {string} [req.query.type] - Filter by activity type
   * @param {string} [req.query.startDate] - Filter by start date
   * @param {string} [req.query.endDate] - Filter by end date
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getActivityFeed(req, res) {
    try {
      const departmentId = req.departmentId || req.params.departmentId;
      const userId = req.user.id;
      const userRoles = req.user.roles || [];
      const { limit = 20, offset = 0, type, startDate, endDate } = req.query;

      this.logger.info('getActivityFeed', { departmentId, departmentIdType: typeof departmentId, userId, userRoles });

      // Use centralized permission checker for admin roles
      const adminRoles = ['Super Admin', 'Pastor', 'First Elder'];
      const isAdmin = hasAnyRole(userRoles, adminRoles);

      // If not admin, verify user has access to this department
      if (!isAdmin) {
        const hasAccess = await activityFeedRepository.checkDepartmentAccess(departmentId, userId);
        if (!hasAccess) {
          return this.forbidden(res, 'Access denied to this department');
        }
      }

      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);

      // Get activities from repository
      const activities = await activityFeedRepository.getActivityFeed(departmentId, limitNum, offsetNum);

      // Filter by activity type if specified
      const filteredActivities = await activityFeedRepository.getActivitiesByType(activities, type);

      // Broadcast new activities via service (moved from controller)
      await ActivityFeedService.broadcastActivities(filteredActivities);

      // Get total count for pagination
      const totalCount = await activityFeedRepository.getActivityCount(departmentId);

      this.success(res, {
        data: filteredActivities,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount
        }
      }, 'Activity feed retrieved successfully');
    } catch (error) {
      this.logger.error('getActivityFeed', error);
      this.error(res, 'Failed to fetch activity feed');
    }
  }

  /**
   * Get activity summary statistics
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} [req.params.departmentId] - Department ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getActivitySummary(req, res) {
    try {
      const departmentId = req.departmentId || req.params.departmentId;
      const userId = req.user.id;
      const userRoles = req.user.roles || [];

      // Use centralized permission checker for admin roles
      const adminRoles = ['Super Admin', 'Pastor', 'First Elder'];
      const isAdmin = hasAnyRole(userRoles, adminRoles);

      // If not admin, verify user has access
      if (!isAdmin) {
        const hasAccess = await activityFeedRepository.checkDepartmentAccess(departmentId, userId);
        if (!hasAccess) {
          return this.forbidden(res, 'Access denied to this department');
        }
      }

      // Get activity counts by type
      const summary = await activityFeedRepository.getActivitySummary(departmentId);

      this.success(res, summary, 'Activity summary retrieved successfully');
    } catch (error) {
      this.logger.error('getActivitySummary', error);
      this.error(res, 'Failed to fetch activity summary');
    }
  }
}

module.exports = new ActivityFeedController();
