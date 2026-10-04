const BaseRepository = require('./BaseRepository');

// Tables that reach church scope through a parent row instead of a direct
// church_id column: { join: parent table carrying church_id, fk: this
// table's column pointing at it }.
const SCOPE_JOINS = {
  chat_messages: { join: 'chat_rooms', fk: 'room_id' },
};

class SyncRepository extends BaseRepository {
  constructor() {
    super('sync');
    this._columnCache = new Map();
  }

  async _columns(table) {
    if (!this._columnCache.has(table)) {
      const { rows } = await this.pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      this._columnCache.set(table, new Set(rows.map((r) => r.column_name)));
    }
    return this._columnCache.get(table);
  }

  async getDelta(tables, churchId, since) {
    const delta = {};
    // Table names are interpolated — reject anything but a plain identifier
    // even though callers currently pass a hardcoded allowlist.
    const IDENT = /^[a-z][a-z0-9_]*$/;

    for (const table of tables) {
      if (!IDENT.test(table)) throw new Error(`Invalid sync table: ${table}`);
      const cols = await this._columns(table);
      const timeClause = cols.has('updated_at')
        ? '(t.updated_at > $2 OR t.created_at > $2)'
        : 't.created_at > $2';

      const scope = SCOPE_JOINS[table];
      let sql;
      if (scope) {
        sql = `SELECT t.* FROM ${table} t JOIN ${scope.join} j ON t.${scope.fk} = j.id
               WHERE j.church_id = $1 AND ${timeClause}`;
      } else if (cols.has('church_id')) {
        sql = `SELECT t.* FROM ${table} t
               WHERE (t.church_id = $1 OR t.id = $1) AND ${timeClause}`;
      } else {
        // No tenant column and no known scope path — return nothing rather
        // than leak every church's rows into one sync payload.
        delta[table] = [];
        continue;
      }
      const result = await this.pool.query(sql, [churchId, since]);
      delta[table] = result.rows;
    }

    return delta;
  }
}

module.exports = new SyncRepository();
