const BaseRepository = require('./BaseRepository');

class SearchRepository extends BaseRepository {
  constructor() {
    super('saved_searches');
  }

  async saveSearch(userId, name, query, filters) {
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (user_id, name, query, filters)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, query, JSON.stringify(filters)]
    );
    return result.rows[0];
  }

  async getSavedSearches(userId) {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async deleteSavedSearch(id, userId) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rowCount > 0;
  }

  async getMemberSuggestions(searchQuery) {
    const result = await this.pool.query(
      `SELECT first_name || ' ' || last_name as name, 'member' as type
       FROM members
       WHERE first_name ILIKE $1 OR last_name ILIKE $1
       LIMIT 5`,
      [searchQuery]
    );
    return result.rows;
  }

  async getContentSuggestions(searchQuery) {
    const result = await this.pool.query(
      `SELECT title as name, 'content' as type
       FROM content_items
       WHERE title ILIKE $1
       LIMIT 5`,
      [searchQuery]
    );
    return result.rows;
  }

  async getDepartmentSuggestions(searchQuery) {
    const result = await this.pool.query(
      `SELECT name, 'department' as type
       FROM departments
       WHERE name ILIKE $1
       LIMIT 5`,
      [searchQuery]
    );
    return result.rows;
  }

  async searchMembers(query) {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email, phone, membership_status
       FROM members
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
       LIMIT 20`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async searchContent(query) {
    const result = await this.pool.query(
      `SELECT id, title, slug, content_type, status
       FROM content_items
       WHERE title ILIKE $1 OR content ILIKE $1
       LIMIT 20`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async searchDepartments(query) {
    const result = await this.pool.query(
      `SELECT id, name, description, category
       FROM departments
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 20`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async searchDocuments(query) {
    const result = await this.pool.query(
      `SELECT id, title, slug, description, file_type
       FROM documents
       WHERE title ILIKE $1 OR description ILIKE $1
       LIMIT 20`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async searchUsers(query) {
    const result = await this.pool.query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
       LIMIT 20`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async globalSearchMembers(query) {
    const result = await this.pool.query(
      `SELECT id, first_name || ' ' || last_name as title, email as description, 'member' as type, created_at as date
       FROM users
       WHERE first_name ILIKE $1 OR last_name ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async globalSearchDocuments(query) {
    const result = await this.pool.query(
      `SELECT id, name as title, description as description, 'document' as type, created_at as date
       FROM documents
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async globalSearchEvents(query) {
    const result = await this.pool.query(
      `SELECT id, title, description as description, 'event' as type, created_at as date
       FROM events
       WHERE title ILIKE $1 OR description ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async globalSearchAnnouncements(query) {
    const result = await this.pool.query(
      `SELECT id, title, SUBSTRING(content, 1, 200) as description, 'announcement' as type, created_at as date
       FROM announcements
       WHERE title ILIKE $1 OR content ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }

  async globalSearchDepartments(query) {
    const result = await this.pool.query(
      `SELECT id, name as title, description as description, 'department' as type, created_at as date
       FROM departments
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }
}

module.exports = new SearchRepository();
