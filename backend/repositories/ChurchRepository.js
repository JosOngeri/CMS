const BaseRepository = require('./BaseRepository');

class ChurchRepository extends BaseRepository {
  constructor() {
    super('churches');
  }

  async getAllChurches() {
    const result = await this.pool.query(
      'SELECT id, name, slug, settings, created_at FROM churches ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getChurchById(id) {
    const result = await this.pool.query(
      'SELECT * FROM churches WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async getChurchBySlug(slug) {
    const result = await this.pool.query(
      'SELECT * FROM churches WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async getChurchBySlugForCheck(slug) {
    const result = await this.pool.query(
      'SELECT id FROM churches WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async createChurch(data) {
    const { name, slug, settings } = data;

    const result = await this.pool.query(
      'INSERT INTO churches (name, slug, settings) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, JSON.stringify(settings)]
    );
    return result.rows[0];
  }

  async updateChurch(id, updates, values) {
    const query = `
      UPDATE churches
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    const result = await this.pool.query(query, [...values, id]);
    return result.rows[0];
  }

  async checkSlugExists(slug, excludeId = null) {
    let query = 'SELECT id FROM churches WHERE slug = $1';
    const params = [slug];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteChurch(id) {
    const result = await this.pool.query('DELETE FROM churches WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getUserCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM users WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getMemberCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM members WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getPaymentCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM payments WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async getDepartmentCount(churchId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM departments WHERE church_id = $1',
      [churchId]
    );
    return parseInt(result.rows[0].count);
  }

  async updateChurchSettings(id, settings) {
    const result = await this.pool.query(
      'UPDATE churches SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(settings), id]
    );
    return result.rows[0];
  }
}

module.exports = new ChurchRepository();
