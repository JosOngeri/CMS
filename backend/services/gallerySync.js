const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { pool } = require('../config/database');
const galleryCacheService = require('./galleryCacheService');
const logger = require('../config/logging');

/**
 * Gallery Sync Service (Phase 11)
 * Synchronizes church media from Telegram via MTProto
 * Enhanced with sync status tracking and Redis caching
 */
class GallerySync {
  constructor() {
    this.client = null;
    this.syncQueue = new Map();
  }

  async init(apiId, apiHash, sessionStr) {
    const session = new StringSession(sessionStr);
    this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });
    await this.client.connect();
    logger.info('Telegram MTProto client initialized');
  }

  async syncChannel(channelId, churchId) {
    if (!this.client) throw new Error('Telegram client not initialized');

    try {
      // Update sync status to syncing
      await this.updateChannelSyncStatus(channelId, 'syncing');

      const messages = await this.client.getMessages(channelId, {
        limit: 100,
      });

      let syncedCount = 0;
      let failedCount = 0;

      for (const msg of messages) {
        if (msg.media) {
          try {
            // Extract media info and save to DB
            const mediaInfo = this.extractMediaInfo(msg.media);
            
            // Insert photo with UUID
            const result = await pool.query(
              `INSERT INTO gallery_photos (id, church_id, telegram_msg_id, caption, telegram_file_id, telegram_file_unique_id, telegram_channel_id)
               VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
               ON CONFLICT (telegram_file_unique_id) 
               DO UPDATE SET caption = $3, telegram_channel_id = $6
               RETURNING id`,
              [churchId, msg.id, msg.message, mediaInfo.fileId, mediaInfo.fileUniqueId, channelId]
            );

            const photoId = result.rows[0].id;

            // Create sync status record
            await this.createSyncStatus(photoId, channelId, msg.id, mediaInfo.fileId, mediaInfo.fileUniqueId, 'completed');

            // Invalidate cache for this photo
            await galleryCacheService.invalidatePhoto(photoId);

            syncedCount++;
          } catch (error) {
            logger.error(`Failed to sync message ${msg.id}:`, error);
            failedCount++;
            
            // Create failed sync status
            await this.createSyncStatus(null, channelId, msg.id, null, null, 'failed', error.message);
          }
        }
      }

      // Update channel sync status
      await this.updateChannelSyncStatus(channelId, 'completed');

      // Invalidate album cache
      await galleryCacheService.invalidateAlbum(channelId);

      logger.info(`Sync completed for channel ${channelId}: ${syncedCount} synced, ${failedCount} failed`);
      return { success: true, syncedCount, failedCount, total: messages.length };
    } catch (error) {
      logger.error('Sync channel error:', error);
      await this.updateChannelSyncStatus(channelId, 'failed');
      throw error;
    }
  }

  /**
   * Extract media info from Telegram media object
   * @param {object} media - Telegram media object
   * @returns {object} Media info
   */
  extractMediaInfo(media) {
    return {
      fileId: media.photo?.id || media.document?.id,
      fileUniqueId: media.photo?.file_unique_id || media.document?.file_unique_id,
      size: media.photo?.size || media.document?.size,
      mimeType: media.photo?.mime_type || media.document?.mime_type
    };
  }

  /**
   * Create sync status record
   * @param {string} photoId - Photo ID
   * @param {string} channelId - Telegram channel ID
   * @param {number} msgId - Telegram message ID
   * @param {string} fileId - File ID
   * @param {string} fileUniqueId - File unique ID
   * @param {string} status - Sync status
   * @param {string} error - Error message
   */
  async createSyncStatus(photoId, channelId, msgId, fileId, fileUniqueId, status, error = null) {
    try {
      await pool.query(
        `INSERT INTO gallery_sync_status (photo_id, telegram_channel_id, telegram_msg_id, telegram_file_id, telegram_file_unique_id, sync_status, sync_error, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (telegram_file_unique_id) 
         DO UPDATE SET sync_status = $6, sync_error = $7, synced_at = $8`,
        [photoId, channelId, msgId, fileId, fileUniqueId, status, error, status === 'completed' ? 'CURRENT_TIMESTAMP' : null]
      );
    } catch (error) {
      logger.error('Failed to create sync status:', error);
    }
  }

  /**
   * Update channel sync status
   * @param {string} channelId - Channel ID
   * @param {string} status - Sync status
   */
  async updateChannelSyncStatus(channelId, status) {
    try {
      await pool.query(
        `UPDATE gallery_albums SET last_synced_at = CURRENT_TIMESTAMP WHERE telegram_channel_id = $1`,
        [channelId]
      );
    } catch (error) {
      logger.error('Failed to update channel sync status:', error);
    }
  }

  /**
   * Get sync status for channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<object>} Sync status
   */
  async getSyncStatus(channelId) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE sync_status = 'completed') as completed,
          COUNT(*) FILTER (WHERE sync_status = 'failed') as failed,
          COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
          COUNT(*) as total
         FROM gallery_sync_status
         WHERE telegram_channel_id = $1`,
        [channelId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      return null;
    }
  }

  /**
   * Retry failed syncs
   * @param {string} channelId - Channel ID
   * @returns {Promise<object>} Retry result
   */
  async retryFailedSyncs(channelId) {
    try {
      const failedRecords = await pool.query(
        `SELECT * FROM gallery_sync_status 
         WHERE telegram_channel_id = $1 AND sync_status = 'failed'
         LIMIT 50`,
        [channelId]
      );

      let retried = 0;
      let succeeded = 0;

      for (const record of failedRecords.rows) {
        try {
          // Update status to pending
          await pool.query(
            `UPDATE gallery_sync_status SET sync_status = 'pending', sync_error = NULL WHERE id = $1`,
            [record.id]
          );
          retried++;
        } catch (error) {
          logger.error(`Failed to retry sync for record ${record.id}:`, error);
        }
      }

      logger.info(`Retried ${retried} failed syncs for channel ${channelId}`);
      return { retried, succeeded };
    } catch (error) {
      logger.error('Failed to retry failed syncs:', error);
      return { retried: 0, succeeded: 0 };
    }
  }
}

module.exports = new GallerySync();
