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
}

module.exports = new PerformanceRepository();
