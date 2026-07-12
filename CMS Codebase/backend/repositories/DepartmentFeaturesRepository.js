const BaseRepository = require('./BaseRepository');

class DepartmentFeaturesRepository extends BaseRepository {
  constructor() {
    super('department_features');
  }

  async getAllFeatures(churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND (church_id = $1 OR church_id IS NULL)`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFeatureBySlug(featureSlug, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE slug = $1 AND is_active = true`;
    const params = [featureSlug];

    if (churchId) {
      query += ` AND (church_id = $2 OR church_id IS NULL)`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDepartmentFeatures(departmentId) {
    const result = await this.pool.query(
      `SELECT df.*, dfs.is_enabled, dfs.config
       FROM department_features df
       JOIN department_feature_settings dfs ON df.id = dfs.feature_id
       WHERE dfs.department_id = $1 AND dfs.is_enabled = true
       ORDER BY df.category, df.name`,
      [departmentId]
    );
    return result.rows;
  }

  async allocateFeatureToDepartment(departmentId, featureId, config = {}, churchId = null) {
    const result = await this.pool.query(
      `INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
       VALUES ($1, $2, true, $3, $4)
       ON CONFLICT (department_id, feature_id) 
       DO UPDATE SET is_enabled = true, config = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [departmentId, featureId, JSON.stringify(config), churchId]
    );
    return result.rows[0];
  }

  async removeFeatureFromDepartment(departmentId, featureId) {
    const result = await this.pool.query(
      `DELETE FROM department_feature_settings 
       WHERE department_id = $1 AND feature_id = $2
       RETURNING *`,
      [departmentId, featureId]
    );
    return result.rows[0];
  }

  async updateFeatureConfig(departmentId, featureId, config) {
    const result = await this.pool.query(
      `UPDATE department_feature_settings 
       SET config = $1, updated_at = CURRENT_TIMESTAMP
       WHERE department_id = $2 AND feature_id = $3
       RETURNING *`,
      [JSON.stringify(config), departmentId, featureId]
    );
    return result.rows[0];
  }

  async getFeaturesByCategory(category, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE category = $1 AND is_active = true`;
    const params = [category];

    if (churchId) {
      query += ` AND (church_id = $2 OR church_id IS NULL)`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = new DepartmentFeaturesRepository();
