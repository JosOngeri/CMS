const BaseRepository = require('./BaseRepository');

class MpesaRepository extends BaseRepository {
  constructor() {
    super('mpesa_stk_pushes');
  }

  async getSTKPushHistory(churchId, limit = 50, offset = 0) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} 
       WHERE church_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [churchId, limit, offset]
    );
    return result.rows;
  }
}

module.exports = new MpesaRepository();
