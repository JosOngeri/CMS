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
      const metrics = await performanceRepository.getMetrics();
      this.success(res, { metrics });
    } catch (error) {
      this.logger.error('getMetrics', error);
      this.error(res, 'Failed to fetch metrics');
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
      this.success(res, { cacheStats: result });
    } catch (error) {
      this.logger.error('getCacheStats', error);
      this.error(res, 'Failed to fetch cache stats');
    }
  }
}

module.exports = new PerformanceController();
