const TelegramAuthRepository = require('../repositories/TelegramAuthRepository');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Telegram Auth Controller
 * Handles Telegram authentication methods, verification, and connection testing
 */
class TelegramAuthController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TelegramAuthController');
  }

  /**
   * Get all authentication methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAuthMethods(req, res) {
    try {
      const methods = await TelegramAuthRepository.getAllAuthMethods();

      const sanitizedMethods = methods.map(method => ({
        ...method,
        config: {
          ...method.config,
          botToken: method.config.botToken ? '***' : null,
          apiHash: method.config.apiHash ? '***' : null,
          sessionString: method.config.sessionString ? '***' : null
        }
      }));

      res.json({
        success: true,
        methods: sanitizedMethods
      });
    } catch (error) {
      this.logger.error('getAuthMethods', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch authentication methods'
      });
    }
  }

  /**
   * Create an authentication method
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.type - Auth method type (bot/mtproto)
   * @param {string} req.body.name - Method name
   * @param {Object} req.body.config - Configuration object
   * @param {boolean} [req.body.isActive] - Active status
   * @param {boolean} [req.body.isDefault] - Default status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createAuthMethod(req, res) {
    try {
      const { type, name, config, isActive, isDefault } = req.body;

      if (isDefault) {
        await TelegramAuthRepository.unsetAllDefaults();
      }

      const method = await TelegramAuthRepository.createAuthMethod({
        type,
        name,
        config,
        is_active: isActive || false,
        is_default: isDefault || false
      });

      res.json({
        success: true,
        method
      });
    } catch (error) {
      this.logger.error('createAuthMethod', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create authentication method'
      });
    }
  }

  /**
   * Update an authentication method
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Auth method ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateAuthMethod(req, res) {
    try {
      const { id } = req.params;
      const { type, name, config, isActive, isDefault } = req.body;

      if (isDefault) {
        await TelegramAuthRepository.unsetAllDefaults();
      }

      const method = await TelegramAuthRepository.updateAuthMethod(id, {
        type,
        name,
        config,
        is_active: isActive,
        is_default: isDefault
      });

      if (!method) {
        return res.status(404).json({
          success: false,
          error: 'Authentication method not found'
        });
      }

      res.json({
        success: true,
        method
      });
    } catch (error) {
      this.logger.error('updateAuthMethod', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update authentication method'
      });
    }
  }

  /**
   * Delete an authentication method
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Auth method ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAuthMethod(req, res) {
    try {
      const { id } = req.params;

      await TelegramAuthRepository.deleteAuthMethod(id);

      res.json({
        success: true,
        message: 'Authentication method deleted'
      });
    } catch (error) {
      this.logger.error('deleteAuthMethod', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete authentication method'
      });
    }
  }

  /**
   * Set authentication method as default
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Auth method ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setDefault(req, res) {
    try {
      const { id } = req.params;

      await TelegramAuthRepository.unsetAllDefaults();
      await TelegramAuthRepository.setDefault(id);

      res.json({
        success: true,
        message: 'Default authentication method updated'
      });
    } catch (error) {
      this.logger.error('setDefault', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set default method'
      });
    }
  }

  /**
   * Test connection to Telegram API
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Auth method ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async testConnection(req, res) {
    try {
      const { id } = req.params;

      const method = await TelegramAuthRepository.findAuthMethodById(id);

      if (!method) {
        return res.status(404).json({
          success: false,
          error: 'Authentication method not found'
        });
      }

      if (method.type === 'bot') {
        const Telegram = require('telegram');
        const bot = new Telegram(method.config.botToken);

        try {
          await bot.getMe();
          res.json({
            success: true,
            message: 'Bot API connection successful'
          });
        } catch (error) {
          res.json({
            success: false,
            error: 'Bot API connection failed: ' + error.message
          });
        }
      } else if (method.type === 'mtproto') {
        const { TelegramClient } = require('telegram');
        const { StringSession } = require('telegram/sessions');

        const client = new TelegramClient(
          new StringSession(method.config.sessionString || ''),
          parseInt(method.config.apiId),
          method.config.apiHash,
          { connectionRetries: 5 }
        );

        try {
          if (method.config.sessionString) {
            await client.connect();
            await client.getMe();
            await client.disconnect();
            res.json({
              success: true,
              message: 'MTProto connection successful'
            });
          } else {
            res.json({
              success: false,
              error: 'No session string available. Please verify the account first.'
            });
          }
        } catch (error) {
          res.json({
            success: false,
            error: 'MTProto connection failed: ' + error.message
          });
        }
      }
    } catch (error) {
      this.logger.error('testConnection', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test connection'
      });
    }
  }

  /**
   * Start verification process for MTProto
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.phoneNumber - Phone number to verify
   * @param {string} req.body.methodId - Auth method ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async startVerification(req, res) {
    try {
      const { phoneNumber, methodId } = req.body;

      let method;
      
      if (methodId) {
        method = await TelegramAuthRepository.findAuthMethodById(methodId);
      } else {
        // Try to find default MTProto method
        const defaultMethod = await TelegramAuthRepository.findDefaultMethod();
        if (defaultMethod && defaultMethod.type === 'mtproto') {
          method = defaultMethod;
        } else {
          // Create a new MTProto method with environment credentials
          method = await TelegramAuthRepository.createAuthMethod({
            type: 'mtproto',
            name: 'Default MTProto',
            config: {
              apiId: process.env.TELEGRAM_API_ID,
              apiHash: process.env.TELEGRAM_API_HASH,
              phoneNumber: phoneNumber,
              sessionString: process.env.TELEGRAM_SESSION_STRING
            },
            is_active: true,
            is_default: true
          });
        }
      }

      if (!method) {
        return res.status(404).json({
          success: false,
          error: 'Authentication method not found'
        });
      }

      if (method.type !== 'mtproto') {
        return res.status(400).json({
          success: false,
          error: 'Verification only available for MTProto methods'
        });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      if (!global.verificationCodes) {
        global.verificationCodes = new Map();
      }
      global.verificationCodes.set(phoneNumber, {
        code: verificationCode,
        expiresAt: Date.now() + 5 * 60 * 1000,
        methodId: method.id
      });

      this.logger.info('startVerification', { phoneNumber, verificationCode });

      res.json({
        success: true,
        message: 'Verification code sent',
        code: verificationCode
      });
    } catch (error) {
      this.logger.error('startVerification', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start verification'
      });
    }
  }

  /**
   * Verify verification code
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.code - Verification code
   * @param {string} req.body.phoneNumber - Phone number
   * @param {string} req.body.methodId - Auth method ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async verifyCode(req, res) {
    try {
      const { code, phoneNumber, methodId } = req.body;

      const storedData = global.verificationCodes?.get(phoneNumber);

      if (!storedData) {
        return res.status(400).json({
          success: false,
          error: 'No verification code found'
        });
      }

      if (Date.now() > storedData.expiresAt) {
        global.verificationCodes.delete(phoneNumber);
        return res.status(400).json({
          success: false,
          error: 'Verification code expired'
        });
      }

      if (code !== storedData.code) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }

      const actualMethodId = methodId || storedData.methodId;
      await TelegramAuthRepository.updateConfigPhoneNumber(phoneNumber, actualMethodId);

      global.verificationCodes.delete(phoneNumber);

      res.json({
        success: true,
        message: 'Verification successful'
      });
    } catch (error) {
      this.logger.error('verifyCode', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify code'
      });
    }
  }
}

module.exports = new TelegramAuthController();
