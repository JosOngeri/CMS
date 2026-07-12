const BaseRepository = require('./BaseRepository');

class SearchRepository extends BaseRepository {
  constructor() {
    super('saved_searches');
  }

  async saveSearch(userId, name, query, filters, churchId) {
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (user_id, name, query, filters, church_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, query, JSON.stringify(filters), churchId]
    );
    return result.rows[0];
  }

  async getSavedSearches(userId, churchId) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND church_id = $2 ORDER BY created_at DESC`,
      [userId, churchId]
    );
    return result.rows;
  }

  async deleteSavedSearch(id, userId, churchId) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND user_id = $2 AND church_id = $3`,
      [id, userId, churchId]
    );
    return result.rowCount > 0;
  }

  async getMemberSuggestions(searchQuery, churchId) {
    const result = await this.pool.query(
      `SELECT first_name || ' ' || last_name as name, 'member' as type
       FROM members
       WHERE church_id = $1 AND (first_name ILIKE $2 OR last_name ILIKE $2)
       LIMIT 5`,
      [churchId, searchQuery]
    );
    return result.rows;
  }

  async getContentSuggestions(searchQuery, churchId) {
    const result = await this.pool.query(
      `SELECT title as name, 'content' as type
       FROM content_items
       WHERE church_id = $1 AND title ILIKE $2
       LIMIT 5`,
      [churchId, searchQuery]
    );
    return result.rows;
  }

  async getDepartmentSuggestions(searchQuery, churchId) {
    const result = await this.pool.query(
      `SELECT name, 'department' as type
       FROM departments
       WHERE church_id = $1 AND name ILIKE $2
       LIMIT 5`,
      [churchId, searchQuery]
    );
    return result.rows;
  }

  async searchMembers(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email, phone, membership_status
       FROM members
       WHERE church_id = $1 AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
       LIMIT 20`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async searchContent(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, title, slug, content_type, status
       FROM content_items
       WHERE church_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
       LIMIT 20`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async searchDepartments(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, name, description, category
       FROM departments
       WHERE church_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
       LIMIT 20`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async searchDocuments(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, title, slug, description, file_type
       FROM documents
       WHERE church_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
       LIMIT 20`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async searchUsers(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE church_id = $1 AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
       LIMIT 20`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async globalSearchMembers(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, first_name || ' ' || last_name as title, email as description, 'member' as type, created_at as date
       FROM members
       WHERE church_id = $1 AND (first_name ILIKE $2 OR last_name ILIKE $2)
       LIMIT 10`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async globalSearchDocuments(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, title as title, description as description, 'document' as type, created_at as date
       FROM documents
       WHERE church_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
       LIMIT 10`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async globalSearchEvents(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, title, description as description, 'event' as type, created_at as date
       FROM events
       WHERE church_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
       LIMIT 10`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async globalSearchAnnouncements(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, title, SUBSTRING(content, 1, 200) as description, 'announcement' as type, created_at as date
       FROM announcements
       WHERE church_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
       LIMIT 10`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }

  async globalSearchDepartments(query, churchId) {
    const result = await this.pool.query(
      `SELECT id, name as title, description as description, 'department' as type, created_at as date
       FROM departments
       WHERE church_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
       LIMIT 10`,
      [churchId, `%${query}%`]
    );
    return result.rows;
  }
}

module.exports = new SearchRepository();
