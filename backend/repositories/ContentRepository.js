const BaseRepository = require('./BaseRepository');

/**
 * ContentRepository (Phase 4)
 * Centralizes all content-related data access for the content module.
 */
class ContentRepository extends BaseRepository {
  constructor() {
    super('content_items');
  }

  // ---------------------------------------------------------------------------
  // Basic content queries
  // ---------------------------------------------------------------------------

  async getRecent(churchId = null, limit = 20) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByType(type, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE content_type = $1`;
    const params = [type];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByStatus(status, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE status = $1`;
    const params = [status];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async search(searchTerm, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE (title ILIKE $1 OR body ILIKE $1)`;
    const params = [`%${searchTerm}%`];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAllWithFilters(filters = {}, churchId = null) {
    let query = `
      SELECT ci.*, cc.name as category_name, u.first_name || ' ' || u.last_name as author_name
      FROM content_items ci
      LEFT JOIN content_categories cc ON ci.category_id = cc.id
      LEFT JOIN users u ON ci.author_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND ci.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND ci.category_id = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.type) {
      paramCount++;
      query += ` AND ci.content_type = $${paramCount}`;
      params.push(filters.type);
    }

    if (churchId) {
      paramCount++;
      query += ` AND ci.church_id = $${paramCount}`;
      params.push(churchId);
    }

    query += ` ORDER BY ci.created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBySlugWithDetails(slug) {
    const result = await this.pool.query(
      `SELECT ci.*, cc.name as category_name, u.first_name || ' ' || u.last_name as author_name
       FROM content_items ci
       LEFT JOIN content_categories cc ON ci.category_id = cc.id
       LEFT JOIN users u ON ci.author_id = u.id
       WHERE ci.slug = $1 AND ci.status = 'published'`,
      [slug]
    );
    return result.rows[0];
  }

  async findContentItemById(id) {
    const result = await this.pool.query('SELECT * FROM content_items WHERE id = $1', [id]);
    return result.rows[0];
  }

  async createContentItem(data) {
    const result = await this.pool.query(
      `INSERT INTO content_items (
        title, slug, content, content_type, category_id, author_id, status,
        published_at, expires_at, priority, seo_title, seo_description, og_image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.title, data.slug, data.content, data.contentType, data.categoryId, data.authorId,
        data.status, data.publishedAt, data.expiresAt, data.priority, data.seoTitle,
        data.seoDescription, data.ogImage
      ]
    );
    return result.rows[0];
  }

  async updateContentItem(id, data) {
    const result = await this.pool.query(
      `UPDATE content_items
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           content = COALESCE($3, content),
           content_type = COALESCE($4, content_type),
           category_id = COALESCE($5, category_id),
           status = COALESCE($6, status),
           published_at = COALESCE($7, published_at),
           expires_at = COALESCE($8, expires_at),
           priority = COALESCE($9, priority),
           seo_title = COALESCE($10, seo_title),
           seo_description = COALESCE($11, seo_description),
           og_image = COALESCE($12, og_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        data.title, data.slug, data.content, data.contentType, data.categoryId, data.status,
        data.publishedAt, data.expiresAt, data.priority, data.seoTitle, data.seoDescription,
        data.ogImage, id
      ]
    );
    return result.rows[0];
  }

  async update(id, data) {
    // Alias for updateContentItem for consistency with BaseRepository
    return this.updateContentItem(id, data);
  }

  async deleteContentItem(id) {
    await this.pool.query('DELETE FROM content_items WHERE id = $1', [id]);
  }

  async publishContentItem(id) {
    const result = await this.pool.query(
      `UPDATE content_items
       SET status = 'published',
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

  async getTagsByContentItemId(contentItemId) {
    const result = await this.pool.query(
      `SELECT t.* FROM content_tags t
       JOIN content_item_tags cit ON t.id = cit.tag_id
       WHERE cit.content_item_id = $1`,
      [contentItemId]
    );
    return result.rows;
  }

  async addContentItemTag(contentItemId, tagId) {
    await this.pool.query(
      'INSERT INTO content_item_tags (content_item_id, tag_id) VALUES ($1, $2)',
      [contentItemId, tagId]
    );
  }

  async deleteContentItemTags(contentItemId) {
    await this.pool.query('DELETE FROM content_item_tags WHERE content_item_id = $1', [contentItemId]);
  }

  async getTagsOrdered() {
    const result = await this.pool.query('SELECT * FROM content_tags ORDER BY name');
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Revisions
  // ---------------------------------------------------------------------------

  async getRevisionsByContentItemId(contentItemId) {
    const result = await this.pool.query(
      `SELECT cr.*, u.first_name || ' ' || u.last_name as author_name
       FROM content_revisions cr
       LEFT JOIN users u ON cr.author_id = u.id
       WHERE cr.content_item_id = $1
       ORDER BY cr.revision_number DESC`,
      [contentItemId]
    );
    return result.rows;
  }

  async findRevisionById(revisionId) {
    const result = await this.pool.query('SELECT * FROM content_revisions WHERE id = $1', [revisionId]);
    return result.rows[0];
  }

  async getMaxRevisionNumber(contentItemId) {
    const result = await this.pool.query(
      'SELECT COALESCE(MAX(revision_number), 0) as current_rev FROM content_revisions WHERE content_item_id = $1',
      [contentItemId]
    );
    return result.rows[0].current_rev;
  }

  async createRevision(data) {
    const result = await this.pool.query(
      `INSERT INTO content_revisions (content_item_id, title, content, author_id, revision_number, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.contentItemId, data.title, data.content, data.authorId, data.revisionNumber,
        data.changeSummary
      ]
    );
    return result.rows[0];
  }

  async createInitialRevision(data) {
    return this.createRevision({
      contentItemId: data.contentItemId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      revisionNumber: 1,
      changeSummary: 'Initial revision'
    });
  }

  async createUpdateRevision(data) {
    return this.createRevision({
      contentItemId: data.contentItemId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      revisionNumber: data.revisionNumber,
      changeSummary: 'Content update'
    });
  }

  async createRollbackRevision(data) {
    return this.createRevision({
      contentItemId: data.contentItemId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      revisionNumber: data.revisionNumber,
      changeSummary: `Rollback to revision ${data.targetRevisionNumber}`
    });
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async getCategoriesOrdered() {
    const result = await this.pool.query('SELECT * FROM content_categories ORDER BY sort_order, name');
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Website settings
  // ---------------------------------------------------------------------------

  async getWebsiteSettingsOrdered() {
    const result = await this.pool.query('SELECT * FROM website_settings ORDER BY category, key_name');
    return result.rows;
  }

  async upsertWebsiteSetting(data) {
    await this.pool.query(
      `INSERT INTO website_settings (key_name, value, value_type, category, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key_name) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`,
      [data.keyName, data.value, data.valueType, data.category, data.description]
    );
  }

  // ---------------------------------------------------------------------------
  // Collaborators
  // ---------------------------------------------------------------------------

  async getCollaboratorsByContentItemId(contentItemId) {
    const result = await this.pool.query(
      `SELECT cc.*, u.first_name, u.last_name, u.email
       FROM content_collaborators cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.content_item_id = $1
       ORDER BY cc.added_at DESC`,
      [contentItemId]
    );
    return result.rows;
  }

  async upsertContentCollaborator(contentItemId, userId, role) {
    const result = await this.pool.query(
      `INSERT INTO content_collaborators (content_item_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (content_item_id, user_id) DO UPDATE SET
         role = EXCLUDED.role
       RETURNING *`,
      [contentItemId, userId, role]
    );
    return result.rows[0];
  }

  async deleteContentCollaborator(contentItemId, userId) {
    await this.pool.query(
      'DELETE FROM content_collaborators WHERE content_item_id = $1 AND user_id = $2',
      [contentItemId, userId]
    );
  }

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  async getCommentsByContentItemId(contentItemId) {
    const result = await this.pool.query(
      `SELECT cc.*, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM content_comments WHERE parent_id = cc.id) as reply_count
       FROM content_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.content_item_id = $1
       ORDER BY cc.created_at ASC`,
      [contentItemId]
    );
    return result.rows;
  }

  async createContentComment(data) {
    const result = await this.pool.query(
      `INSERT INTO content_comments (content_item_id, user_id, comment, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.contentItemId, data.userId, data.comment, data.parentId]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Content locks
  // ---------------------------------------------------------------------------

  async getActiveContentLock(contentItemId) {
    const result = await this.pool.query(
      'SELECT * FROM content_locks WHERE content_item_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
      [contentItemId]
    );
    return result.rows[0];
  }

  async getContentLockByContentItemId(contentItemId) {
    const result = await this.pool.query('SELECT * FROM content_locks WHERE content_item_id = $1', [contentItemId]);
    return result.rows[0];
  }

  async upsertContentLock(contentItemId, userId, expiresAt) {
    const result = await this.pool.query(
      `INSERT INTO content_locks (content_item_id, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (content_item_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         locked_at = CURRENT_TIMESTAMP,
         expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [contentItemId, userId, expiresAt]
    );
    return result.rows[0];
  }

  async deleteContentLock(contentItemId) {
    await this.pool.query('DELETE FROM content_locks WHERE content_item_id = $1', [contentItemId]);
  }

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------

  async schedulePublish(id, scheduledPublishAt, scheduledUnpublishAt) {
    const result = await this.pool.query(
      `UPDATE content_items 
       SET scheduled_publish_at = COALESCE($1, scheduled_publish_at),
           scheduled_unpublish_at = COALESCE($2, scheduled_unpublish_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [scheduledPublishAt, scheduledUnpublishAt, id]
    );
    return result.rows[0];
  }

  async unpublishContent(id) {
    const result = await this.pool.query(
      `UPDATE content_items 
       SET status = 'draft',
           published_at = NULL,
           scheduled_publish_at = NULL,
           scheduled_unpublish_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async getScheduledContent(status = null) {
    let query = `
      SELECT ci.*, 
             cc.name as category_name,
             u.first_name || ' ' || u.last_name as author_name
      FROM content_items ci
      LEFT JOIN content_categories cc ON ci.category_id = cc.id
      LEFT JOIN users u ON ci.author_id = u.id
      WHERE ci.scheduled_publish_at IS NOT NULL
    `;
    const params = [];

    if (status) {
      query += ` AND ci.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY ci.scheduled_publish_at ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async autoSaveContent(id, content) {
    const result = await this.pool.query(
      `UPDATE content_items 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [content, id]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Duplicate check
  // ---------------------------------------------------------------------------

  async checkDuplicateContent(title, excludeId = null) {
    let query = `SELECT id, title, slug, status FROM content_items WHERE title ILIKE $1`;
    const params = [`%${title}%`];

    if (excludeId) {
      query += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Export/Import
  // ---------------------------------------------------------------------------

  async exportContent(category = null, status = null) {
    let query = `
      SELECT ci.*, cc.name as category_name, u.first_name || ' ' || u.last_name as author_name
      FROM content_items ci
      LEFT JOIN content_categories cc ON ci.category_id = cc.id
      LEFT JOIN users u ON ci.author_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND ci.category_id = $${paramCount}`;
      params.push(category);
    }

    if (status) {
      paramCount++;
      query += ` AND ci.status = $${paramCount}`;
      params.push(status);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async importContentItem(data) {
    const result = await this.pool.query(
      `INSERT INTO content_items (title, slug, content, content_type, category_id, author_id, status, published_at, expires_at, priority, seo_title, seo_description, og_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.title, data.slug, data.content, data.contentType, data.categoryId, data.authorId,
        data.status, data.publishedAt, data.expiresAt, data.priority, data.seoTitle,
        data.seoDescription, data.ogImage
      ]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  async getContentByStatus() {
    const result = await this.pool.query(
      `SELECT status, COUNT(*) as count FROM content_items WHERE 1=1 GROUP BY status`
    );
    return result.rows;
  }

  async getContentByType() {
    const result = await this.pool.query(
      `SELECT content_type, COUNT(*) as count FROM content_items WHERE 1=1 GROUP BY content_type`
    );
    return result.rows;
  }

  async getContentByCategory() {
    const result = await this.pool.query(
      `SELECT cc.name, COUNT(ci.id) as count 
       FROM content_categories cc 
       LEFT JOIN content_items ci ON cc.id = ci.category_id 
       GROUP BY cc.name`
    );
    return result.rows;
  }

  async getPublishedContentOverTime(startDate = null, endDate = null) {
    let query = `
      SELECT DATE(published_at) as date, COUNT(*) as count 
      FROM content_items 
      WHERE published_at IS NOT NULL
    `;
    const params = [];

    if (startDate) {
      query += ` AND published_at >= $1`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND published_at <= $2`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(published_at) ORDER BY date DESC LIMIT 30`;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getContentLockStatus(contentItemId) {
    const result = await this.pool.query(
      `SELECT cl.*, u.first_name, u.last_name
       FROM content_locks cl
       LEFT JOIN users u ON cl.user_id = u.id
       WHERE cl.content_item_id = $1
       AND (cl.expires_at IS NULL OR cl.expires_at > CURRENT_TIMESTAMP)`,
      [contentItemId]
    );
    return result.rows[0];
  }
}

module.exports = new ContentRepository();
