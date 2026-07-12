const BaseRepository = require('./BaseRepository');

class PerformanceRepository extends BaseRepository {
  constructor() {
    super('api_logs');
  }

  async getCacheStats() {
    const result = await this.pool.query(
      `SELECT
       COUNT(*) as total_requests,
       COUNT(CASE WHEN cached = true THEN 1 END) as cache_hits,
       ROUND(COUNT(CASE WHEN cached = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as hit_rate
       FROM api_logs
       WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'`
    );
    return result.rows[0];
  }

  async getMetrics() {
    const os = require('os');
    
    // Get real performance metrics from api_logs
    const dbMetrics = await this.pool.query(
      `SELECT
       AVG(response_time) as avg_response_time,
       MIN(response_time) as min_response_time,
       MAX(response_time) as max_response_time,
       COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
       COUNT(*) as total_requests
       FROM api_logs
       WHERE created_at >= CURRENT_DATE - INTERVAL '1 hour'`
    );

    const dbRow = dbMetrics.rows[0] || {};
    
    // Calculate error rate
    const errorRate = dbRow.total_requests > 0
      ? (dbRow.error_count / dbRow.total_requests * 100).toFixed(2)
      : '0.00';

    // Get system metrics
    const memoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);
    const cpuUsage = (os.loadavg()[0] / os.cpus().length * 100).toFixed(1);

    return {
      apiResponseTime: Math.round(dbRow.avg_response_time || 0),
      minResponseTime: Math.round(dbRow.min_response_time || 0),
      maxResponseTime: Math.round(dbRow.max_response_time || 0),
      totalRequests: parseInt(dbRow.total_requests || 0),
      errorCount: parseInt(dbRow.error_count || 0),
      errorRate: parseFloat(errorRate),
      memoryUsage: parseFloat(memoryUsage),
      cpuUsage: parseFloat(cpuUsage)
    };
  }
}

module.exports = new PerformanceRepository();
