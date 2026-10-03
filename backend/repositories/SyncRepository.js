const BaseRepository = require('./BaseRepository');

class SyncRepository extends BaseRepository {
  constructor() {
    super('sync');
  }

  async getDelta(tables, churchId, since) {
    const delta = {};
    // Table names are interpolated — reject anything but a plain identifier
    // even though callers currently pass a hardcoded allowlist.
    const IDENT = /^[a-z][a-z0-9_]*$/;

    for (const table of tables) {
      if (!IDENT.test(table)) throw new Error(`Invalid sync table: ${table}`);
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
