const BaseController = require('./BaseController');
const CollectionRepository = require('../repositories/CollectionRepository');
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

      res.json({
        success: true,
        data: {
          collections: collections
        }
      });
    } catch (error) {
      this.logger.error('getMyCollections', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch collections',
        details: error.message
      });
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
        return res.status(400).json({
          success: false,
          error: 'amount, purpose, and fund are required'
        });
      }

      const collection = await CollectionRepository.createPersonalCollection({
        user_id: userId,
        amount,
        purpose,
        fund,
        date
      });

      res.status(201).json({
        success: true,
        data: collection,
        message: 'Collection added successfully'
      });
    } catch (error) {
      this.logger.error('createPersonalCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add collection',
        details: error.message
      });
    }
  }

  /**
   * Get user's collection statement
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMyStatement(req, res) {
    try {
      const userId = req.user.id;

      // For now, return a simple text response
      // In production, this would generate a PDF
      const collections = await CollectionRepository.getPersonalCollectionsByUserId(userId);

      const total = collections.reduce((sum, row) => sum + parseFloat(row.amount), 0);

      let statement = `COLLECTION STATEMENT\n`;
      statement += `Generated: ${new Date().toLocaleString()}\n`;
      statement += `User ID: ${userId}\n\n`;
      statement += `SUMMARY\n`;
      statement += `Total Collections: ${collections.length}\n`;
      statement += `Total Amount: KES ${total.toLocaleString()}\n\n`;
      statement += `DETAILS\n`;
      statement += `${'Date'.padEnd(20)}${'Purpose'.padEnd(20)}${'Fund'.padEnd(15)}${'Amount'.padEnd(15)}\n`;
      statement += `${'='.repeat(70)}\n`;

      collections.forEach(row => {
        statement += `${row.date.padEnd(20)}${row.purpose.padEnd(20)}${row.fund.padEnd(15)}${'KES ' + parseFloat(row.amount).toLocaleString().padEnd(10)}\n`;
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=statement_${userId}.txt`);
      res.send(statement);
    } catch (error) {
      this.logger.error('getMyStatement', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate statement',
        details: error.message
      });
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
        return res.status(400).json({
          success: false,
          error: 'event_id, title, and target_amount are required'
        });
      }

      // Check if event exists
      const eventCheck = await CollectionRepository.getEventById(event_id);

      if (!eventCheck) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      // Check if event already has a collection
      if (eventCheck.has_collection) {
        return res.status(400).json({
          success: false,
          error: 'Event already has a collection'
        });
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

      res.status(201).json({
        success: true,
        data: collection,
        message: 'Collection created successfully'
      });
    } catch (error) {
      this.logger.error('createCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create collection',
        details: error.message
      });
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

      const collection = await CollectionRepository.getEventCollectionWithDetails(id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Calculate progress percentage
      const progress = collection.target_amount > 0
        ? (collection.current_amount / collection.target_amount) * 100
        : 0;

      // Get contribution count
      const contributionCount = await CollectionRepository.countContributions(id);

      res.json({
        success: true,
        data: {
          ...collection,
          progress: Math.min(progress, 100).toFixed(2),
          contribution_count: contributionCount
        }
      });
    } catch (error) {
      this.logger.error('getCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch collection',
        details: error.message
      });
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
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Check if user is the creator or an admin
      const userRoles = req.user.roles || [];
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      if (collectionCheck.created_by !== userId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this collection'
        });
      }

      // Update collection
      const collection = await CollectionRepository.updateEventCollection(id, {
        title,
        description,
        target_amount,
        visibility
      });

      res.json({
        success: true,
        data: collection,
        message: 'Collection updated successfully'
      });
    } catch (error) {
      this.logger.error('updateCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update collection',
        details: error.message
      });
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
        return res.status(400).json({
          success: false,
          error: 'amount and payment_method are required'
        });
      }

      // Check if collection exists and is active
      const collectionCheck = await CollectionRepository.getEventCollectionById(id);

      if (!collectionCheck) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      if (collectionCheck.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Collection is not active'
        });
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

      res.status(201).json({
        success: true,
        data: contribution,
        message: 'Contribution added successfully'
      });
    } catch (error) {
      this.logger.error('addContribution', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add contribution',
        details: error.message
      });
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
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      const contributions = await CollectionRepository.getContributions(id, limit, offset);
      const total = await CollectionRepository.countTotalContributions(id);

      res.json({
        success: true,
        data: contributions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      this.logger.error('getContributions', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contributions',
        details: error.message
      });
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
        return res.status(403).json({
          success: false,
          error: 'Only admins can delete contributions'
        });
      }

      const contribution = await CollectionRepository.getContributionById(contributionId, id);

      if (!contribution) {
        return res.status(404).json({
          success: false,
          error: 'Contribution not found'
        });
      }

      const amount = contribution.amount;

      await CollectionRepository.deleteContribution(contributionId);
      await CollectionRepository.subtractFromCollectionCurrentAmount(id, amount);

      const collectionStatus = await CollectionRepository.getCollectionStatusAndAmounts(id);

      if (collectionStatus.status === 'completed' &&
          collectionStatus.current_amount < collectionStatus.target_amount) {
        await CollectionRepository.updateCollectionStatus(id, 'active');
      }

      res.json({
        success: true,
        message: 'Contribution deleted successfully'
      });
    } catch (error) {
      this.logger.error('deleteContribution', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete contribution',
        details: error.message
      });
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
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be active, completed, or cancelled'
        });
      }

      const collection = await CollectionRepository.getEventCollectionById(id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      const userRoles = req.user.roles || [];
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      if (collection.created_by !== userId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this collection'
        });
      }

      const updated = await CollectionRepository.updateCollectionStatusWithTimestamp(id, status);

      res.json({
        success: true,
        data: updated,
        message: 'Collection status updated successfully'
      });
    } catch (error) {
      this.logger.error('updateCollectionStatus', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update collection status',
        details: error.message
      });
    }
  }

  async getCollectionAnalytics(req, res) {
    try {
      const { id } = req.params;
      const analytics = await CollectionRepository.getCollectionAnalytics(id);
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getCollectionAnalytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch collection analytics',
        details: error.message
      });
    }
  }

  async closeCollection(req, res) {
    try {
      const { id } = req.params;
      const collection = await CollectionRepository.updateCollectionStatusWithTimestamp(id, 'closed');
      res.json({
        success: true,
        data: collection,
        message: 'Collection closed successfully'
      });
    } catch (error) {
      this.logger.error('closeCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close collection',
        details: error.message
      });
    }
  }

  async reopenCollection(req, res) {
    try {
      const { id } = req.params;
      const collection = await CollectionRepository.updateCollectionStatusWithTimestamp(id, 'active');
      res.json({
        success: true,
        data: collection,
        message: 'Collection reopened successfully'
      });
    } catch (error) {
      this.logger.error('reopenCollection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reopen collection',
        details: error.message
      });
    }
  }
}

module.exports = new CollectionController();
