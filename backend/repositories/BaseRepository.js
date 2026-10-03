const { pool } = require('../config/database');

// SECURITY: tableName is interpolated into SQL — validate it once at
// construction so a caller can't smuggle arbitrary SQL through it.
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Base Repository for standardized data access
 */
class BaseRepository {
  // Repository-layer pagination guard — hard LIMIT ceiling mirroring
  // middleware/pagination.js maxLimit so callers can't request unbounded rows.
  static MAX_LIMIT = 100;

  constructor(tableName) {
    if (typeof tableName !== 'string' || !IDENT.test(tableName)) {
      throw new Error(`Invalid SQL identifier for tableName: ${tableName}`);
    }
    this.tableName = tableName;
    this.pool = pool;
    this._columnCache = null;
  }

  /**
   * Clamps a caller-supplied LIMIT into [1, MAX_LIMIT].
   * Repositories must route every user-influenced limit through this to
   * prevent memory exhaustion when a request bypasses the pagination
   * middleware: `params.push(this.clampLimit(options.limit))`.
   */
  clampLimit(limit, maxLimit = BaseRepository.MAX_LIMIT) {
    const parsed = parseInt(limit, 10);
    if (Number.isNaN(parsed)) return maxLimit;
    return Math.min(Math.max(parsed, 1), maxLimit);
  }

  async getTableColumns() {
    if (this._columnCache) {
      return this._columnCache;
    }

    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await this.pool.query(query, [this.tableName]);
    this._columnCache = result.rows.map(row => row.column_name);
    return this._columnCache;
  }

  /**
   * Tenant guard for core CRUD: when the table carries a church_id column the
   * caller MUST supply churchId — omitting it is a cross-tenant access bug,
   * not a platform-level read. Returns false for global tables (no column),
   * which are then queried without a tenant filter.
   */
  async _enforceChurchScope(churchId, method) {
    const columns = await this.getTableColumns();
    const tenantScoped = columns.includes('church_id');
    if (tenantScoped && (churchId === null || churchId === undefined)) {
      throw new Error(`${method}: churchId is required for tenant-scoped table '${this.tableName}'`);
    }
    return tenantScoped;
  }

  async findById(id, churchId) {
    const tenantScoped = await this._enforceChurchScope(churchId, 'findById');
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params = [id];

    if (tenantScoped) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findAll(filters = {}, churchId, options = {}) {
    const tenantScoped = await this._enforceChurchScope(churchId, 'findAll');
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    if (tenantScoped) {
      conditions.push(`church_id = $${params.length + 1}`);
      params.push(churchId);
    }

    const allowedColumns = await this.getTableColumns();
    Object.entries(filters).forEach(([key, value]) => {
      if (!allowedColumns.includes(key)) return;
      conditions.push(`${key} = $${params.length + 1}`);
      params.push(value);
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options.limit !== undefined && options.limit !== null) {
      params.push(this.clampLimit(options.limit));
      query += ` LIMIT $${params.length}`;
    }

    if (options.offset) {
      const offset = Math.max(parseInt(options.offset, 10) || 0, 0);
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async create(data, churchId = null) {
    const allowedColumns = await this.getTableColumns();
    const keys = Object.keys(data).filter(key => allowedColumns.includes(key));
    const values = keys.map(key => data[key]);

    if (allowedColumns.includes('church_id')) {
      if (churchId === null || churchId === undefined) {
        throw new Error(`create: churchId is required for tenant-scoped table '${this.tableName}'`);
      }
      keys.push('church_id');
      values.push(churchId);
    }

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data, churchId) {
    const tenantScoped = await this._enforceChurchScope(churchId, 'update');
    const allowedColumns = await this.getTableColumns();
    const keys = Object.keys(data).filter(key => allowedColumns.includes(key));
    if (keys.length === 0) {
      return null;
    }

    const values = keys.map(key => data[key]);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    let query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1}`;
    const params = [...values, id];

    if (tenantScoped) {
      query += ` AND church_id = $${keys.length + 2}`;
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async delete(id, churchId) {
    const tenantScoped = await this._enforceChurchScope(churchId, 'delete');
    let query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const params = [id];

    if (tenantScoped) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async softDelete(id, churchId) {
    const tenantScoped = await this._enforceChurchScope(churchId, 'softDelete');
    const allowedColumns = await this.getTableColumns();
    if (!allowedColumns.includes('is_active') || !allowedColumns.includes('deleted_at')) {
      throw new Error('Table does not support soft delete (missing is_active or deleted_at columns)');
    }

    let query = `
      UPDATE ${this.tableName}
      SET is_active = false, deleted_at = NOW()
      WHERE id = $1
    `;
    const params = [id];

    if (tenantScoped) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result;
  }

  async executePaginatedQuery(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }
}

module.exports = BaseRepository;
