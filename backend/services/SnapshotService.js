const SnapshotRepository = require('../repositories/SnapshotRepository');
const { createLogger } = require('../helpers/controllerLogger');
const crypto = require('crypto');
const zlib = require('zlib');

const logger = createLogger('SnapshotService');

class SnapshotService {
  constructor() {
    this.snapshotRepository = SnapshotRepository;
  }

  setSnapshotRepository(repository) {
    this.snapshotRepository = repository;
  }

  async generateDailySnapshot(churchId, databaseConnection) {
    try {
      const snapshotDate = new Date().toISOString().split('T')[0];

      // Check if snapshot already exists for this church and date
      const existingSnapshot = await this.snapshotRepository.findByChurchAndDate(churchId, snapshotDate);
      if (existingSnapshot) {
        logger.info(`Snapshot already exists for church ${churchId} on ${snapshotDate}`);
        return existingSnapshot;
      }

      // Query all data for the church
      const snapshotData = await this.collectChurchData(churchId, databaseConnection);

      // Convert to JSON
      const jsonData = JSON.stringify(snapshotData);

      // Generate data hash
      const dataHash = crypto.createHash('sha256').update(jsonData).digest('hex');

      // Compress data using gzip
      const compressedData = await this.compressData(jsonData);

      // Calculate file size
      const fileSize = Buffer.byteLength(compressedData);

      // Create snapshot record
      const snapshot = await this.snapshotRepository.createSnapshot({
        church_id: churchId,
        snapshot_date: snapshotDate,
        data_hash: dataHash,
        compressed_data: compressedData,
        file_size: fileSize
      });

      logger.info(`Generated daily snapshot for church ${churchId} on ${snapshotDate}`);
      return snapshot;
    } catch (error) {
      logger.error(`Failed to generate daily snapshot for church ${churchId}:`, error);
      throw new Error(`Snapshot generation failed for church ${churchId}: ${error.message}`);
    }
  }

  async collectChurchData(churchId, databaseConnection) {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would query actual data from the church's database
      // For now, we'll return a sample structure
      
      const snapshotData = {
        metadata: {
          church_id: churchId,
          snapshot_timestamp: new Date().toISOString(),
          snapshot_version: '1.0'
        },
        contacts: await this.queryContacts(churchId, databaseConnection),
        groups: await this.queryGroups(churchId, databaseConnection),
        messages: await this.queryMessages(churchId, databaseConnection),
        templates: await this.queryTemplates(churchId, databaseConnection)
      };

      return snapshotData;
    } catch (error) {
      logger.error(`Failed to collect church data for ${churchId}:`, error);
      throw error;
    }
  }

  async queryContacts(churchId, databaseConnection) {
    // Placeholder implementation - query actual contacts from church database
    return [];
  }

  async queryGroups(churchId, databaseConnection) {
    // Placeholder implementation - query actual groups from church database
    return [];
  }

  async queryMessages(churchId, databaseConnection) {
    // Placeholder implementation - query actual messages from church database
    return [];
  }

  async queryTemplates(churchId, databaseConnection) {
    // Placeholder implementation - query actual templates from church database
    return [];
  }

  async compressData(data) {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) {
          reject(err);
        } else {
          resolve(compressed);
        }
      });
    });
  }

  async decompressData(compressedData) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressedData, (err, decompressed) => {
        if (err) {
          reject(err);
        } else {
          resolve(decompressed.toString());
        }
      });
    });
  }

  async getSnapshot(churchId, snapshotDate) {
    try {
      const snapshot = await this.snapshotRepository.findByChurchAndDate(churchId, snapshotDate);
      if (!snapshot) {
        return null;
      }

      // Decompress data
      const jsonData = await this.decompressData(snapshot.compressed_data);
      const data = JSON.parse(jsonData);

      return {
        ...snapshot,
        data: data
      };
    } catch (error) {
      logger.error(`Failed to get snapshot for church ${churchId} on ${snapshotDate}:`, error);
      throw error;
    }
  }

  async getLatestSnapshot(churchId) {
    try {
      const snapshot = await this.snapshotRepository.getLatestSnapshot(churchId);
      if (!snapshot) {
        return null;
      }

      // Decompress data
      const jsonData = await this.decompressData(snapshot.compressed_data);
      const data = JSON.parse(jsonData);

      return {
        ...snapshot,
        data: data
      };
    } catch (error) {
      logger.error(`Failed to get latest snapshot for church ${churchId}:`, error);
      throw error;
    }
  }

  async verifySnapshotIntegrity(snapshot) {
    try {
      const jsonData = await this.decompressData(snapshot.compressed_data);
      const computedHash = crypto.createHash('sha256').update(jsonData).digest('hex');
      
      return computedHash === snapshot.data_hash;
    } catch (error) {
      logger.error(`Failed to verify snapshot integrity:`, error);
      return false;
    }
  }
}

module.exports = new SnapshotService();
