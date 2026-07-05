const BaseRepository = require('./BaseRepository');

class SyncRepository extends BaseRepository {
  constructor() {
    super('sync');
  }

  async getDelta(tables, churchId, since) {
    const delta = {};

    for (const table of tables) {
      const result = await this.pool.query(
        `SELECT * FROM ${table}
         WHERE (church_id = $1 OR id = $1)
         AND (updated_at > $2 OR created_at > $2)`,
        [churchId, since]
      );
      delta[table] = result.rows;
    }

    return delta;
  }
}

module.exports = new SyncRepository();
