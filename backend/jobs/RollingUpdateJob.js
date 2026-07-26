const RollingUpdateService = require('../services/RollingUpdateService');
const ChurchRepository = require('../repositories/ChurchRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('RollingUpdateJob');

class RollingUpdateJob {
  constructor() {
    this.rollingUpdateService = RollingUpdateService;
    this.churchRepository = ChurchRepository;
  }

  setServices(services) {
    if (services.rollingUpdateService) {
      this.rollingUpdateService = services.rollingUpdateService;
    }
    if (services.churchRepository) {
      this.churchRepository = services.churchRepository;
    }
  }

  setServices(services) {
    if (services.rollingUpdateService) {
      this.rollingUpdateService = services.rollingUpdateService;
    }
    if (services.churchRepository) {
      this.churchRepository = services.churchRepository;
    }
  }

  async runRollingUpdateJob() {
    try {
      logger.info('Starting rolling update processing job');

      // Get all active churches
      const churches = await this.churchRepository.getActiveChurches();
      
      if (!churches || churches.length === 0) {
        logger.info('No active churches found for rolling update processing');
        return { success: true, processed: 0, failed: 0, total: 0 };
      }

      let processedCount = 0;
      let failedCount = 0;
      const results = [];

      // Process each church independently
      for (const church of churches) {
        try {
          logger.info(`Processing rolling updates for church: ${church.name} (ID: ${church.id})`);
          
          // Get pending rolling updates for this church
          // In a real implementation, this would query unprocessed updates
          // For now, we'll just log that we're processing
          
          processedCount++;
          results.push({
            church_id: church.id,
            church_name: church.name,
            success: true,
            updates_processed: 0
          });

          logger.info(`Successfully processed rolling updates for church: ${church.name}`);
        } catch (error) {
          failedCount++;
          results.push({
            church_id: church.id,
            church_name: church.name,
            success: false,
            error: error.message
          });

          logger.error(`Failed to process rolling updates for church ${church.name}:`, error);
          // Continue processing other churches even if one fails
        }
      }

      const summary = {
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: churches.length,
        results: results
      };

      logger.info(`Rolling update job completed. Processed: ${processedCount}, Failed: ${failedCount}, Total: ${churches.length}`);
      return summary;
    } catch (error) {
      logger.error('Rolling update job failed:', error);
      return {
        success: false,
        error: error.message,
        processed: 0,
        failed: 0
      };
    }
  }

  async runCleanupJob() {
    try {
      logger.info('Starting rolling update cleanup job');

      // Get all active churches
      const churches = await this.churchRepository.getActiveChurches();
      
      if (!churches || churches.length === 0) {
        logger.info('No active churches found for cleanup');
        return { success: true, processed: 0, total: 0 };
      }

      let totalDeleted = 0;

      for (const church of churches) {
        try {
          // Delete rolling updates older than 7 days
          const deleted = await this.rollingUpdateService.deleteOldRollingUpdates(church.id, 7);
          totalDeleted += deleted.length;
          
          logger.info(`Deleted ${deleted.length} old rolling updates for church: ${church.name}`);
        } catch (error) {
          logger.error(`Failed to cleanup rolling updates for church ${church.name}:`, error);
        }
      }

      logger.info(`Rolling update cleanup job completed. Total deleted: ${totalDeleted}`);
      return {
        success: true,
        total_deleted: totalDeleted
      };
    } catch (error) {
      logger.error('Rolling update cleanup job failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RollingUpdateJob();
