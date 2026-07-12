const { pool } = require('../config/database');

/**
 * Base Repository for standardized data access
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
    this._columnCache = null;
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

  async findById(id, churchId) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND church_id = $2`;
    const params = [id, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findAll(filters = {}, churchId) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    conditions.push(`church_id = $${params.length + 1}`);
    params.push(churchId);

    const allowedColumns = await this.getTableColumns();
    Object.entries(filters).forEach(([key, value]) => {
      if (!allowedColumns.includes(key)) return;
      conditions.push(`${key} = $${params.length + 1}`);
      params.push(value);
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async create(data, churchId = null) {
    const allowedColumns = await this.getTableColumns();
    const keys = Object.keys(data).filter(key => allowedColumns.includes(key));
    const values = keys.map(key => data[key]);

    if (churchId && allowedColumns.includes('church_id')) {
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
    const allowedColumns = await this.getTableColumns();
    const keys = Object.keys(data).filter(key => allowedColumns.includes(key));
    if (keys.length === 0) {
      return null;
    }

    const values = keys.map(key => data[key]);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    let query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1}`;
    const params = [...values, id];

    if (churchId !== null && churchId !== undefined) {
      query += ` AND church_id = $${keys.length + 2}`;
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async delete(id, churchId) {
    let query = `DELETE FROM ${this.tableName} WHERE id = $1 AND church_id = $2`;
    const params = [id, churchId];

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async softDelete(id, churchId) {
    const allowedColumns = await this.getTableColumns();
    if (!allowedColumns.includes('is_active') || !allowedColumns.includes('deleted_at')) {
      throw new Error('Table does not support soft delete (missing is_active or deleted_at columns)');
    }

    const query = `
      UPDATE ${this.tableName}
      SET is_active = false, deleted_at = NOW()
      WHERE id = $1 AND church_id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, churchId]);
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
