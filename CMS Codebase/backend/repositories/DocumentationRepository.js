const BaseRepository = require('./BaseRepository');

class DocumentationRepository extends BaseRepository {
  constructor() {
    super('documentation');
  }

  async getAll() {
    const result = await this.pool.query(
      'SELECT * FROM documentation ORDER BY category, title'
    );
    return result.rows;
  }

  async getById(id) {
    const result = await this.pool.query(
      'SELECT * FROM documentation WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async create(data) {
    const { title, content, category, created_by } = data;
    const result = await this.pool.query(
      `INSERT INTO documentation (title, content, category, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [title, content, category, created_by]
    );
    return result.rows[0];
  }

  async update(id, data) {
    const { title, content, category, updated_by } = data;
    const result = await this.pool.query(
      `UPDATE documentation 
       SET title = $1, content = $2, category = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, content, category, updated_by, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.pool.query(
      'DELETE FROM documentation WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = new DocumentationRepository();
