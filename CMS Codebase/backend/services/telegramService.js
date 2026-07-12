const { Telegram } = require('telegram');
const { pool } = require('../config/database');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('telegramService');

class TelegramService {
  constructor() {
    this.client = null;
    this.settings = null;
  }

  async initialize() {
    try {
      // Get settings from database
      const result = await pool.query('SELECT * FROM telegram_settings WHERE id = 1');
      if (result.rows.length > 0) {
        this.settings = result.rows[0];
        if (this.settings.bot_token) {
          // Initialize Telegram client
          this.client = new Telegram(this.settings.bot_token);
        }
      }
    } catch (error) {
      logger.error('initialize', error);
    }
  }

  async testChannelConnection(channelId) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      // Test connection by trying to get channel info
      const channel = await this.client.getChat(channelId);
      return !!channel;
    } catch (error) {
      logger.error('testChannelConnection', error);
      return false;
    }
  }

  async postMessage(channelId, text, parseMode = 'HTML', disableNotification = false) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      // Handle large messages with pagination
      const MAX_MESSAGE_LENGTH = 4096;
      if (text.length > MAX_MESSAGE_LENGTH) {
        const messages = this.splitMessage(text, MAX_MESSAGE_LENGTH);
        const results = [];

        for (let i = 0; i < messages.length; i++) {
          const result = await this.client.sendMessage(channelId, {
            text: messages[i],
            parse_mode: parseMode,
            disable_notification: disableNotification,
          });
          results.push(result);

          // Add delay between messages to avoid rate limiting
          if (i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        return { success: true, messageCount: messages.length, results };
      }

      const result = await this.client.sendMessage(channelId, {
        text,
        parse_mode: parseMode,
        disable_notification: disableNotification,
      });

      return result;
    } catch (error) {
      logger.error('postMessage', error);
      throw error;
    }
  }

  splitMessage(text, maxLength) {
    const messages = [];
    let currentMessage = '';

    // Split by newlines first to preserve formatting
    const lines = text.split('\n');

    for (const line of lines) {
      if (currentMessage.length + line.length + 1 > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage);
          currentMessage = '';
        }

        // If single line is too long, split it
        if (line.length > maxLength) {
          const chunks = line.match(new RegExp(`.{1,${maxLength}}`, 'g'));
          messages.push(...chunks);
        } else {
          currentMessage = line;
        }
      } else {
        currentMessage += (currentMessage ? '\n' : '') + line;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage);
    }

    return messages;
  }

  async uploadPhoto(channelId, fileUrl, caption = null) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      const result = await this.client.sendPhoto(channelId, {
        photo: fileUrl,
        caption,
      });

      return result;
    } catch (error) {
      logger.error('uploadPhoto', error);
      throw error;
    }
  }

  async fetchChannelHistory(channelId, limit = 100) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      const result = await this.client.getHistory(channelId, { limit });
      return result || [];
    } catch (error) {
      logger.error('fetchChannelHistory', error);
      throw error;
    }
  }

  async processWebhookUpdate(update) {
    try {
      if (!update) return;

      // Handle different update types
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.edited_message) {
        await this.handleEditedMessage(update.edited_message);
      } else if (update.channel_post) {
        await this.handleChannelPost(update.channel_post);
      } else if (update.edited_channel_post) {
        await this.handleEditedChannelPost(update.edited_channel_post);
      } else if (update.deleted_channel_post) {
        await this.handleDeletedChannelPost(update.deleted_channel_post);
      }
    } catch (error) {
      logger.error('processWebhookUpdate', error);
    }
  }

  async handleMessage(message) {
    // Handle direct messages to bot
    logger.info('handleMessage', 'Received message:', message);
  }

  async handleEditedMessage(message) {
    // Handle edited messages
    logger.info('handleEditedMessage', 'Received edited message:', message);
  }

  async handleChannelPost(post) {
    try {
      // Find channel by chat ID
      const channelResult = await pool.query(
        'SELECT id FROM telegram_channels WHERE channel_id = $1',
        [post.chat.id]
      );

      if (channelResult.rows.length === 0) {
        return; // Channel not in our system
      }

      const channelId = channelResult.rows[0].id;

      // Store post
      await pool.query(
        `INSERT INTO telegram_channel_posts (channel_id, message_id, message_text, post_date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (channel_id, message_id) DO UPDATE SET
           message_text = EXCLUDED.message_text,
           updated_at = CURRENT_TIMESTAMP`,
        [channelId, post.message_id, post.text || null, post.date || null]
      );

      // Handle media attachments
      if (post.photo) {
        await this.handleMediaAttachment(channelId, post.message_id, post.photo);
      }

      // Check if auto-sync to announcements is enabled
      const channel = await pool.query(
        'SELECT auto_sync_to_announcements FROM telegram_channels WHERE id = $1',
        [channelId]
      );

      if (channel.rows[0].auto_sync_to_announcements) {
        await this.syncToAnnouncements(channelId, post.message_id);
      }
    } catch (error) {
      logger.error('handleChannelPost', error);
    }
  }

  async handleEditedChannelPost(post) {
    try {
      // Find channel by chat ID
      const channelResult = await pool.query(
        'SELECT id FROM telegram_channels WHERE channel_id = $1',
        [post.chat.id]
      );

      if (channelResult.rows.length === 0) {
        return;
      }

      const channelId = channelResult.rows[0].id;

      // Update post
      await pool.query(
        `UPDATE telegram_channel_posts
         SET message_text = $1,
             is_edited = true,
             edit_date = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE channel_id = $3 AND message_id = $4`,
        [post.text || null, post.edit_date || null, channelId, post.message_id]
      );
    } catch (error) {
      logger.error('handleEditedChannelPost', error);
    }
  }

  async handleDeletedChannelPost(post) {
    try {
      // Find channel by chat ID
      const channelResult = await pool.query(
        'SELECT id FROM telegram_channels WHERE channel_id = $1',
        [post.chat.id]
      );

      if (channelResult.rows.length === 0) {
        return;
      }

      const channelId = channelResult.rows[0].id;

      // Mark post as deleted (soft delete)
      await pool.query(
        `UPDATE telegram_channel_posts
         SET is_deleted = true,
             deleted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE channel_id = $1 AND message_id = $2`,
        [channelId, post.message_id]
      );

      // If synced to announcement, consider unpublishing or marking as deleted
      const postResult = await pool.query(
        'SELECT announcement_id FROM telegram_channel_posts WHERE channel_id = $1 AND message_id = $2',
        [channelId, post.message_id]
      );

      if (postResult.rows.length > 0 && postResult.rows[0].announcement_id) {
        await pool.query(
          'UPDATE announcements SET is_published = false WHERE id = $1',
          [postResult.rows[0].announcement_id]
        );
      }
    } catch (error) {
      logger.error('handleDeletedChannelPost', error);
    }
  }

  async handleMediaAttachment(channelId, messageId, media) {
    try {
      // Get the largest photo
      const photo = media[media.length - 1];

      await pool.query(
        `INSERT INTO telegram_channel_media (post_id, media_type, file_id, file_unique_id, file_size, width, height)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          messageId,
          'photo',
          photo.file_id,
          photo.file_unique_id,
          photo.file_size || null,
          photo.width || null,
          photo.height || null,
        ]
      );

      // Cache photo for gallery
      await this.cachePhoto(channelId, photo);
    } catch (error) {
      logger.error('handleMediaAttachment', error);
    }
  }

  async cachePhoto(channelId, photo) {
    try {
      // Calculate expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO telegram_photos_cache (channel_id, file_id, file_unique_id, width, height, file_size, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (file_id) DO UPDATE SET
           expires_at = EXCLUDED.expires_at,
           cached_at = CURRENT_TIMESTAMP`,
        [
          channelId,
          photo.file_id,
          photo.file_unique_id,
          photo.width || null,
          photo.height || null,
          photo.file_size || null,
          expiresAt,
        ]
      );
    } catch (error) {
      logger.error('cachePhoto', error);
    }
  }

  async syncToAnnouncements(channelId, messageId) {
    try {
      // Get post details
      const postResult = await pool.query(
        'SELECT * FROM telegram_channel_posts WHERE channel_id = $1 AND message_id = $2',
        [channelId, messageId]
      );

      if (postResult.rows.length === 0) {
        return;
      }

      const post = postResult.rows[0];

      // Format links in the message text
      const formattedContent = this.formatLinks(post.message_text || '');

      // Create announcement
      const announcementResult = await pool.query(
        `INSERT INTO announcements (title, content, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          `Telegram Post #${messageId}`,
          formattedContent,
          1, // System user ID
        ]
      );

      // Link announcement to post
      await pool.query(
        'UPDATE telegram_channel_posts SET announcement_id = $1, synced_to_announcement = true WHERE id = $2',
        [announcementResult.rows[0].id, post.id]
      );
    } catch (error) {
      logger.error('syncToAnnouncements', error);
    }
  }

  formatLinks(text) {
    if (!text) return '';

    // Convert URLs to HTML links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    // Additional formatting can be added here for mentions, hashtags, etc.
  }

  async refreshExpiredCache() {
    try {
      // Mark expired cache entries
      await pool.query(
        `UPDATE telegram_photos_cache
         SET is_expired = true
         WHERE expires_at < NOW() AND is_expired = false`
      );

      // Get expired entries
      const expiredResult = await pool.query(
        'SELECT * FROM telegram_photos_cache WHERE is_expired = true'
      );

      // Refresh each expired entry
      for (const entry of expiredResult.rows) {
        try {
          // Get new file reference from Telegram
          // This would require implementing file reference refresh logic
          // For now, just mark as needing refresh
          logger.info('refreshExpiredCache', `Need to refresh cache entry: ${entry.file_id}`);
        } catch (error) {
          logger.error('refreshExpiredCache', `Failed to refresh cache entry ${entry.file_id}:`, error);
        }
      }
    } catch (error) {
      logger.error('refreshExpiredCache', error);
    }
  }
}

module.exports = new TelegramService();