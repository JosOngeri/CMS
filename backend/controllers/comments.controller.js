const CommentsRepository = require('../repositories/CommentsRepository');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Comments Controller
 * Handles comments for various entities
 */
class CommentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('CommentsController');
  }

  /**
   * Get comments for an entity
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.entityType - Entity type
   * @param {string} req.params.entityId - Entity ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getComments(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const comments = await CommentsRepository.getCommentsForEntity(entityType, entityId);
      res.json({ success: true, comments });
    } catch (error) {
      this.logger.error('getComments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
  }

  /**
   * Create a comment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.entityType - Entity type
   * @param {string} req.params.entityId - Entity ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.content - Comment content
   * @param {string} [req.body.type='comment'] - Comment type
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createComment(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const { content, type = 'comment' } = req.body;

      const comment = await CommentsRepository.createComment({
        entity_type: entityType,
        entity_id: entityId,
        user_id: req.user.id,
        content,
        type
      });

      const commentWithUser = await CommentsRepository.getCommentWithUser(comment.id);

      res.json({ success: true, comment: commentWithUser });
    } catch (error) {
      this.logger.error('createComment', error);
      res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  }

  /**
   * Update a comment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.commentId - Comment ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.content - Updated content
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;

      const comment = await CommentsRepository.findCommentById(commentId);

      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      const isOwner = comment.user_id === req.user.id;
      const isAdmin = req.user.roles.includes('Super Admin');

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Not authorized to edit this comment' });
      }

      const updated = await CommentsRepository.updateCommentContent(commentId, content);

      res.json({ success: true, comment: updated });
    } catch (error) {
      this.logger.error('updateComment', error);
      res.status(500).json({ success: false, error: 'Failed to update comment' });
    }
  }

  /**
   * Delete a comment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.commentId - Comment ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;

      const comment = await CommentsRepository.findCommentById(commentId);

      if (!comment) {
        return res.status(404).json({ success: false, error: 'Comment not found' });
      }

      const isOwner = comment.user_id === req.user.id;
      const isAdmin = req.user.roles.includes('Super Admin');

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
      }

      await CommentsRepository.deleteComment(commentId);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('deleteComment', error);
      res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  }
}

module.exports = new CommentsController();
