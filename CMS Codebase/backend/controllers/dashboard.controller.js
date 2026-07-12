const BaseController = require('./BaseController');
const DashboardRepository = require('../repositories/DashboardRepository');
const ContentService = require('../services/ContentService');
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

      this.success(res, {
        totalMembers: parseInt(stats.total_members) || 0,
        totalPayments: parseFloat(stats.total_revenue) || 0,
        upcomingEvents: parseInt(stats.upcoming_events_count) || 0,
        recentAnnouncements: parseInt(stats.recent_announcements_count) || 0
      });
    } catch (error) {
      this.logger.error('getStats', error);
      this.error(res, 'Failed to fetch dashboard stats');
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

      const activities = await DashboardRepository.getActivityFeed(limit, churchId);

      const activitiesWithTime = activities.map(activity => ({
        ...activity,
        time: ContentService.formatRelativeTime(activity.timestamp)
      }));

      this.success(res, activitiesWithTime);
    } catch (error) {
      this.logger.error('getActivity', error);
      this.error(res, 'Failed to fetch activity feed');
    }
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

      const departmentAssignments = await DashboardRepository.getUserDepartmentAssignments(userId, churchId);
      const pendingApprovals = await DashboardRepository.getUserPendingApprovals(userId, churchId);
      const upcomingEvents = await DashboardRepository.getUserUpcomingEvents(userId, churchId);
      const personalContributions = await DashboardRepository.getUserContributions(userId, churchId);

      this.success(res, {
        departmentAssignments: departmentAssignments || 0,
        pendingApprovals: pendingApprovals || 0,
        upcomingEvents: upcomingEvents || 0,
        personalContributions: personalContributions || 0
      });
    } catch (error) {
      this.logger.error('getPersonalStats', error);
      this.error(res, 'Failed to fetch personal stats');
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

      const attendanceRate = await DashboardRepository.getUserAttendanceRate(userId, churchId);
      const contributionRate = await DashboardRepository.getUserContributionRate(userId, churchId);
      const activityLevel = await DashboardRepository.getUserActivityLevel(userId, churchId);

      this.success(res, {
        attendanceRate: attendanceRate || 0,
        contributionRate: contributionRate || 0,
        activityLevel: activityLevel || 0
      });
    } catch (error) {
      this.logger.error('getPersonalStatus', error);
      this.error(res, 'Failed to fetch personal status');
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

      this.success(res, activities || []);
    } catch (error) {
      this.logger.error('getPersonalActivity', error);
      this.error(res, 'Failed to fetch personal activity');
    }
  }

  /**
   * Get system health metrics for Super Admin (Phase 7)
   */
  async getSystemHealth(req, res) {
    try {
      const churchId = req.user.church_id;
      const health = await DashboardRepository.getSystemHealth(churchId);
      this.success(res, health);
    } catch (error) {
      this.logger.error('getSystemHealth', error);
      this.error(res, 'Failed to fetch system health');
    }
  }

  /**
   * Get department-specific stats for Department Head (Phase 4)
   */
  async getDepartmentStats(req, res) {
    try {
      const churchId = req.user.church_id;
      const departmentId = req.user.department_id;
      const stats = await DashboardRepository.getDepartmentStats(departmentId, churchId);
      this.success(res, stats);
    } catch (error) {
      this.logger.error('getDepartmentStats', error);
      this.error(res, 'Failed to fetch department stats');
    }
  }

  /**
   * Get ministry health metrics for Pastor (Phase 4)
   */
  async getMinistryHealth(req, res) {
    try {
      const churchId = req.user.church_id;
      const health = await DashboardRepository.getMinistryHealth(churchId);
      this.success(res, health);
    } catch (error) {
      this.logger.error('getMinistryHealth', error);
      this.error(res, 'Failed to fetch ministry health');
    }
  }

  /**
   * Get financial stats for Treasurer (Phase 4)
   */
  async getFinancialStats(req, res) {
    try {
      const churchId = req.user.church_id;
      const stats = await DashboardRepository.getFinancialStats(churchId);
      this.success(res, stats);
    } catch (error) {
      this.logger.error('getFinancialStats', error);
      this.error(res, 'Failed to fetch financial stats');
    }
  }

  /**
   * Get financial health metrics for Treasurer (Phase 4)
   */
  async getFinancialHealth(req, res) {
    try {
      const churchId = req.user.church_id;
      const health = await DashboardRepository.getFinancialHealth(churchId);
      this.success(res, health);
    } catch (error) {
      this.logger.error('getFinancialHealth', error);
      this.error(res, 'Failed to fetch financial health');
    }
  }

  /**
   * Get recent transactions for Treasurer (Phase 4)
   */
  async getTransactions(req, res) {
    try {
      const { limit = 20 } = req.query;
      const churchId = req.user.church_id;
      const transactions = await DashboardRepository.getTransactions(limit, churchId);
      this.success(res, transactions);
    } catch (error) {
      this.logger.error('getTransactions', error);
      this.error(res, 'Failed to fetch transactions');
    }
  }

  /**
   * Get department health metrics for Department Head (Phase 21.1)
   * Returns: task completion rate, member participation count, budget utilization
   */
  async getDepartmentHealth(req, res) {
    try {
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const departments = await DashboardRepository.getUserDepartments(userId, churchId);

      if (!departments || departments.length === 0) {
        return this.success(res, {
          taskCompletionRate: 0,
          memberParticipationCount: 0,
          budgetUtilization: 0
        });
      }

      // Get health metrics for each department
      const healthMetrics = await Promise.all(
        departments.map(dept =>
          DashboardRepository.getDepartmentHealthMetrics(dept.department_id, churchId)
        )
      );

      // Aggregate metrics across all departments
      const totalTasks = healthMetrics.reduce((sum, m) => sum + (m.totalTasks || 0), 0);
      const completedTasks = healthMetrics.reduce((sum, m) => sum + (m.completedTasks || 0), 0);
      const totalMembers = healthMetrics.reduce((sum, m) => sum + (m.activeMembers || 0), 0);
      const totalBudget = healthMetrics.reduce((sum, m) => sum + (m.totalBudget || 0), 0);
      const spentBudget = healthMetrics.reduce((sum, m) => sum + (m.spentBudget || 0), 0);

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const budgetUtilization = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;

      this.success(res, {
        taskCompletionRate,
        memberParticipationCount: totalMembers,
        budgetUtilization
      });
    } catch (error) {
      this.logger.error('getDepartmentHealth', error);
      this.error(res, 'Failed to fetch department health');
    }
  }

  /**
   * Get department activity feed for Department Head (Phase 21.1)
   * Returns recent activity items filtered by church_id and user's departments
   */
  async getDepartmentActivity(req, res) {
    try {
      const { limit = 20 } = req.query;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const departments = await DashboardRepository.getUserDepartments(userId, churchId);

      if (!departments || departments.length === 0) {
        return this.success(res, []);
      }

      const departmentIds = departments.map(d => d.department_id);
      const activities = await DashboardRepository.getDepartmentActivityFeed(departmentIds, churchId, limit);

      const activitiesWithTime = activities.map(activity => ({
        ...activity,
        time: ContentService.formatRelativeTime(activity.timestamp)
      }));

      this.success(res, activitiesWithTime);
    } catch (error) {
      this.logger.error('getDepartmentActivity', error);
      this.error(res, 'Failed to fetch department activity');
    }
  }
}

module.exports = new DashboardController();
