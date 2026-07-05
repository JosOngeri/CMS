const { pool } = require('../config/database');

/**
 * Base Repository for standardized data access
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  async findById(id, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params = [id];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    if (churchId) {
      conditions.push(`church_id = $${params.length + 1}`);
      params.push(churchId);
    }

    Object.entries(filters).forEach(([key, value]) => {
      conditions.push(`${key} = $${params.length + 1}`);
      params.push(value);
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data, churchId = null) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    let query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1}`;
    const params = [...values, id];

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    query += ' RETURNING *';

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async delete(id, churchId = null) {
    let query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const params = [id];

    if (churchId) {
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
}

module.exports = BaseRepository;
