const SnapshotRepository = require('../repositories/SnapshotRepository');
const { pool } = require('../config/database');
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
    const db = databaseConnection || pool;
    try {
      const snapshotData = {
        metadata: {
          church_id: churchId,
          snapshot_timestamp: new Date().toISOString(),
          snapshot_version: '1.0'
        },
        contacts: await this.queryContacts(churchId, db),
        groups: await this.queryGroups(churchId, db),
        messages: await this.queryMessages(churchId, db),
        templates: await this.queryTemplates(churchId, db)
      };

      return snapshotData;
    } catch (error) {
      logger.error(`Failed to collect church data for ${churchId}:`, error);
      throw error;
    }
  }

  // All queries are church-scoped; a missing table logs a warning and yields
  // an empty list rather than aborting the whole snapshot (schema drift).
  async safeQuery(db, sql, params, label) {
    try {
      const result = await db.query(sql, params);
      return result.rows;
    } catch (error) {
      if (error.code === '42P01' || error.code === '42703') {
        logger.warn(`Snapshot query skipped — ${label} source missing: ${error.message}`);
        return [];
      }
      throw error;
    }
  }

  async queryContacts(churchId, db) {
    return this.safeQuery(db,
      `SELECT id, name, phone, email, group_id, source, status, metadata, created_by AS user_id, created_at, updated_at
       FROM sms_contacts
       WHERE church_id = $1
       ORDER BY created_at DESC`,
      [churchId], 'contacts');
  }

  async queryGroups(churchId, db) {
    return this.safeQuery(db,
      `SELECT id, name, description, source, contact_count, created_at, updated_at
       FROM sms_groups
       WHERE church_id = $1
       ORDER BY created_at DESC`,
      [churchId], 'groups');
  }

  async queryMessages(churchId, db) {
    // sms_logs has no church_id column in older schemas — scope through the
    // sender's user row so only this church's messages are snapshotted.
    return this.safeQuery(db,
      `SELECT sl.id, sl.message, sl.status, sl.created_at, sl.sent_by AS user_id
       FROM sms_logs sl
       JOIN users u ON sl.sent_by = u.id
       WHERE u.church_id = $1
       ORDER BY sl.created_at DESC
       LIMIT 5000`,
      [churchId], 'messages');
  }

  async queryTemplates(churchId, db) {
    return this.safeQuery(db,
      `SELECT id, name, content, category, is_favorite, created_by AS user_id, created_at, updated_at
       FROM message_templates
       WHERE church_id = $1
       ORDER BY created_at DESC`,
      [churchId], 'templates');
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
