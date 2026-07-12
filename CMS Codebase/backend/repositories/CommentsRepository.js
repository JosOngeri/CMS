const BaseRepository = require('./BaseRepository');

class CommentsRepository extends BaseRepository {
  constructor() {
    super('comments');
  }

  async getCommentsForEntity(entityType, entityId) {
    const result = await this.pool.query(
      `SELECT
        c.*,
        u.first_name || 'Unknown' as user_name,
        u.email as user_email
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = $1 AND c.entity_id = $2
       ORDER BY c.created_at ASC`,
      [entityType, entityId]
    );
    return result.rows;
  }

  async createComment(data) {
    const { entity_type, entity_id, user_id, content, type } = data;
    const result = await this.pool.query(
      `INSERT INTO comments (entity_type, entity_id, user_id, content, type, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [entity_type, entity_id, user_id, content, type]
    );
    return result.rows[0];
  }

  async getCommentWithUser(commentId) {
    const result = await this.pool.query(
      `SELECT
        c.*,
        u.first_name || 'Unknown' as user_name,
        u.email as user_email
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [commentId]
    );
    return result.rows[0];
  }

  async findCommentById(commentId) {
    const result = await this.pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );
    return result.rows[0];
  }

  async updateCommentContent(commentId, content) {
    const result = await this.pool.query(
      'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content, commentId]
    );
    return result.rows[0];
  }

  async deleteComment(commentId) {
    await this.pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
  }
}

module.exports = new CommentsRepository();
