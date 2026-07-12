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
      this.success(res, comments, 'Comments retrieved successfully');
    } catch (error) {
      this.logger.error('getComments', error);
      this.error(res, 'Failed to fetch comments');
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

      this.success(res, commentWithUser, 'Comment created successfully');
    } catch (error) {
      this.logger.error('createComment', error);
      this.error(res, 'Failed to create comment');
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
        return this.notFound(res, 'Comment not found');
      }

      const isOwner = comment.user_id === req.user.id;
      const isAdmin = this.isAdmin(req.user);

      if (!isOwner && !isAdmin) {
        return this.forbidden(res, 'Not authorized to edit this comment');
      }

      const updated = await CommentsRepository.updateCommentContent(commentId, content);

      this.success(res, updated, 'Comment updated successfully');
    } catch (error) {
      this.logger.error('updateComment', error);
      this.error(res, 'Failed to update comment');
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
        return this.notFound(res, 'Comment not found');
      }

      const isOwner = comment.user_id === req.user.id;
      const isAdmin = this.isAdmin(req.user);

      if (!isOwner && !isAdmin) {
        return this.forbidden(res, 'Not authorized to delete this comment');
      }

      await CommentsRepository.deleteComment(commentId);

      this.success(res, null, 'Comment deleted successfully');
    } catch (error) {
      this.logger.error('deleteComment', error);
      this.error(res, 'Failed to delete comment');
    }
  }
}

module.exports = new CommentsController();
