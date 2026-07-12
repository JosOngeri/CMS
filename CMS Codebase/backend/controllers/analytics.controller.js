const BaseController = require('./BaseController');
const AnalyticsRepository = require('../repositories/AnalyticsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Analytics Controller
 * Handles analytics and reporting data
 */
class AnalyticsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('AnalyticsController');
  }

  /**
   * Get dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDashboardStats(req, res) {
    try {
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const [stats, unreadCount] = await Promise.all([
        AnalyticsRepository.getDashboardStats(churchId),
        AnalyticsRepository.getUnreadNotificationsCount(userId, churchId)
      ]);

      this.success(res, {
        members: {
          total: parseInt(stats.total_members),
          active: parseInt(stats.active_members)
        },
        departments: {
          total: parseInt(stats.total_departments)
        },
        finance: {
          monthly_income: parseFloat(stats.monthly_income),
          monthly_expense: parseFloat(stats.monthly_expense)
        },
        approvals: {
          pending: parseInt(stats.pending_approvals)
        },
        notifications: {
          unread: unreadCount
        }
      }, 'Dashboard stats retrieved successfully');
    } catch (error) {
      this.logger.error('getDashboardStats', error);
      this.error(res, 'Failed to fetch dashboard stats');
    }
  }

  /**
   * Get member growth data
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=12] - Number of months to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMemberGrowth(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;

      // Move period calculation to repository
      const growth = await AnalyticsRepository.getMemberGrowthTrend(months, churchId);

      this.success(res, growth, 'Member growth data retrieved successfully');
    } catch (error) {
      this.logger.error('getMemberGrowth', error);
      this.error(res, 'Failed to fetch member growth data');
    }
  }

  /**
   * Get financial trends data
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=12] - Number of months to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFinancialTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;

      // Move period calculation to repository
      const trends = await AnalyticsRepository.getTransactionTrend(months, churchId);

      this.success(res, trends, 'Financial trends retrieved successfully');
    } catch (error) {
      this.logger.error('getFinancialTrends', error);
      this.error(res, 'Failed to fetch financial trends');
    }
  }

  /**
   * Get department activity data
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=6] - Number of months to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentActivity(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;

      const result = await AnalyticsRepository.getDepartmentAnalytics(months, churchId);

      this.success(res, result, 'Department activity retrieved successfully');
    } catch (error) {
      this.logger.error('getDepartmentActivity', error);
      this.error(res, 'Failed to fetch department activity');
    }
  }

  /**
   * Get attendance trends data
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=12] - Number of months to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAttendanceTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;

      // Move period calculation to repository
      const result = await AnalyticsRepository.getAttendanceAnalytics(months, churchId);

      this.success(res, result, 'Attendance trends retrieved successfully');
    } catch (error) {
      this.logger.error('getAttendanceTrends', error);
      this.error(res, 'Failed to fetch attendance trends');
    }
  }

  async getMemberDemographics(req, res) {
    try {
      const churchId = req.user.church_id;
      const demographics = await AnalyticsRepository.getMemberDemographics(churchId);
      this.success(res, demographics, 'Member demographics retrieved successfully');
    } catch (error) {
      this.logger.error('getMemberDemographics', error);
      this.error(res, 'Failed to fetch member demographics');
    }
  }

  async getMemberActivity(req, res) {
    try {
      const { days = 30 } = req.query;
      const churchId = req.user.church_id;
      const activity = await AnalyticsRepository.getMemberActivity(days, churchId);
      this.success(res, activity, 'Member activity retrieved successfully');
    } catch (error) {
      this.logger.error('getMemberActivity', error);
      this.error(res, 'Failed to fetch member activity');
    }
  }

  async getUserActivity(req, res) {
    try {
      const { days = 30 } = req.query;
      const churchId = req.user.church_id;
      const activity = await AnalyticsRepository.getUserActivity(days, churchId);
      this.success(res, activity, 'User activity retrieved successfully');
    } catch (error) {
      this.logger.error('getUserActivity', error);
      this.error(res, 'Failed to fetch user activity');
    }
  }

  async getContentViews(req, res) {
    try {
      const churchId = req.user.church_id;
      const views = await AnalyticsRepository.getContentViews(churchId);
      this.success(res, views, 'Content views retrieved successfully');
    } catch (error) {
      this.logger.error('getContentViews', error);
      this.error(res, 'Failed to fetch content views');
    }
  }

  async getHeatmap(req, res) {
    try {
      const { period = '7d' } = req.query;
      const churchId = req.user.church_id;
      const heatmap = await AnalyticsRepository.getHeatmapData(period, churchId);
      this.success(res, heatmap, 'Heatmap data retrieved successfully');
    } catch (error) {
      this.logger.error('getHeatmap', error);
      this.error(res, 'Failed to fetch heatmap data');
    }
  }

  async getFinancialSummary(req, res) {
    try {
      const churchId = req.user.church_id;
      const summary = await AnalyticsRepository.getFinancialSummary(churchId);
      this.success(res, summary, 'Financial summary retrieved successfully');
    } catch (error) {
      this.logger.error('getFinancialSummary', error);
      this.error(res, 'Failed to fetch financial summary');
    }
  }

  async getContributionTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await AnalyticsRepository.getContributionTrends(months, churchId);
      this.success(res, trends, 'Contribution trends retrieved successfully');
    } catch (error) {
      this.logger.error('getContributionTrends', error);
      this.error(res, 'Failed to fetch contribution trends');
    }
  }

  async getDepartmentPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getDepartmentPerformance(months, churchId);
      this.success(res, performance, 'Department performance retrieved successfully');
    } catch (error) {
      this.logger.error('getDepartmentPerformance', error);
      this.error(res, 'Failed to fetch department performance');
    }
  }

  async getAttendanceSummary(req, res) {
    try {
      const churchId = req.user.church_id;
      const summary = await AnalyticsRepository.getAttendanceSummary(churchId);
      this.success(res, summary, 'Attendance summary retrieved successfully');
    } catch (error) {
      this.logger.error('getAttendanceSummary', error);
      this.error(res, 'Failed to fetch attendance summary');
    }
  }

  async getCollectionPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getCollectionPerformance(months, churchId);
      this.success(res, performance, 'Collection performance retrieved successfully');
    } catch (error) {
      this.logger.error('getCollectionPerformance', error);
      this.error(res, 'Failed to fetch collection performance');
    }
  }

  async getCollectionTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await AnalyticsRepository.getCollectionTrends(months, churchId);
      this.success(res, trends, 'Collection trends retrieved successfully');
    } catch (error) {
      this.logger.error('getCollectionTrends', error);
      this.error(res, 'Failed to fetch collection trends');
    }
  }

  async getEventEngagement(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const engagement = await AnalyticsRepository.getEventEngagement(months, churchId);
      this.success(res, engagement, 'Event engagement retrieved successfully');
    } catch (error) {
      this.logger.error('getEventEngagement', error);
      this.error(res, 'Failed to fetch event engagement');
    }
  }

  async getEventAttendance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const attendance = await AnalyticsRepository.getEventAttendance(months, churchId);
      this.success(res, { data: attendance });
    } catch (error) {
      this.logger.error('getEventAttendance', error);
      this.error(res, 'Failed to fetch event attendance');
    }
  }

  async getSMSPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getSMSPerformance(months, churchId);
      this.success(res, { data: performance });
    } catch (error) {
      this.logger.error('getSMSPerformance', error);
      this.error(res, 'Failed to fetch SMS performance');
    }
  }

  async getSMSDelivery(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const delivery = await AnalyticsRepository.getSMSDelivery(months, churchId);
      this.success(res, { data: delivery });
    } catch (error) {
      this.logger.error('getSMSDelivery', error);
      this.error(res, 'Failed to fetch SMS delivery');
    }
  }

  async getCustomAnalytics(req, res) {
    try {
      const { metrics, startDate, endDate, groupBy } = req.query;
      const churchId = req.user.church_id;
      const analytics = await AnalyticsRepository.getCustomAnalytics(
        metrics ? metrics.split(',') : [],
        startDate,
        endDate,
        groupBy,
        churchId
      );
      this.success(res, { data: analytics });
    } catch (error) {
      this.logger.error('getCustomAnalytics', error);
      this.error(res, 'Failed to fetch custom analytics');
    }
  }

  async exportAnalytics(req, res) {
    try {
      const { type, startDate, endDate, format = 'json' } = req.body;
      const churchId = req.user.church_id;
      const data = await AnalyticsRepository.exportAnalytics(type, startDate, endDate, churchId);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics_${type}_${Date.now()}.csv`);
        res.send(data);
      } else {
        this.success(res, { data });
      }
    } catch (error) {
      this.logger.error('exportAnalytics', error);
      this.error(res, 'Failed to export analytics');
    }
  }
}

module.exports = new AnalyticsController();