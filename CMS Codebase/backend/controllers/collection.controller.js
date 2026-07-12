const BaseController = require('./BaseController');
const CollectionRepository = require('../repositories/CollectionRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const ReportService = require('../services/ReportService');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Collection Controller
 * Handles personal collections, church collections, contributions, and collection statements
 */
class CollectionController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('CollectionController');
  }

  /**
   * Get user's personal collections
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMyCollections(req, res) {
    try {
      const userId = req.user.id;

      const collections = await CollectionRepository.getPersonalCollectionsByUserId(userId);

      return ResponseHandler.success(res, { collections });
    } catch (error) {
      this.logger.error('getMyCollections', error);
      return ResponseHandler.error(res, 'Failed to fetch collections');
    }
  }

  /**
   * Create a personal collection
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {number} req.body.amount - Collection amount
   * @param {string} req.body.purpose - Collection purpose
   * @param {string} req.body.fund - Fund type
   * @param {string} [req.body.date] - Collection date
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPersonalCollection(req, res) {
    try {
      const { amount, purpose, fund, date } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!amount || !purpose || !fund) {
        return ResponseHandler.validationError(res, [{
          field: 'general',
          message: 'amount, purpose, and fund are required'
        }]);
      }

      const collection = await CollectionRepository.createPersonalCollection({
        user_id: userId,
        amount,
        purpose,
        fund,
        date
      });

      return ResponseHandler.success(res, { collection }, 'Collection added successfully', 201);
    } catch (error) {
      this.logger.error('createPersonalCollection', error);
      return ResponseHandler.error(res, 'Failed to add collection');
    }
  }

  /**
   * Get user's collection statement
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.format] - Output format (txt, csv)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMyStatement(req, res) {
    try {
      const userId = req.user.id;
      const format = req.query.format || 'txt';

      const collections = await CollectionRepository.getPersonalCollectionsByUserId(userId);

      // Use ReportService for statement generation
      const userInfo = {
        id: userId,
        name: req.user.first_name + ' ' + req.user.last_name
      };

      let content;
      let contentType;
      let filename;

      if (format === 'csv') {
        content = ReportService.generateCollectionCSV(collections);
        contentType = 'text/csv';
        filename = ReportService.generateStatementFilename(userId, 'csv');
      } else {
        content = ReportService.generateCollectionStatement(collections, userInfo);
        contentType = 'text/plain';
        filename = ReportService.generateStatementFilename(userId, 'txt');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      this.logger.error('getMyStatement', error);
      return ResponseHandler.error(res, 'Failed to generate statement');
    }
  }

  /**
   * Create a new collection for an event
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.eventId - Event ID
   * @param {string} req.body.collectionType - Collection type
   * @param {number} req.body.targetAmount - Target amount
   * @param {string} req.body.description - Collection description
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createCollection(req, res) {
    try {
      const { event_id, title, description, target_amount, visibility } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!event_id || !title || !target_amount) {
        return ResponseHandler.validationError(res, [{
          field: 'general',
          message: 'event_id, title, and target_amount are required'
        }]);
      }

      // Check if event exists
      const eventCheck = await CollectionRepository.getEventById(event_id);

      if (!eventCheck) {
        return ResponseHandler.notFound(res, 'Event not found');
      }

      // Check if event already has a collection
      if (eventCheck.has_collection) {
        return ResponseHandler.error(res, 'Event already has a collection', 400);
      }

      // Create collection
      const collection = await CollectionRepository.createEventCollection({
        event_id,
        title,
        description,
        target_amount,
        visibility: visibility || 'department',
        created_by: userId
      });

      // Update event to mark it as having a collection
      await CollectionRepository.updateEventHasCollection(event_id);

      return ResponseHandler.success(res, { collection }, 'Collection created successfully', 201);
    } catch (error) {
      this.logger.error('createCollection', error);
      return ResponseHandler.error(res, 'Failed to create collection');
    }
  }

  /**
   * Get collection details with progress
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Collection ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCollection(req, res) {
    try {
      const { id } = req.params;

      // Use repository method that includes progress calculation
      const collection = await CollectionRepository.getEventCollectionWithProgress(id);

      if (!collection) {
        return ResponseHandler.notFound(res, 'Collection not found');
      }

      return ResponseHandler.success(res, { collection });
    } catch (error) {
      this.logger.error('getCollection', error);
      return ResponseHandler.error(res, 'Failed to fetch collection');
    }
  }

  /**
   * Update collection details
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Collection ID
   * @param {Object} req.body - Request body with collection fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateCollection(req, res) {
    try {
      const { id } = req.params;
      const { title, description, target_amount, visibility } = req.body;
      const userId = req.user.id;

      // Check if collection exists and user has permission
      const collectionCheck = await CollectionRepository.getEventCollectionById(id);

      if (!collectionCheck) {
        return ResponseHandler.notFound(res, 'Collection not found');
      }

      // Check if user is the creator or an admin
      const userRoles = req.user.roles || [];
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      if (collectionCheck.created_by !== userId && !isAdmin) {
        return ResponseHandler.forbidden(res, 'You do not have permission to update this collection');
      }

      // Update collection
      const collection = await CollectionRepository.updateEventCollection(id, {
        title,
        description,
        target_amount,
        visibility
      });

      return ResponseHandler.success(res, { collection }, 'Collection updated successfully');
    } catch (error) {
      this.logger.error('updateCollection', error);
      return ResponseHandler.error(res, 'Failed to update collection');
    }
  }

  /**
   * Add a contribution to a collection
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Collection ID
   * @param {Object} req.body - Request body
   * @param {number} req.body.amount - Contribution amount
   * @param {string} [req.body.note] - Contribution note
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addContribution(req, res) {
    try {
      const { id } = req.params;
      const { amount, payment_method, notes, is_anonymous } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!amount || !payment_method) {
        return ResponseHandler.validationError(res, [{
          field: 'general',
          message: 'amount and payment_method are required'
        }]);
      }

      // Check if collection exists and is active
      const collectionCheck = await CollectionRepository.getEventCollectionById(id);

      if (!collectionCheck) {
        return ResponseHandler.notFound(res, 'Collection not found');
      }

      if (collectionCheck.status !== 'active') {
        return ResponseHandler.error(res, 'Collection is not active', 400);
      }

      // Add contribution
      const contributorName = is_anonymous ? 'Anonymous' : null;
      const contributorId = is_anonymous ? null : userId;

      const contribution = await CollectionRepository.createContribution({
        collection_id: id,
        contributor_id: contributorId,
        contributor_name: contributorName,
        amount,
        payment_method,
        notes
      });

      // Update collection current amount
      await CollectionRepository.updateCollectionCurrentAmount(id, amount);

      // Check if target reached
      const updatedCollection = await CollectionRepository.getCollectionAmounts(id);

      if (updatedCollection.current_amount >= updatedCollection.target_amount) {
        await CollectionRepository.updateCollectionStatus(id, 'completed');
      }

      return ResponseHandler.success(res, { contribution }, 'Contribution added successfully', 201);
    } catch (error) {
      this.logger.error('addContribution', error);
      return ResponseHandler.error(res, 'Failed to add contribution');
    }
  }

  /**
   * Get all contributions for a collection
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Collection ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContributions(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const collection = await CollectionRepository.getEventCollectionById(id);

      if (!collection) {
        return ResponseHandler.notFound(res, 'Collection not found');
      }

      const contributions = await CollectionRepository.getContributions(id, limit, offset);
      const total = await CollectionRepository.countTotalContributions(id);

      return ResponseHandler.success(res, { 
        contributions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      this.logger.error('getContributions', error);
      return ResponseHandler.error(res, 'Failed to fetch contributions');
    }
  }

  /**
   * Delete a contribution (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Contribution ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteContribution(req, res) {
    try {
      const { id, contributionId } = req.params;
      const userId = req.user.id;

      // Check if user is admin
      const userRoles = req.user.roles || [];
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      if (!isAdmin) {
        return ResponseHandler.forbidden(res, 'Only admins can delete contributions');
      }

      const contribution = await CollectionRepository.getContributionById(contributionId, id);

      if (!contribution) {
        return ResponseHandler.notFound(res, 'Contribution not found');
      }

      const amount = contribution.amount;

      await CollectionRepository.deleteContribution(contributionId);
      await CollectionRepository.subtractFromCollectionCurrentAmount(id, amount);

      const collectionStatus = await CollectionRepository.getCollectionStatusAndAmounts(id);

      if (collectionStatus.status === 'completed' &&
          collectionStatus.current_amount < collectionStatus.target_amount) {
        await CollectionRepository.updateCollectionStatus(id, 'active');
      }

      return ResponseHandler.success(res, null, 'Contribution deleted successfully');
    } catch (error) {
      this.logger.error('deleteContribution', error);
      return ResponseHandler.error(res, 'Failed to delete contribution');
    }
  }

  /**
   * Update collection status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Collection ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateCollectionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      // Validate status
      if (!['active', 'completed', 'cancelled'].includes(status)) {
        return ResponseHandler.validationError(res, [{
          field: 'status',
          message: 'Invalid status. Must be active, completed, or cancelled'
        }]);
      }

      const collection = await CollectionRepository.getEventCollectionById(id);

      if (!collection) {
        return ResponseHandler.notFound(res, 'Collection not found');
      }

      const userRoles = req.user.roles || [];
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      if (collection.created_by !== userId && !isAdmin) {
        return ResponseHandler.forbidden(res, 'You do not have permission to update this collection');
      }

      const updated = await CollectionRepository.updateCollectionStatusWithTimestamp(id, status);

      return ResponseHandler.success(res, { collection: updated }, 'Collection status updated successfully');
    } catch (error) {
      this.logger.error('updateCollectionStatus', error);
      return ResponseHandler.error(res, 'Failed to update collection status');
    }
  }

  async getCollectionAnalytics(req, res) {
    try {
      const { id } = req.params;
      const analytics = await CollectionRepository.getCollectionAnalytics(id);
      return ResponseHandler.success(res, { analytics });
    } catch (error) {
      this.logger.error('getCollectionAnalytics', error);
      return ResponseHandler.error(res, 'Failed to fetch collection analytics');
    }
  }

  async closeCollection(req, res) {
    try {
      const { id } = req.params;
      const collection = await CollectionRepository.updateCollectionStatusWithTimestamp(id, 'closed');
      return ResponseHandler.success(res, { collection }, 'Collection closed successfully');
    } catch (error) {
      this.logger.error('closeCollection', error);
      return ResponseHandler.error(res, 'Failed to close collection');
    }
  }

  async reopenCollection(req, res) {
    try {
      const { id } = req.params;
      const collection = await CollectionRepository.updateCollectionStatusWithTimestamp(id, 'active');
      return ResponseHandler.success(res, { collection }, 'Collection reopened successfully');
    } catch (error) {
      this.logger.error('reopenCollection', error);
      return ResponseHandler.error(res, 'Failed to reopen collection');
    }
  }
}

module.exports = new CollectionController();
