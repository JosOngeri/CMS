const BaseRepository = require('./BaseRepository');

class MonitoringRepository extends BaseRepository {
  constructor() {
    super('system_logs');
  }

  async getLogs(limit = 100) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getApiMetrics() {
    const metricsResult = await this.pool.query(`
      SELECT
        AVG(response_time) as avg_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as error_rate,
        COUNT(*) as total_requests
      FROM api_logs
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    `);
    return metricsResult.rows[0] || {};
  }

  async getActiveUserCount() {
    const result = await this.pool.query(`
      SELECT COUNT(*) as active_users
      FROM users
      WHERE last_login >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    `);
    return parseInt(result.rows[0]?.active_users) || 0;
  }
}

module.exports = new MonitoringRepository();
