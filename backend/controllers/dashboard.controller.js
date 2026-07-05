const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const DashboardRepository = require('../repositories/DashboardRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Dashboard Controller
 * Handles dashboard statistics and activity feeds
 */
class DashboardController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DashboardController');
  }

  /**
   * Get dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getStats(req, res) {
    try {
      const churchId = req.user.church_id;
      const summary = await DashboardRepository.getSummary(churchId);

      const stats = summary || {
        total_members: 0,
        total_revenue: 0,
        upcoming_events_count: 0,
        recent_announcements_count: 0
      };

      return ResponseHandler.success(res, {
        totalMembers: parseInt(stats.total_members) || 0,
        totalPayments: parseFloat(stats.total_revenue) || 0,
        upcomingEvents: parseInt(stats.upcoming_events_count) || 0,
        recentAnnouncements: parseInt(stats.recent_announcements_count) || 0
      });
    } catch (error) {
      this.logger.error('getStats', error);
      return ResponseHandler.error(res, 'Failed to fetch dashboard stats');
    }
  }

  /**
   * Get dashboard activity feed
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=20] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getActivity(req, res) {
    try {
      const { limit = 20 } = req.query;
      const churchId = req.user.church_id;

      const [approvals, payments, announcements, events, members] = await Promise.all([
        DashboardRepository.getPendingApprovals(churchId),
        DashboardRepository.getRecentPaymentsActivity(limit, churchId),
        DashboardRepository.getRecentAnnouncements(limit, churchId),
        DashboardRepository.getUpcomingEvents(limit, churchId),
        DashboardRepository.getRecentMembers(limit, churchId)
      ]);

      const activities = [];

      // Add payment activities
      payments.forEach(payment => {
        activities.push({
          type: 'payment',
          title: `Payment from ${payment.first_name} ${payment.last_name}`,
          description: `Amount: ${payment.amount}`,
          time: this.formatRelativeTime(payment.payment_date),
          timestamp: payment.payment_date
        });
      });

      // Add announcement activities
      announcements.forEach(announcement => {
        activities.push({
          type: 'announcement',
          title: announcement.title,
          description: announcement.content?.substring(0, 100) || 'New announcement',
          time: this.formatRelativeTime(announcement.created_at),
          timestamp: announcement.created_at
        });
      });

      // Add event activities
      events.forEach(event => {
        activities.push({
          type: 'event',
          title: event.title,
          description: `Event on ${event.event_date}`,
          time: this.formatRelativeTime(event.created_at),
          timestamp: event.created_at
        });
      });

      // Add member activities
      members.forEach(member => {
        activities.push({
          type: 'member',
          title: `New member: ${member.first_name} ${member.last_name}`,
          description: `Joined on ${member.joined_date}`,
          time: this.formatRelativeTime(member.joined_date),
          timestamp: member.joined_date
        });
      });

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      activities.splice(limit);

      return ResponseHandler.success(res, activities);
    } catch (error) {
      this.logger.error('getActivity', error);
      return ResponseHandler.error(res, 'Failed to fetch activity feed');
    }
  }

  /**
   * Format relative time
   * @param {Date} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  /**
   * Get personal stats for member dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPersonalStats(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      // Get user's department assignments
      const departmentAssignments = await DashboardRepository.getUserDepartmentAssignments(userId, churchId);
      
      // Get pending approvals for user
      const pendingApprovals = await DashboardRepository.getUserPendingApprovals(userId, churchId);
      
      // Get upcoming events user is registered for
      const upcomingEvents = await DashboardRepository.getUserUpcomingEvents(userId, churchId);
      
      // Get user's contribution total
      const personalContributions = await DashboardRepository.getUserContributions(userId, churchId);

      return ResponseHandler.success(res, {
        departmentAssignments: departmentAssignments || 0,
        pendingApprovals: pendingApprovals || 0,
        upcomingEvents: upcomingEvents || 0,
        personalContributions: personalContributions || 0
      });
    } catch (error) {
      this.logger.error('getPersonalStats', error);
      return ResponseHandler.error(res, 'Failed to fetch personal stats');
    }
  }

  /**
   * Get personal status metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPersonalStatus(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      // Calculate attendance rate (last 30 days)
      const attendanceRate = await DashboardRepository.getUserAttendanceRate(userId, churchId);
      
      // Calculate contribution rate (last 30 days)
      const contributionRate = await DashboardRepository.getUserContributionRate(userId, churchId);
      
      // Calculate activity level (based on recent interactions)
      const activityLevel = await DashboardRepository.getUserActivityLevel(userId, churchId);

      return ResponseHandler.success(res, {
        attendanceRate: attendanceRate || 0,
        contributionRate: contributionRate || 0,
        activityLevel: activityLevel || 0
      });
    } catch (error) {
      this.logger.error('getPersonalStatus', error);
      return ResponseHandler.error(res, 'Failed to fetch personal status');
    }
  }

  /**
   * Get personal activity feed
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=10] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPersonalActivity(req, res) {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const activities = await DashboardRepository.getUserActivities(userId, churchId, limit);

      return ResponseHandler.success(res, activities || []);
    } catch (error) {
      this.logger.error('getPersonalActivity', error);
      return ResponseHandler.error(res, 'Failed to fetch personal activity');
    }
  }

  /**
   * Get system health metrics for Super Admin (Phase 7)
   */
  async getSystemHealth(req, res) {
    try {
      return ResponseHandler.success(res, {
        database: 'healthy',
        api: 'healthy',
        lastSync: 'just now',
        activeUsers: 1
      });
    } catch (error) {
      this.logger.error('getSystemHealth', error);
      return ResponseHandler.error(res, 'Failed to fetch system health');
    }
  }

  /**
   * Get department-specific stats for Department Head (Phase 4)
   */
  async getDepartmentStats(req, res) {
    try {
      return ResponseHandler.success(res, {
        departmentMembers: 0,
        pendingTasks: 0,
        departmentEvents: 0,
        departmentBudget: 0
      });
    } catch (error) {
      this.logger.error('getDepartmentStats', error);
      return ResponseHandler.error(res, 'Failed to fetch department stats');
    }
  }

  /**
   * Get ministry health metrics for Pastor (Phase 4)
   */
  async getMinistryHealth(req, res) {
    try {
      return ResponseHandler.success(res, {
        memberEngagement: 100,
        departmentActivity: 100,
        spiritualGrowth: 100
      });
    } catch (error) {
      this.logger.error('getMinistryHealth', error);
      return ResponseHandler.error(res, 'Failed to fetch ministry health');
    }
  }

  /**
   * Get financial stats for Treasurer (Phase 4)
   */
  async getFinancialStats(req, res) {
    try {
      return ResponseHandler.success(res, {
        totalBalance: 0,
        pendingPayments: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0
      });
    } catch (error) {
      this.logger.error('getFinancialStats', error);
      return ResponseHandler.error(res, 'Failed to fetch financial stats');
    }
  }

  /**
   * Get financial health metrics for Treasurer (Phase 4)
   */
  async getFinancialHealth(req, res) {
    try {
      return ResponseHandler.success(res, {
        budgetUtilization: 0,
        collectionRate: 0,
        expenseRatio: 0
      });
    } catch (error) {
      this.logger.error('getFinancialHealth', error);
      return ResponseHandler.error(res, 'Failed to fetch financial health');
    }
  }

  /**
   * Get recent transactions for Treasurer (Phase 4)
   */
  async getTransactions(req, res) {
    try {
      return ResponseHandler.success(res, []);
    } catch (error) {
      this.logger.error('getTransactions', error);
      return ResponseHandler.error(res, 'Failed to fetch transactions');
    }
  }
}

module.exports = new DashboardController();
