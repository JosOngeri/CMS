const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const monitoringRepository = require('../repositories/MonitoringRepository');
const MonitoringService = require('../services/MonitoringService');

/**
 * Monitoring Controller
 * Handles system metrics and logs monitoring
 */
class MonitoringController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('MonitoringController');
  }

  /**
   * Get system monitoring metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMetrics(req, res) {
    try {
      // Use service to get real metrics and alerts
      const { metrics, alerts } = await MonitoringService.getSystemMetrics();

      this.success(res, { metrics, alerts }, 'System metrics retrieved successfully');
    } catch (error) {
      this.logger.error('getMetrics', error);
      this.error(res, 'Failed to fetch metrics');
    }
  }

  /**
   * Get system logs
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=100] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getLogs(req, res) {
    try {
      const { limit = 100 } = req.query;
      const result = await monitoringRepository.getLogs(limit);
      this.success(res, result, 'Logs retrieved successfully');
    } catch (error) {
      this.logger.error('getLogs', error);
      this.error(res, 'Failed to fetch logs');
    }
  }
}

module.exports = new MonitoringController();
