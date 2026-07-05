const BaseRepository = require('./BaseRepository');

class AnnouncementsRepository extends BaseRepository {
  constructor() {
    super('announcements');
  }

  async getRecent(churchId = null, limit = 10) {
    let query = `
      SELECT a.*, u.first_name || ' ' || u.last_name as author_name
      FROM ${this.tableName} a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_public = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND a.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByDepartment(departmentId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE department_id = $1`;
    const params = [departmentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithAuthorDetails(announcementId, churchId = null) {
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.email,
             d.name as department_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = $1
    `;
    const params = [announcementId];

    if (churchId) {
      query += ` AND a.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createAnnouncement(data, churchId = null) {
    const { title, content, announcement_type, department_id, author_id, priority, expires_at, is_public } = data;

    let query = `
      INSERT INTO announcements (title, content, announcement_type, department_id, author_id, priority, expires_at, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [title, content, announcement_type, department_id, author_id, priority, expires_at, is_public];

    if (churchId) {
      query = `
        INSERT INTO announcements (title, content, announcement_type, department_id, author_id, priority, expires_at, is_public, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async checkDepartmentMember(userId, departmentId) {
    const query = `
      SELECT dm.id
      FROM department_members dm
      WHERE dm.user_id = $1 AND dm.department_id = $2
    `;
    const result = await this.pool.query(query, [userId, departmentId]);
    return result.rows[0];
  }

  async checkAdminPermission(userId, roleName) {
    const query = `
      SELECT ur.id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND r.name = $2
    `;
    const result = await this.pool.query(query, [userId, roleName]);
    return result.rows[0];
  }

  async updateAnnouncement(id, data) {
    const { title, content, announcement_type, department_id, priority, expires_at, is_public } = data;

    const query = `
      UPDATE announcements
      SET title = $1, content = $2, announcement_type = $3, department_id = $4,
          priority = $5, expires_at = $6, is_public = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    const params = [title, content, announcement_type, department_id, priority, expires_at, is_public, id];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteAnnouncement(id) {
    const result = await this.pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async getPaginatedAnnouncements(filters = {}) {
    const { limit = 20, offset = 0, search, department_id, is_public, is_published } = filters;

    let query = `
      SELECT a.*, u.first_name || ' ' || u.last_name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (a.title ILIKE $${paramCount++} OR a.content ILIKE $${paramCount++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (department_id) {
      query += ` AND a.department_id = $${paramCount++}`;
      params.push(department_id);
    }

    if (is_public !== undefined) {
      query += ` AND a.is_public = $${paramCount++}`;
      params.push(is_public);
    }

    if (is_published !== undefined) {
      query += ` AND a.is_published = $${paramCount++}`;
      params.push(is_published);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAnnouncementCount(filters = {}) {
    const { search, department_id, is_public, is_published } = filters;

    let query = `SELECT COUNT(*) as count FROM announcements WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (title ILIKE $${paramCount++} OR content ILIKE $${paramCount++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (department_id) {
      query += ` AND department_id = $${paramCount++}`;
      params.push(department_id);
    }

    if (is_public !== undefined) {
      query += ` AND is_public = $${paramCount++}`;
      params.push(is_public);
    }

    if (is_published !== undefined) {
      query += ` AND is_published = $${paramCount++}`;
      params.push(is_published);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getAnnouncementById(id) {
    const query = `
      SELECT a.*, u.first_name || ' ' || u.last_name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = $1
      AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new AnnouncementsRepository();
