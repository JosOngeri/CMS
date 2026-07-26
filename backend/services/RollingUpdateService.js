const SnapshotRepository = require('../repositories/SnapshotRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('RollingUpdateService');

class RollingUpdateService {
  constructor() {
    this.snapshotRepository = SnapshotRepository;
  }

  setSnapshotRepository(repository) {
    this.snapshotRepository = repository;
  }

  setSnapshotRepository(repository) {
    this.snapshotRepository = repository;
  }

  async captureUpdate(churchId, operation, entityType, entityId, entityData = null) {
    try {
      // Validate operation type
      const validOperations = ['create', 'update', 'delete'];
      if (!validOperations.includes(operation)) {
        throw new Error(`Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`);
      }

      // Validate entity type
      const validEntityTypes = ['contact', 'group', 'message', 'template'];
      if (!validEntityTypes.includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}. Must be one of: ${validEntityTypes.join(', ')}`);
      }

      // Get next sequence number for this church
      const sequenceNumber = await this.snapshotRepository.getNextSequenceNumber(churchId);

      // Prepare data based on operation type
      let data = null;
      if (operation === 'create' || operation === 'update') {
        if (!entityData) {
          throw new Error(`Entity data is required for ${operation} operations`);
        }
        data = entityData;
      }

      // Create rolling update record
      const rollingUpdate = await this.snapshotRepository.createRollingUpdate({
        church_id: churchId,
        update_type: entityType,
        entity_type: entityType,
        entity_id: entityId,
        operation: operation,
        data: data,
        sequence_number: sequenceNumber
      });

      logger.info(`Captured rolling update for church ${churchId}: ${operation} ${entityType} (sequence: ${sequenceNumber})`);
      return rollingUpdate;
    } catch (error) {
      logger.error(`Failed to capture rolling update for church ${churchId}:`, error);
      throw new Error(`Rolling update capture failed for church ${churchId}: ${error.message}`);
    }
  }

  async captureContactCreate(churchId, contactData) {
    return this.captureUpdate(churchId, 'create', 'contact', contactData.id, contactData);
  }

  async captureContactUpdate(churchId, contactId, contactData) {
    return this.captureUpdate(churchId, 'update', 'contact', contactId, contactData);
  }

  async captureContactDelete(churchId, contactId) {
    return this.captureUpdate(churchId, 'delete', 'contact', contactId, null);
  }

  async captureGroupCreate(churchId, groupData) {
    return this.captureUpdate(churchId, 'create', 'group', groupData.id, groupData);
  }

  async captureGroupUpdate(churchId, groupId, groupData) {
    return this.captureUpdate(churchId, 'update', 'group', groupId, groupData);
  }

  async captureGroupDelete(churchId, groupId) {
    return this.captureUpdate(churchId, 'delete', 'group', groupId, null);
  }

  async captureMessageCreate(churchId, messageData) {
    return this.captureUpdate(churchId, 'create', 'message', messageData.id, messageData);
  }

  async captureMessageUpdate(churchId, messageId, messageData) {
    return this.captureUpdate(churchId, 'update', 'message', messageId, messageData);
  }

  async captureMessageDelete(churchId, messageId) {
    return this.captureUpdate(churchId, 'delete', 'message', messageId, null);
  }

  async captureTemplateCreate(churchId, templateData) {
    return this.captureUpdate(churchId, 'create', 'template', templateData.id, templateData);
  }

  async captureTemplateUpdate(churchId, templateId, templateData) {
    return this.captureUpdate(churchId, 'update', 'template', templateId, templateData);
  }

  async captureTemplateDelete(churchId, templateId) {
    return this.captureUpdate(churchId, 'delete', 'template', templateId, null);
  }

  async getRollingUpdates(churchId, sinceSequence = null, limit = 100) {
    try {
      const updates = await this.snapshotRepository.getRollingUpdates(churchId, sinceSequence, limit);
      
      // Get the last sequence number for pagination
      const lastSequence = updates.length > 0 
        ? updates[updates.length - 1].sequence_number 
        : sinceSequence || 0;

      return {
        updates: updates,
        last_sequence_number: lastSequence,
        count: updates.length
      };
    } catch (error) {
      logger.error(`Failed to get rolling updates for church ${churchId}:`, error);
      throw error;
    }
  }

  async deleteOldRollingUpdates(churchId, daysToKeep = 7) {
    try {
      const deleted = await this.snapshotRepository.deleteOldRollingUpdates(churchId, daysToKeep);
      logger.info(`Deleted ${deleted.length} old rolling updates for church ${churchId}`);
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete old rolling updates for church ${churchId}:`, error);
      throw error;
    }
  }
}

module.exports = new RollingUpdateService();
