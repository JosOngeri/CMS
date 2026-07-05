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
      res.json({ success: true, documents: result });
    } catch (error) {
      this.logger.error('getAll', error);
      res.status(500).json({ success: false, error: 'Failed to fetch documentation' });
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
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, document: result });
    } catch (error) {
      this.logger.error('getById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch document' });
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
      res.json({ success: true, document: result });
    } catch (error) {
      this.logger.error('create', error);
      res.status(500).json({ success: false, error: 'Failed to create document' });
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
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, document: result });
    } catch (error) {
      this.logger.error('update', error);
      res.status(500).json({ success: false, error: 'Failed to update document' });
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
      res.json({ success: true });
    } catch (error) {
      this.logger.error('delete', error);
      res.status(500).json({ success: false, error: 'Failed to delete document' });
    }
  }
}

module.exports = new DocumentationController();
