const SnapshotService = require('../services/SnapshotService');
const ChurchRepository = require('../repositories/ChurchRepository');
const SnapshotRepository = require('../repositories/SnapshotRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('SnapshotJob');

class SnapshotJob {
  constructor() {
    this.snapshotService = SnapshotService;
    this.churchRepository = ChurchRepository;
    this.snapshotRepository = SnapshotRepository;
  }

  setServices(services) {
    if (services.snapshotService) {
      this.snapshotService = services.snapshotService;
    }
    if (services.churchRepository) {
      this.churchRepository = services.churchRepository;
    }
    if (services.snapshotRepository) {
      this.snapshotRepository = services.snapshotRepository;
    }
  }

  async runDailySnapshotJob() {
    try {
      logger.info('Starting daily snapshot job for all active churches');

      // Get all active churches
      const churches = await this.churchRepository.getActiveChurches();
      
      if (!churches || churches.length === 0) {
        logger.info('No active churches found for snapshot generation');
        return { success: true, processed: 0, failed: 0, total: 0 };
      }

      let processedCount = 0;
      let failedCount = 0;
      const results = [];

      // Process each church independently
      for (const church of churches) {
        try {
          logger.info(`Generating daily snapshot for church: ${church.name} (ID: ${church.id})`);
          
          // Generate snapshot for this church
          const snapshot = await this.snapshotService.generateDailySnapshot(
            church.id,
            null // Database connection would be determined by church context
          );

          processedCount++;
          results.push({
            church_id: church.id,
            church_name: church.name,
            success: true,
            snapshot_id: snapshot.id
          });

          logger.info(`Successfully generated snapshot for church: ${church.name}`);
        } catch (error) {
          failedCount++;
          results.push({
            church_id: church.id,
            church_name: church.name,
            success: false,
            error: error.message
          });

          logger.error(`Failed to generate snapshot for church ${church.name}:`, error);
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

      logger.info(`Daily snapshot job completed. Processed: ${processedCount}, Failed: ${failedCount}, Total: ${churches.length}`);
      return summary;
    } catch (error) {
      logger.error('Daily snapshot job failed:', error);
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
      logger.info('Starting snapshot cleanup job');

      // Get all active churches
      const churches = await this.churchRepository.getActiveChurches();
      
      if (!churches || churches.length === 0) {
        logger.info('No active churches found for cleanup');
        return { success: true, processed: 0, total: 0 };
      }

      let totalDeleted = 0;

      for (const church of churches) {
        try {
          // Delete snapshots older than 30 days
          const deleted = await this.snapshotRepository.deleteOldSnapshots(church.id, 30);
          totalDeleted += deleted.length;
          
          logger.info(`Deleted ${deleted.length} old snapshots for church: ${church.name}`);
        } catch (error) {
          logger.error(`Failed to cleanup snapshots for church ${church.name}:`, error);
        }
      }

      logger.info(`Snapshot cleanup job completed. Total deleted: ${totalDeleted}`);
      return {
        success: true,
        total_deleted: totalDeleted
      };
    } catch (error) {
      logger.error('Snapshot cleanup job failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SnapshotJob();
