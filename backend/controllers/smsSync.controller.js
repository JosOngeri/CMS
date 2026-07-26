const SnapshotService = require('../services/SnapshotService');
const RollingUpdateService = require('../services/RollingUpdateService');
const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('SmsSyncController');

class SmsSyncController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SmsSyncController');
    this.snapshotService = SnapshotService;
    this.rollingUpdateService = RollingUpdateService;
  }

  setServices(services) {
    if (services.snapshotService) {
      this.snapshotService = services.snapshotService;
    }
    if (services.rollingUpdateService) {
      this.rollingUpdateService = services.rollingUpdateService;
    }
  }

  async downloadSnapshot(req, res) {
    try {
      if (!req.user) {
        return ResponseHandler.error(res, 'Authentication required', 401);
      }

      const churchId = req.user.churchId;
      const userId = req.user.id;

      if (!churchId) {
        return ResponseHandler.error(res, 'No church associated with user', 400);
      }

      // Verify token has SMS scope
      if (!req.user.scope || !req.user.scope.includes('sms')) {
        return ResponseHandler.error(res, 'Invalid token scope. SMS scope required.', 403);
      }

      const { since_date } = req.query;

      // Get snapshot for the church
      let snapshot;
      if (since_date) {
        // For delta requests, we would need to implement delta generation
        // For now, return the latest snapshot
        snapshot = await this.snapshotService.getLatestSnapshot(churchId);
      } else {
        snapshot = await this.snapshotService.getLatestSnapshot(churchId);
      }

      if (!snapshot) {
        return ResponseHandler.error(res, 'No snapshot found for this church', 404);
      }

      // Filter snapshot data by user_id for user-specific data
      const userFilteredData = this.filterDataByUser(snapshot.data, userId);

      // Return compressed data with appropriate headers
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      return ResponseHandler.success(res, {
        compressed_data: snapshot.compressed_data,
        data_hash: snapshot.data_hash,
        snapshot_date: snapshot.snapshot_date,
        file_size: snapshot.file_size,
        data: userFilteredData,
        record_counts: {
          contacts: userFilteredData?.contacts?.length || 0,
          groups: userFilteredData?.groups?.length || 0,
          messages: userFilteredData?.messages?.length || 0,
          templates: userFilteredData?.templates?.length || 0
        }
      }, 'Snapshot downloaded successfully');
    } catch (error) {
      this.logger.error('downloadSnapshot', error);
      return ResponseHandler.error(res, 'Failed to download snapshot');
    }
  }

  filterDataByUser(data, userId) {
    try {
      if (!data) return {};

      // Filter contacts by user_id
      const filteredContacts = data.contacts?.filter(contact => 
        contact.user_id === userId || !contact.user_id
      ) || [];

      // Filter groups by user_id
      const filteredGroups = data.groups?.filter(group => 
        group.user_id === userId || !group.user_id
      ) || [];

      // Filter messages by user_id
      const filteredMessages = data.messages?.filter(message => 
        message.user_id === userId || !message.user_id
      ) || [];

      // Filter templates by user_id
      const filteredTemplates = data.templates?.filter(template => 
        template.user_id === userId || !template.user_id
      ) || [];

      return {
        contacts: filteredContacts,
        groups: filteredGroups,
        messages: filteredMessages,
        templates: filteredTemplates
      };
    } catch (error) {
      this.logger.error('Error filtering data by user:', error);
      return data; // Return original data if filtering fails
    }
  }

  async getRollingUpdates(req, res) {
    try {
      if (!req.user) {
        return ResponseHandler.error(res, 'Authentication required', 401);
      }

      const churchId = req.user.churchId;
      const userId = req.user.id;

      if (!churchId) {
        return ResponseHandler.error(res, 'No church associated with user', 400);
      }

      // Verify token has SMS scope
      if (!req.user.scope || !req.user.scope.includes('sms')) {
        return ResponseHandler.error(res, 'Invalid token scope. SMS scope required.', 403);
      }

      const { since_sequence, limit } = req.query;

      // Parse query parameters
      const sinceSequence = since_sequence ? parseInt(since_sequence) : null;
      const limitParam = limit ? parseInt(limit) : 100;
      const maxLimit = 1000;
      const actualLimit = Math.min(limitParam, maxLimit);

      // Get rolling updates for the church
      const result = await this.rollingUpdateService.getRollingUpdates(churchId, sinceSequence, actualLimit);

      // Filter updates by user_id
      const userFilteredUpdates = result.updates.filter(update => 
        update.user_id === userId || !update.user_id
      );

      return ResponseHandler.success(res, {
        updates: userFilteredUpdates,
        last_sequence_number: result.last_sequence_number,
        count: userFilteredUpdates.length
      }, 'Rolling updates retrieved successfully');
    } catch (error) {
      this.logger.error('getRollingUpdates', error);
      return ResponseHandler.error(res, 'Failed to retrieve rolling updates');
    }
  }
}

module.exports = new SmsSyncController();
