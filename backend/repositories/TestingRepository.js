const BaseRepository = require('./BaseRepository');

class TestingRepository extends BaseRepository {
  constructor() {
    super('test_results');
  }

  async getTestResults() {
    const result = await this.pool.query(
      `SELECT test_type, passed, failed, total, run_date
       FROM test_results
       ORDER BY run_date DESC
       LIMIT 100`
    );
    return result.rows;
  }

  async createTestResult(data) {
    const { test_type, passed, failed, total } = data;

    const result = await this.pool.query(
      `INSERT INTO test_results (test_type, passed, failed, total, run_date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [test_type, passed, failed, total]
    );
    return result.rows[0];
  }
}

module.exports = new TestingRepository();
