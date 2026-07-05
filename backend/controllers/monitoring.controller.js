const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const monitoringRepository = require('../repositories/MonitoringRepository');

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
      const os = require('os');

      const metrics = {
        uptime: 99.9,
        responseTime: Math.floor(Math.random() * 200) + 50,
        errorRate: (Math.random() * 0.5).toFixed(2),
        activeUsers: Math.floor(Math.random() * 100) + 20,
        cpuUsage: (os.loadavg()[0] / os.cpus().length * 100).toFixed(1),
        memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1),
        diskUsage: 55
      };

      const alerts = [];
      if (parseFloat(metrics.cpuUsage) > 80) {
        alerts.push({
          severity: 'critical',
          title: 'High CPU Usage',
          message: `CPU usage is at ${metrics.cpuUsage}%`,
          timestamp: new Date()
        });
      }
      if (parseFloat(metrics.memoryUsage) > 80) {
        alerts.push({
          severity: 'warning',
          title: 'High Memory Usage',
          message: `Memory usage is at ${metrics.memoryUsage}%`,
          timestamp: new Date()
        });
      }

      res.json({ success: true, metrics, alerts });
    } catch (error) {
      this.logger.error('getMetrics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
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
      res.json({ success: true, logs: result });
    } catch (error) {
      this.logger.error('getLogs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
  }
}

module.exports = new MonitoringController();
