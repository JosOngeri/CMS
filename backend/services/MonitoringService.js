const os = require('os');
const process = require('process');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('MonitoringService');

class MonitoringService {
  static async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cpu: {
        loadAvg: os.loadavg(),
        count: os.cpus().length,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usedPercent: ((usedMem / totalMem) * 100).toFixed(2),
      },
      platform: os.platform(),
    };

    const alerts = [];
    if (metrics.memory.usedPercent > 90) {
      alerts.push({ level: 'warning', message: 'High memory usage' });
    }

    return { metrics, alerts };
  }
}

module.exports = MonitoringService;
