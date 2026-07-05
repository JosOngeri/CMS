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
}

module.exports = new MonitoringRepository();
