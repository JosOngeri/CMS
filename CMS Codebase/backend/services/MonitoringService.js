const os = require('os');
const logger = require('../config/logging');

/**
 * Monitoring Service
 * Handles system metrics collection and alert generation
 */
class MonitoringService {
  /**
   * Get system metrics with real data from os module
   * @returns {Promise<Object>} Metrics and alerts
   */
  async getSystemMetrics() {
    try {
      const cpus = os.cpus();
      const totalmem = os.totalmem();
      const freemem = os.freemem();
      const loadavg = os.loadavg();

      const metrics = {
        uptime: process.uptime(),
        responseTime: 0, // Would need actual request tracking
        errorRate: 0, // Would need actual error tracking
        activeUsers: 0, // Would need actual user session tracking
        cpuUsage: (loadavg[0] / cpus.length * 100).toFixed(1),
        memoryUsage: ((totalmem - freemem) / totalmem * 100).toFixed(1),
        diskUsage: 0 // Would need actual disk usage check
      };

      // Generate alerts based on thresholds
      const alerts = await this.generateAlerts(metrics);

      return { metrics, alerts };
    } catch (error) {
      logger.error('MonitoringService', 'Failed to get system metrics:', error);
      throw error;
    }
  }

  /**
   * Generate alerts based on metric thresholds
   * @param {Object} metrics - System metrics
   * @returns {Promise<Array>} Array of alerts
   */
  async generateAlerts(metrics) {
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

    return alerts;
  }
}

module.exports = new MonitoringService();
