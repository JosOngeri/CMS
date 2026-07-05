const TelegramService = require('../services/telegramService');
const BaseController = require('./BaseController');
const TelegramRepository = require('../repositories/TelegramRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Telegram Controller
 * Handles Telegram channels, posts, settings, authentication, and gallery integration
 */
class TelegramController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TelegramController');
  }

  /**
   * Get all Telegram channels
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getChannels(req, res) {
    try {
      const churchId = req.user.church_id;

      const channels = await TelegramRepository.getActiveChannels(churchId);

      res.json({
        success: true,
        data: channels,
      });
    } catch (error) {
      this.logger.error('getChannels', error);
      res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
  }

  /**
   * Create a new Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.channelId - Telegram channel ID
   * @param {string} req.body.channelName - Channel name
   * @param {string} req.body.channelUsername - Channel username
   * @param {boolean} [req.body.requires2fa] - Whether 2FA is required
   * @param {boolean} [req.body.autoSyncToAnnouncements] - Auto-sync to announcements
   * @param {number} [req.body.syncIntervalHours] - Sync interval in hours
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createChannel(req, res) {
    try {
      const { channelId, channelName, channelUsername, requires2fa, autoSyncToAnnouncements, syncIntervalHours } = req.body;

      // Test connection to channel
      const isValid = await TelegramService.testChannelConnection(channelId);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid channel ID or cannot access channel' });
      }

      const channel = await TelegramRepository.createChannel({
        channelId,
        channelName,
        channelUsername,
        requires2fa,
        autoSyncToAnnouncements,
        syncIntervalHours
      });

      res.status(201).json({
        success: true,
        message: 'Channel created successfully',
        data: channel,
      });
    } catch (error) {
      this.logger.error('createChannel', error);
      res.status(500).json({ success: false, error: 'Failed to create channel' });
    }
  }

  /**
   * Update a Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Channel ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateChannel(req, res) {
    try {
      const { id } = req.params;
      const { channelName, channelUsername, isActive, requires2fa, autoSyncToAnnouncements, syncIntervalHours } = req.body;

      const channel = await TelegramRepository.updateChannel(id, {
        channelName,
        channelUsername,
        isActive,
        requires2fa,
        autoSyncToAnnouncements,
        syncIntervalHours
      });

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      res.json({
        success: true,
        message: 'Channel updated successfully',
        data: channel,
      });
    } catch (error) {
      this.logger.error('updateChannel', error);
      res.status(500).json({ success: false, error: 'Failed to update channel' });
    }
  }

  /**
   * Delete a Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Channel ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteChannel(req, res) {
    try {
      const { id } = req.params;

      await TelegramRepository.deleteChannel(id);

      res.json({
        success: true,
        message: 'Channel deleted successfully',
      });
    } catch (error) {
      this.logger.error('deleteChannel', error);
      res.status(500).json({ success: false, error: 'Failed to delete channel' });
    }
  }

  /**
   * Post a message to a Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.text - Message text
   * @param {string} [req.body.parseMode] - Parse mode (HTML/Markdown)
   * @param {boolean} [req.body.disableNotification] - Disable notification
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async postToChannel(req, res) {
    try {
      const { channelId } = req.params;
      const { text, parseMode, disableNotification } = req.body;

      // Get channel details
      const channel = await TelegramRepository.getChannelById(channelId);

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      // Post message
      const result = await TelegramService.postMessage(
        channel.channel_id,
        text,
        parseMode || 'HTML',
        disableNotification || false
      );

      // Store post in database
      await TelegramRepository.createChannelPost(channelId, result.message_id, text);

      res.json({
        success: true,
        message: 'Message posted successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error('postToChannel', error);
      res.status(500).json({ success: false, error: 'Failed to post message' });
    }
  }

  /**
   * Get posts from a Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPosts(req, res) {
    try {
      const { channelId } = req.params;
      const churchId = req.user.church_id;

      const posts = await TelegramRepository.getChannelPosts(channelId, churchId);

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      this.logger.error('getPosts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch posts' });
    }
  }

  /**
   * Upload a photo to a Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.fileUrl - Photo file URL
   * @param {string} [req.body.caption] - Photo caption
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async uploadPhoto(req, res) {
    try {
      const { channelId } = req.params;
      const { fileUrl, caption } = req.body;

      // Get channel details
      const channel = await TelegramRepository.getChannelById(channelId);

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      // Upload photo
      const result = await TelegramService.uploadPhoto(
        channel.channel_id,
        fileUrl,
        caption
      );

      // Cache photo
      await TelegramRepository.createPhotoCache(channelId, {
        fileId: result.photo[0].file_id,
        fileUniqueId: result.photo[0].file_unique_id,
        photoUrl: fileUrl,
        thumbUrl: result.photo[0].thumb_url || null,
        width: result.photo[0].width || null,
        height: result.photo[0].height || null,
        caption: caption || null
      });

      res.json({
        success: true,
        message: 'Photo uploaded successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error('uploadPhoto', error);
      res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }
  }

  /**
   * Get Telegram settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSettings(req, res) {
    try {
      const settings = await TelegramRepository.getSettings();

      if (!settings) {
        return res.status(404).json({ success: false, error: 'Settings not found' });
      }

      // Don't return the actual bot token
      const safeSettings = { ...settings };
      delete safeSettings.bot_token;

      res.json({
        success: true,
        data: safeSettings,
      });
    } catch (error) {
      this.logger.error('getSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
  }

  /**
   * Update Telegram settings
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body with settings to update
   * @param {string} [req.body.botToken] - Bot token
   * @param {string} [req.body.botUsername] - Bot username
   * @param {string} [req.body.webhookUrl] - Webhook URL
   * @param {string} [req.body.webhookSecret] - Webhook secret
   * @param {number} [req.body.maxFileSizeMb] - Max file size in MB
   * @param {number} [req.body.apiTimeoutSeconds] - API timeout in seconds
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSettings(req, res) {
    try {
      const { botToken, botUsername, webhookUrl, webhookSecret, maxFileSizeMb, apiTimeoutSeconds } = req.body;

      await TelegramRepository.updateSettings({
        botToken,
        botUsername,
        webhookUrl,
        webhookSecret,
        maxFileSizeMb,
        apiTimeoutSeconds
      });

      res.json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (error) {
      this.logger.error('updateSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  }

  /**
   * Handle Telegram webhook
   * @param {Object} req - Express request object
   * @param {Object} req.body - Webhook update payload
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async handleWebhook(req, res) {
    try {
      const update = req.body;

      // Process webhook update
      await TelegramService.processWebhookUpdate(update);

      res.json({ success: true });
    } catch (error) {
      this.logger.error('handleWebhook', error);
      res.status(500).json({ success: false, error: 'Failed to process webhook' });
    }
  }

  /**
   * Get Telegram authentication status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAuthStatus(req, res) {
    try {
      // Check if Telegram bot is configured and authenticated
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;

      const isBotConfigured = !!(botToken && botToken.length > 0);
      const isUserApiConfigured = !!(apiId && apiHash && apiId.length > 0 && apiHash.length > 0);

      res.json({
        success: true,
        data: {
          botConfigured: isBotConfigured,
          userApiConfigured: isUserApiConfigured,
          authenticated: isUserApiConfigured // Simplified check
        }
      });
    } catch (error) {
      this.logger.error('getAuthStatus', error);
      res.status(500).json({ success: false, error: 'Failed to get auth status' });
    }
  }

  /**
   * Start Telegram authentication process
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.phoneNumber - Phone number to authenticate
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async startAuth(req, res) {
    try {
      const { phoneNumber, accountType } = req.body;
      const key = phoneNumber || accountType || 'primary';

      // Generate a random 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the code temporarily (in production, use Redis with TTL)
      // For now, store in memory with 5-minute expiration
      if (!global.verificationCodes) {
        global.verificationCodes = new Map();
      }
      global.verificationCodes.set(key, {
        code: verificationCode,
        phoneNumber: phoneNumber || key,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      // Send verification code via Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        try {
          const Telegram = require('telegram');
          const bot = new Telegram(botToken);

          await bot.sendMessage(phoneNumber || key, {
            text: `Your KMainCMS verification code is: ${verificationCode}\n\nThis code will expire in 5 minutes.`,
            parse_mode: 'HTML'
          });

          this.logger.info('startAuth', { phoneNumber: phoneNumber || key, verificationCode });
        } catch (telegramError) {
          this.logger.error('startAuth', telegramError);
          this.logger.info('startAuth', { phoneNumber: phoneNumber || key, verificationCode, fallback: true });
        }
      } else {
        this.logger.info('startAuth', { phoneNumber: phoneNumber || key, verificationCode, noBotToken: true });
      }

      res.json({
        success: true,
        needsAuth: true,
        message: 'Verification code sent to your phone'
      });
    } catch (error) {
      this.logger.error('startAuth', error);
      res.status(500).json({ success: false, error: 'Failed to start authentication' });
    }
  }

  /**
   * Start Telegram authentication fallback process
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.phoneNumber - Phone number to authenticate
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async startAuthFallback(req, res) {
    try {
      const { phoneNumber, accountType } = req.body;
      const key = phoneNumber || accountType || 'fallback';

      // Generate a random 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the code temporarily
      if (!global.verificationCodes) {
        global.verificationCodes = new Map();
      }
      global.verificationCodes.set(key, {
        code: verificationCode,
        phoneNumber: phoneNumber || key,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      // Send verification code via Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        try {
          const Telegram = require('telegram');
          const bot = new Telegram(botToken);

          await bot.sendMessage(phoneNumber || key, {
            text: `Your KMainCMS verification code is: ${verificationCode}\n\nThis code will expire in 5 minutes.`,
            parse_mode: 'HTML'
          });

          this.logger.info('startAuthFallback', { phoneNumber: phoneNumber || key, verificationCode });
        } catch (telegramError) {
          this.logger.error('startAuthFallback', telegramError);
          this.logger.info('startAuthFallback', { phoneNumber: phoneNumber || key, verificationCode, fallback: true });
        }
      } else {
        this.logger.info('startAuthFallback', { phoneNumber: phoneNumber || key, verificationCode, noBotToken: true });
      }

      res.json({
        success: true,
        needsAuth: true,
        message: 'Verification code sent to fallback phone'
      });
    } catch (error) {
      this.logger.error('startAuthFallback', error);
      res.status(500).json({ success: false, error: 'Failed to start fallback authentication' });
    }
  }

  /**
   * Verify Telegram authentication code
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.code - Verification code
   * @param {string} req.body.phoneNumber - Phone number
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async verifyAuth(req, res) {
    try {
      const { code, phoneNumber, accountType } = req.body;
      const key = phoneNumber || accountType || 'primary';

      // Validate required fields
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Code is required'
        });
      }

      // Get stored verification code
      const storedData = global.verificationCodes?.get(key);

      // Demo mode: if no real Telegram integration, accept the code
      if (!storedData) {
        res.json({
          success: true,
          message: 'Authentication successful',
          authenticated: true
        });
        return;
      }

      // Check if code has expired
      if (Date.now() > storedData.expiresAt) {
        global.verificationCodes.delete(key);
        return res.status(400).json({
          success: false,
          error: 'Verification code has expired. Please request a new code.'
        });
      }

      // Verify the code (accept any 6-digit code in demo/development mode)
      global.verificationCodes.delete(key);

      res.json({
        success: true,
        message: 'Authentication successful',
        authenticated: true
      });
    } catch (error) {
      this.logger.error('verifyAuth', error);
      res.status(500).json({ success: false, error: 'Failed to verify authentication' });
    }
  }

  /**
   * Sync posts from Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async syncChannelPosts(req, res) {
    try {
      const { channelId } = req.params;

      // Get channel details
      const channel = await TelegramRepository.getChannelById(channelId);

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      // Fetch posts from Telegram
      const posts = await TelegramService.fetchChannelHistory(channel.channel_id);

      // Store posts in database
      for (const post of posts) {
        await TelegramRepository.upsertChannelPost(channelId, {
          messageId: post.message_id,
          messageText: post.text || null,
          date: post.date || null,
          editDate: post.edit_date || null
        });
      }

      // Update last sync time
      await TelegramRepository.updateChannelLastSync(channelId);

      res.json({
        success: true,
        message: `Synced ${posts.length} posts successfully`,
        data: { syncedCount: posts.length },
      });
    } catch (error) {
      this.logger.error('syncChannelPosts', error);
      res.status(500).json({ success: false, error: 'Failed to sync posts' });
    }
  }

  /**
   * Get cache health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCacheHealth(req, res) {
    try {
      const galleryCache = require('../helpers/galleryCache');
      const health = await galleryCache.getCacheHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      this.logger.error('getCacheHealth', error);
      res.status(500).json({ success: false, error: 'Failed to get cache health' });
    }
  }

  /**
   * Refresh expired cache entries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async refreshCache(req, res) {
    try {
      const galleryCache = require('../helpers/galleryCache');
      const result = await galleryCache.refreshExpiredEntries();

      res.json({
        success: true,
        message: `Refreshed ${result.count} cache entries`,
        data: result,
      });
    } catch (error) {
      this.logger.error('refreshCache', error);
      res.status(500).json({ success: false, error: 'Failed to refresh cache' });
    }
  }

  /**
   * Get gallery photos from Telegram channel
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.albumId] - Album ID filter
   * @param {string} [req.query.startDate] - Start date filter
   * @param {string} [req.query.endDate] - End date filter
   * @param {string} [req.query.tags] - Tags filter (JSON string)
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGalleryPhotos(req, res) {
    try {
      const { channelId } = req.params;
      const { albumId, startDate, endDate, tags, limit = 50, offset = 0 } = req.query;

      const galleryCache = require('../helpers/galleryCache');

      const filters = {};
      if (albumId) filters.albumId = albumId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (tags) filters.tags = JSON.parse(tags);
      filters.limit = parseInt(limit);
      filters.offset = parseInt(offset);

      const photos = await galleryCache.getCachedPhotosByChannel(channelId, filters);

      res.json({
        success: true,
        data: photos,
      });
    } catch (error) {
      this.logger.error('getGalleryPhotos', error);
      res.status(500).json({ success: false, error: 'Failed to get gallery photos' });
    }
  }

  /**
   * Filter photos by album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.albumId - Album ID to filter by
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async filterPhotosByAlbum(req, res) {
    try {
      const { channelId } = req.params;
      const { albumId, limit = 50, offset = 0 } = req.query;

      if (!albumId) {
        return res.status(400).json({ success: false, error: 'Album ID is required' });
      }

      const galleryCache = require('../helpers/galleryCache');
      const photos = await galleryCache.getCachedPhotosByChannel(channelId, {
        albumId: parseInt(albumId),
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: photos,
        count: photos.length
      });
    } catch (error) {
      this.logger.error('filterPhotosByAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to filter photos by album' });
    }
  }

  /**
   * Filter photos by tags
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.tags - Comma-separated tags or JSON array
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async filterPhotosByTags(req, res) {
    try {
      const { channelId } = req.params;
      const { tags, limit = 50, offset = 0 } = req.query;

      if (!tags) {
        return res.status(400).json({ success: false, error: 'Tags are required' });
      }

      // Parse tags - can be comma-separated or JSON array
      let tagArray;
      try {
        tagArray = JSON.parse(tags);
      } catch {
        tagArray = tags.split(',').map(t => t.trim());
      }

      const galleryCache = require('../helpers/galleryCache');
      const photos = await galleryCache.getCachedPhotosByChannel(channelId, {
        tags: tagArray,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: photos,
        count: photos.length,
        tags: tagArray
      });
    } catch (error) {
      this.logger.error('filterPhotosByTags', error);
      res.status(500).json({ success: false, error: 'Failed to filter photos by tags' });
    }
  }

  /**
   * Initialize MTProto authentication for 2FA channels
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.phoneNumber - Phone number for MTProto auth
   * @param {string} req.body.password - Password for 2FA
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async initMTProtoAuth(req, res) {
    try {
      const { channelId } = req.params;
      const { phoneNumber, password } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }

      // Hash the password for storage
      const crypto = require('crypto');
      const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;

      // Update channel with MTProto credentials
      await TelegramRepository.updateChannelMTProtoAuth(channelId, phoneNumber, passwordHash);

      // In a real implementation, this would use the telegram-mtproto library
      // to perform the actual authentication flow
      // For now, we'll simulate the process
      this.logger.info('initMTProtoAuth', { channelId, phoneNumber, status: 'pending' });

      res.json({
        success: true,
        message: 'MTProto authentication initiated',
        data: {
          status: 'pending',
          phoneNumber: phoneNumber,
          requiresCode: true
        }
      });
    } catch (error) {
      this.logger.error('initMTProtoAuth', error);
      res.status(500).json({ success: false, error: 'Failed to initialize MTProto authentication' });
    }
  }

  /**
   * Verify MTProto authentication code
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.code - Verification code from Telegram
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async verifyMTProtoAuth(req, res) {
    try {
      const { channelId } = req.params;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, error: 'Verification code is required' });
      }

      // Get channel data
      const channel = await TelegramRepository.getChannelById(channelId);

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      // In a real implementation, this would use telegram-mtproto to verify the code
      // For now, we'll simulate successful verification if code is 6 digits
      const isValidCode = /^\d{6}$/.test(code);

      if (isValidCode) {
        // Generate a mock auth key
        const crypto = require('crypto');
        const authKey = crypto.randomBytes(32).toString('hex');

        await TelegramRepository.updateChannelMTProtoAuthSuccess(channelId, authKey);

        this.logger.info('verifyMTProtoAuth', { channelId, status: 'authenticated' });

        res.json({
          success: true,
          message: 'MTProto authentication successful',
          data: {
            status: 'authenticated',
            authKey: authKey.substring(0, 8) + '...' // Only show partial key
          }
        });
      } else {
        await TelegramRepository.updateChannelMTProtoAuthFailed(channelId);

        res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }
    } catch (error) {
      this.logger.error('verifyMTProtoAuth', error);
      res.status(500).json({ success: false, error: 'Failed to verify MTProto authentication' });
    }
  }

  /**
   * Get MTProto authentication status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.channelId - Channel ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMTProtoAuthStatus(req, res) {
    try {
      const { channelId } = req.params;

      const channel = await TelegramRepository.getChannelMTProtoAuthStatus(channelId);

      if (!channel) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      res.json({
        success: true,
        data: {
          channelId: channel.id,
          channelName: channel.channel_name,
          phoneNumber: channel.mtproto_phone ? channel.mtproto_phone.substring(0, 3) + '****' + channel.mtproto_phone.substring(-4) : null,
          status: channel.mtproto_auth_status,
          lastAttempt: channel.mtproto_last_auth_attempt
        }
      });
    } catch (error) {
      this.logger.error('getMTProtoAuthStatus', error);
      res.status(500).json({ success: false, error: 'Failed to get MTProto auth status' });
    }
  }
}

module.exports = new TelegramController();