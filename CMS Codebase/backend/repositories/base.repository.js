/**
 * Base Repository Class
 * Provides common CRUD operations for all repositories
 * Follows Repository Pattern for data access abstraction
 */

class BaseRepository {
  constructor(pool, tableName, primaryKey = 'id') {
    this.pool = pool;
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find all records with optional filtering and pagination
   */
  async findAll(options = {}) {
    const { where = {}, orderBy = null, limit = null, offset = null, joins = [] } = options;
    
    let query = `SELECT ${this.tableName}.*`;
    let params = [];
    let paramIndex = 1;
    
    // Add join selects
    joins.forEach(join => {
      if (join.select) {
        query += `, ${join.select}`;
      }
    });
    
    query += ` FROM ${this.tableName}`;
    
    // Add joins
    joins.forEach(join => {
      query += ` ${join.type || 'LEFT'} JOIN ${join.table} ON ${join.condition}`;
    });
    
    // Add where clause
    const whereKeys = Object.keys(where);
    if (whereKeys.length > 0) {
      const whereConditions = whereKeys.map(key => {
        if (Array.isArray(where[key])) {
          // Handle array values (IN clause)
          const placeholders = where[key].map(() => `$${paramIndex++}`).join(', ');
          params.push(...where[key]);
          return `${key} IN (${placeholders})`;
        } else if (where[key] === null) {
          return `${key} IS NULL`;
        } else {
          params.push(where[key]);
          return `${key} = $${paramIndex++}`;
        }
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    // Add pagination
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${paramIndex++}`;
    }
    
    if (offset) {
      params.push(offset);
      query += ` OFFSET $${paramIndex++}`;
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Find a single record by primary key
   */
  async findById(id, options = {}) {
    const { joins = [] } = options;
    
    let query = `SELECT ${this.tableName}.*`;
    
    joins.forEach(join => {
      if (join.select) {
        query += `, ${join.select}`;
      }
    });
    
    query += ` FROM ${this.tableName}`;
    
    joins.forEach(join => {
      query += ` ${join.type || 'LEFT'} JOIN ${join.table} ON ${join.condition}`;
    });
    
    query += ` WHERE ${this.tableName}.${this.primaryKey} = $1`;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a single record by specific field
   */
  async findOne(where = {}, options = {}) {
    const results = await this.findAll({ ...options, where, limit: 1 });
    return results[0] || null;
  }

  /**
   * Create a new record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by primary key
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) {
      throw new Error('No data provided for update');
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $${keys.length + 1}
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [...values, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by primary key
   */
  async delete(id) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Count records with optional filtering
   */
  async count(where = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    let params = [];
    let paramIndex = 1;
    
    const whereKeys = Object.keys(where);
    if (whereKeys.length > 0) {
      const whereConditions = whereKeys.map(key => {
        params.push(where[key]);
        return `${key} = $${paramIndex++}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Execute a transaction with multiple operations
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a custom query
   */
  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Execute a custom query for a single result
   */
  async queryOne(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows[0] || null;
  }
}

module.exports = BaseRepository;
