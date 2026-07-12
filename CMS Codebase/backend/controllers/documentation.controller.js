const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const documentationRepository = require('../repositories/DocumentationRepository');

/**
 * Documentation Controller
 * Handles documentation CRUD operations
 */
class DocumentationController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DocumentationController');
  }

  /**
   * Get all documentation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAll(req, res) {
    try {
      const result = await documentationRepository.getAll();
      this.success(res, result, 'Documentation retrieved successfully');
    } catch (error) {
      this.logger.error('getAll', error);
      this.error(res, 'Failed to fetch documentation');
    }
  }

  /**
   * Get document by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getById(req, res) {
    try {
      const result = await documentationRepository.getById(req.params.id);
      if (!result) {
        return this.notFound(res, 'Document not found');
      }
      this.success(res, result, 'Document retrieved successfully');
    } catch (error) {
      this.logger.error('getById', error);
      this.error(res, 'Failed to fetch document');
    }
  }

  /**
   * Create documentation
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Document title
   * @param {string} req.body.content - Document content
   * @param {string} req.body.category - Document category
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async create(req, res) {
    try {
      const { title, content, category } = req.body;
      const result = await documentationRepository.create({
        title, content, category, created_by: req.user.id
      });
      this.success(res, result, 'Document created successfully');
    } catch (error) {
      this.logger.error('create', error);
      this.error(res, 'Failed to create document');
    }
  }

  /**
   * Update documentation
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.title] - Document title
   * @param {string} [req.body.content] - Document content
   * @param {string} [req.body.category] - Document category
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async update(req, res) {
    try {
      const { title, content, category } = req.body;
      const result = await documentationRepository.update(req.params.id, {
        title, content, category, updated_by: req.user.id
      });
      if (!result) {
        return this.notFound(res, 'Document not found');
      }
      this.success(res, result, 'Document updated successfully');
    } catch (error) {
      this.logger.error('update', error);
      this.error(res, 'Failed to update document');
    }
  }

  /**
   * Delete documentation
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Document ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async delete(req, res) {
    try {
      await documentationRepository.delete(req.params.id);
      this.success(res, null, 'Document deleted successfully');
    } catch (error) {
      this.logger.error('delete', error);
      this.error(res, 'Failed to delete document');
    }
  }
}

module.exports = new DocumentationController();
