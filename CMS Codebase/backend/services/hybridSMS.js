const apiHub = require('./apiHub');
const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * Hybrid SMS Service (Phase 9)
 * Manages multiple SMS providers with automatic failover
 * Integrates with JOSms for small batches and bulk providers for large campaigns
 */
class HybridSMS {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.io = null; // Will be set via setIo method
    // Don't auto-load providers to avoid startup errors
    // this.loadProviders();
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Load SMS providers from database
   */
  async loadProviders() {
    try {
      const result = await pool.query(`
        SELECT id, name, api_key, api_url, sender_id, balance, currency, is_active
        FROM sms_providers
        WHERE is_active = true
        ORDER BY priority ASC
      `);

      for (const provider of result.rows) {
        this.registerProvider(provider);
      }

      // Set default provider (first active one)
      if (result.rows.length > 0) {
        this.defaultProvider = result.rows[0].name;
      }

      logger.info(`Loaded ${result.rows.length} SMS providers`);
    } catch (error) {
      // Don't crash if table doesn't exist yet
      if (error.code === '42P01') { // relation does not exist
        logger.warn('SMS providers table does not exist yet, skipping SMS provider loading');
      } else {
        logger.error('Failed to load SMS providers:', error);
      }
    }
  }

  /**
   * Register SMS provider with API Hub
   * @param {object} provider - Provider configuration
   */
  registerProvider(provider) {
    const config = {
      baseUrl: provider.api_url,
      headers: {
        'Authorization': `Bearer ${provider.api_key}`,
        'Content-Type': 'application/json'
      },
      healthEndpoint: '/health',
      failoverIntegration: null // Will be set based on priority
    };

    apiHub.registerIntegration(provider.name, config);
    this.providers.set(provider.name, provider);

    // Set failover to next provider in priority
    const providerNames = Array.from(this.providers.keys());
    const currentIndex = providerNames.indexOf(provider.name);
    if (currentIndex < providerNames.length - 1) {
      const failoverProvider = providerNames[currentIndex + 1];
      config.failoverIntegration = failoverProvider;
    }
  }

  /**
   * Send SMS with automatic provider selection and failover
   * @param {object} payload - SMS payload
   * @returns {Promise<object>} Send result
   */
  async sendSMS(payload) {
    const { recipients, message, churchId, provider: preferredProvider } = payload;
    const recipientCount = recipients.length;

    // Determine routing strategy
    if (recipientCount < 400) {
      // Small batch: Use JOSms via WebSocket
      return this.sendViaJOSms(payload);
    } else {
      // Large batch: Use bulk SMS provider
      return this.sendViaBulkProvider(payload, preferredProvider);
    }
  }

  /**
   * Send SMS via JOSms (WebSocket-based for small batches)
   * @param {object} payload - SMS payload
   * @returns {Promise<object>} Send result
   */
  async sendViaJOSms(payload) {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }

    // Emit to church's relay namespace
    this.io.to(`relay:${payload.churchId}`).emit('process_bulk', {
      recipients: payload.recipients,
      message: payload.message,
      batchId: payload.batchId
    });

    logger.info(`Sent ${payload.recipients.length} messages via JOSms for church ${payload.churchId}`);
    return {
      success: true,
      gateway: 'JOSms',
      status: 'queued',
      recipientCount: payload.recipients.length
    };
  }

  /**
   * Send SMS via bulk provider with failover
   * @param {object} payload - SMS payload
   * @param {string} preferredProvider - Preferred provider name
   * @returns {Promise<object>} Send result
   */
  async sendViaBulkProvider(payload, preferredProvider = null) {
    const providerName = preferredProvider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`SMS provider not found: ${providerName}`);
    }

    try {
      const result = await apiHub.callAPI(providerName, '/send', {
        method: 'POST',
        data: {
          recipients: payload.recipients,
          message: payload.message,
          sender_id: provider.sender_id
        }
      });

      // Update provider balance if returned
      if (result.balance !== undefined) {
        await this.updateProviderBalance(provider.id, result.balance);
      }

      logger.info(`Sent ${payload.recipients.length} messages via ${providerName}`);
      return {
        success: true,
        gateway: providerName,
        status: 'sent',
        recipientCount: payload.recipients.length,
        data: result
      };
    } catch (error) {
      logger.error(`Failed to send via ${providerName}:`, error);

      // Provider fallback: try next available provider
      const providerNames = Array.from(this.providers.keys());
      const currentIndex = providerNames.indexOf(providerName);

      if (currentIndex < providerNames.length - 1) {
        const fallbackProvider = providerNames[currentIndex + 1];
        logger.info(`Attempting fallback to ${fallbackProvider}`);

        try {
          return await this.sendViaBulkProvider(payload, fallbackProvider);
        } catch (fallbackError) {
          logger.error(`Fallback to ${fallbackProvider} also failed:`, fallbackError);
          throw new Error(`Primary provider ${providerName} and fallback ${fallbackProvider} both failed`);
        }
      } else {
        // No more fallback providers available
        throw new Error(`Primary provider ${providerName} failed and no fallback providers available`);
      }
    }
  }

  /**
   * Update provider balance in database
   * @param {string} providerId - Provider ID
   * @param {number} balance - New balance
   */
  async updateProviderBalance(providerId, balance) {
    try {
      await pool.query(
        'UPDATE sms_providers SET balance = $1 WHERE id = $2',
        [balance, providerId]
      );
    } catch (error) {
      logger.error('Failed to update provider balance:', error);
    }
  }

  /**
   * Get provider status
   * @param {string} providerName - Provider name
   * @returns {Promise<object>} Provider status
   */
  async getProviderStatus(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { status: 'not_found' };
    }

    const apiStatus = apiHub.getIntegrationStatus(providerName);
    const dbBalance = await this.getProviderBalance(provider.id);

    return {
      ...apiStatus,
      balance: dbBalance,
      currency: provider.currency,
      senderId: provider.sender_id
    };
  }

  /**
   * Get provider balance from database
   * @param {string} providerId - Provider ID
   * @returns {Promise<number>} Provider balance
   */
  async getProviderBalance(providerId) {
    try {
      const result = await pool.query(
        'SELECT balance FROM sms_providers WHERE id = $1',
        [providerId]
      );
      return result.rows[0]?.balance || 0;
    } catch (error) {
      logger.error('Failed to get provider balance:', error);
      return 0;
    }
  }

  /**
   * Get all provider statuses
   * @returns {Promise<object[]>} All provider statuses
   */
  async getAllProviderStatuses() {
    const statuses = [];

    for (const [name, provider] of this.providers.entries()) {
      const status = await this.getProviderStatus(name);
      statuses.push(status);
    }

    return statuses;
  }
}

module.exports = new HybridSMS();
