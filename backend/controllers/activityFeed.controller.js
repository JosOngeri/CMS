const { getActivityWebSocket } = require('../helpers/websocket');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const activityFeedRepository = require('../repositories/ActivityFeedRepository');

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

      // Check if user is an admin (Super Admin, Pastor, First Elder)
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      // If not admin, verify user has access to this department
      if (!isAdmin) {
        const hasAccess = await activityFeedRepository.checkDepartmentAccess(departmentId, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this department'
          });
        }
      }

      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);

      // Get activities from repository
      const activities = await activityFeedRepository.getActivityFeed(departmentId, limitNum, offsetNum);

      // Filter by activity type if specified
      const filteredActivities = await activityFeedRepository.getActivitiesByType(activities, type);

      // Broadcast new activities via WebSocket
      const ws = getActivityWebSocket();
      if (ws) {
        filteredActivities.forEach(activity => {
          ws.broadcastActivity({
            type: 'new_activity',
            data: activity,
            timestamp: new Date().toISOString()
          });
        });
      }

      // Get total count for pagination
      const totalCount = await activityFeedRepository.getActivityCount(departmentId);

      res.json({
        success: true,
        data: filteredActivities,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount
        }
      });
    } catch (error) {
      this.logger.error('getActivityFeed', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity feed',
        details: error.message
      });
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

      // Check if user is an admin
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      // If not admin, verify user has access
      if (!isAdmin) {
        const hasAccess = await activityFeedRepository.checkDepartmentAccess(departmentId, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this department'
          });
        }
      }

      // Get activity counts by type
      const summary = await activityFeedRepository.getActivitySummary(departmentId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      this.logger.error('getActivitySummary', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity summary',
        details: error.message
      });
    }
  }
}

module.exports = new ActivityFeedController();
