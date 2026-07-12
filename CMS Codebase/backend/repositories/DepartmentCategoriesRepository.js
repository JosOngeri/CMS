const BaseRepository = require('./BaseRepository');

class DepartmentCategoriesRepository extends BaseRepository {
  constructor() {
    super('department_categories');
  }

  async getAllActive() {
    const result = await this.pool.query(
      'SELECT * FROM department_categories WHERE is_active = true ORDER BY name ASC'
    );
    return result.rows;
  }

  async getById(id) {
    const result = await this.pool.query(
      'SELECT * FROM department_categories WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async create(data) {
    const { name, description, color } = data;
    const result = await this.pool.query(
      'INSERT INTO department_categories (name, description, color) VALUES ($1, $2, $3) RETURNING *',
      [name, description, color]
    );
    return result.rows[0];
  }

  async update(id, data) {
    const { name, description, color, is_active } = data;
    const result = await this.pool.query(
      `UPDATE ${this.tableName} 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description, color, is_active, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.pool.query(
      'DELETE FROM department_categories WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async checkCategoryUsage(categoryName) {
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM departments WHERE category = $1',
      [categoryName]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new DepartmentCategoriesRepository();
