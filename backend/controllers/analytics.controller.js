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

      res.json({
        success: true,
        data: {
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
        }
      });
    } catch (error) {
      this.logger.error('getDashboardStats', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
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
      const days = months * 30;

      const growth = await AnalyticsRepository.getMemberGrowthTrend(days, churchId);

      res.json({ success: true, data: growth });
    } catch (error) {
      this.logger.error('getMemberGrowth', error);
      res.status(500).json({ success: false, error: 'Failed to fetch member growth data' });
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
      const days = months * 30;

      const trends = await AnalyticsRepository.getTransactionTrend(days, churchId);

      res.json({ success: true, data: trends });
    } catch (error) {
      this.logger.error('getFinancialTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch financial trends' });
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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getDepartmentActivity', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department activity' });
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
      const weeks = months * 4;

      const result = await AnalyticsRepository.getAttendanceAnalytics(weeks, churchId);

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAttendanceTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch attendance trends' });
    }
  }

  async getMemberDemographics(req, res) {
    try {
      const churchId = req.user.church_id;
      const demographics = await AnalyticsRepository.getMemberDemographics(churchId);
      res.json({ success: true, data: demographics });
    } catch (error) {
      this.logger.error('getMemberDemographics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch member demographics' });
    }
  }

  async getMemberActivity(req, res) {
    try {
      const { days = 30 } = req.query;
      const churchId = req.user.church_id;
      const activity = await AnalyticsRepository.getMemberActivity(days, churchId);
      res.json({ success: true, data: activity });
    } catch (error) {
      this.logger.error('getMemberActivity', error);
      res.status(500).json({ success: false, error: 'Failed to fetch member activity' });
    }
  }

  async getFinancialSummary(req, res) {
    try {
      const churchId = req.user.church_id;
      const summary = await AnalyticsRepository.getFinancialSummary(churchId);
      res.json({ success: true, data: summary });
    } catch (error) {
      this.logger.error('getFinancialSummary', error);
      res.status(500).json({ success: false, error: 'Failed to fetch financial summary' });
    }
  }

  async getContributionTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await AnalyticsRepository.getContributionTrends(months, churchId);
      res.json({ success: true, data: trends });
    } catch (error) {
      this.logger.error('getContributionTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch contribution trends' });
    }
  }

  async getDepartmentPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getDepartmentPerformance(months, churchId);
      res.json({ success: true, data: performance });
    } catch (error) {
      this.logger.error('getDepartmentPerformance', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department performance' });
    }
  }

  async getAttendanceSummary(req, res) {
    try {
      const churchId = req.user.church_id;
      const summary = await AnalyticsRepository.getAttendanceSummary(churchId);
      res.json({ success: true, data: summary });
    } catch (error) {
      this.logger.error('getAttendanceSummary', error);
      res.status(500).json({ success: false, error: 'Failed to fetch attendance summary' });
    }
  }

  async getCollectionPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getCollectionPerformance(months, churchId);
      res.json({ success: true, data: performance });
    } catch (error) {
      this.logger.error('getCollectionPerformance', error);
      res.status(500).json({ success: false, error: 'Failed to fetch collection performance' });
    }
  }

  async getCollectionTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await AnalyticsRepository.getCollectionTrends(months, churchId);
      res.json({ success: true, data: trends });
    } catch (error) {
      this.logger.error('getCollectionTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch collection trends' });
    }
  }

  async getEventEngagement(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const engagement = await AnalyticsRepository.getEventEngagement(months, churchId);
      res.json({ success: true, data: engagement });
    } catch (error) {
      this.logger.error('getEventEngagement', error);
      res.status(500).json({ success: false, error: 'Failed to fetch event engagement' });
    }
  }

  async getEventAttendance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const attendance = await AnalyticsRepository.getEventAttendance(months, churchId);
      res.json({ success: true, data: attendance });
    } catch (error) {
      this.logger.error('getEventAttendance', error);
      res.status(500).json({ success: false, error: 'Failed to fetch event attendance' });
    }
  }

  async getSMSPerformance(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const performance = await AnalyticsRepository.getSMSPerformance(months, churchId);
      res.json({ success: true, data: performance });
    } catch (error) {
      this.logger.error('getSMSPerformance', error);
      res.status(500).json({ success: false, error: 'Failed to fetch SMS performance' });
    }
  }

  async getSMSDelivery(req, res) {
    try {
      const { months = 6 } = req.query;
      const churchId = req.user.church_id;
      const delivery = await AnalyticsRepository.getSMSDelivery(months, churchId);
      res.json({ success: true, data: delivery });
    } catch (error) {
      this.logger.error('getSMSDelivery', error);
      res.status(500).json({ success: false, error: 'Failed to fetch SMS delivery' });
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
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getCustomAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch custom analytics' });
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
        res.json({ success: true, data });
      }
    } catch (error) {
      this.logger.error('exportAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to export analytics' });
    }
  }
}

module.exports = new AnalyticsController();