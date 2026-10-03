const BaseRepository = require('./BaseRepository');

/**
 * Department categories repository.
 * Tenant model (migration 070): church_id NULL = global/shared category visible
 * to every church; church_id set = tenant-private category. Reads see both
 * scopes; mutations are scoped to the caller's own church rows so a tenant
 * admin can never edit or delete a global category.
 */
class DepartmentCategoriesRepository extends BaseRepository {
  constructor() {
    super('department_categories');
  }

  async getAllActive(churchId = null) {
    const params = [];
    let tenantFilter = '';
    if (churchId) {
      tenantFilter = ' AND (church_id = $1 OR church_id IS NULL)';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT * FROM department_categories WHERE is_active = true${tenantFilter} ORDER BY name ASC`,
      params
    );
    return result.rows;
  }

  async getById(id, churchId = null) {
    const params = [id];
    let tenantFilter = '';
    if (churchId) {
      tenantFilter = ' AND (church_id = $2 OR church_id IS NULL)';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT * FROM department_categories WHERE id = $1${tenantFilter}`,
      params
    );
    return result.rows[0];
  }

  async create(data, churchId = null) {
    const { name, description, color } = data;
    const result = await this.pool.query(
      'INSERT INTO department_categories (name, description, color, church_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, color, churchId]
    );
    return result.rows[0];
  }

  async update(id, data, churchId = null) {
    const { name, description, color, is_active } = data;
    const params = [name, description, color, is_active, id];
    let tenantFilter = '';
    if (churchId) {
      // Tenant-scoped mutation — global (NULL church_id) rows are read-only.
      tenantFilter = ' AND church_id = $6';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `UPDATE ${this.tableName} 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5${tenantFilter}
       RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async delete(id, churchId = null) {
    const params = [id];
    let tenantFilter = '';
    if (churchId) {
      tenantFilter = ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `DELETE FROM department_categories WHERE id = $1${tenantFilter} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async checkCategoryUsage(categoryName, churchId = null) {
    const params = [categoryName];
    let tenantFilter = '';
    if (churchId) {
      tenantFilter = ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM departments WHERE category = $1${tenantFilter}`,
      params
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new DepartmentCategoriesRepository();
