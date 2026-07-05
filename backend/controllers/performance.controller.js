const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const performanceRepository = require('../repositories/PerformanceRepository');

/**
 * Performance Controller
 * Handles performance metrics and cache statistics
 */
class PerformanceController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PerformanceController');
  }

  /**
   * Get performance metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMetrics(req, res) {
    try {
      const os = require('os');
      const startTime = Date.now();

      // Simulated metrics
      const metrics = {
        apiResponseTime: Math.floor(Math.random() * 200) + 50,
        cacheHitRate: 85 + Math.floor(Math.random() * 15),
        databaseQueryTime: Math.floor(Math.random() * 100) + 20,
        memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1),
        cpuUsage: (os.loadavg()[0] / os.cpus().length * 100).toFixed(1),
        errorRate: (Math.random() * 2).toFixed(2)
      };

      res.json({ success: true, metrics });
    } catch (error) {
      this.logger.error('getMetrics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
    }
  }

  /**
   * Get cache statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCacheStats(req, res) {
    try {
      const result = await performanceRepository.getCacheStats();
      res.json({ success: true, cacheStats: result });
    } catch (error) {
      this.logger.error('getCacheStats', error);
      res.status(500).json({ success: false, error: 'Failed to fetch cache stats' });
    }
  }
}

module.exports = new PerformanceController();
