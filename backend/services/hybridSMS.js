const apiHub = require('./apiHub');
const logger = require('../config/logging');
const smsProviderRepo = require('../repositories/SMSProviderRepository');
const gatewayRegistry = require('./gatewayRegistry');
const { pool } = require('../config/database');
const crypto = require('crypto');

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
    // Load providers asynchronously; errors are handled gracefully
    this.loadProviders().catch(err => logger.warn('hybridSMS provider auto-load skipped:', err.message));
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Load SMS providers from database
   */
  async loadProviders() {
    try {
      // L780: repository decrypts enc:v1: api_keys at rest before returning rows
      const providers = await smsProviderRepo.getActiveProviders();

      for (const provider of providers) {
        this.registerProvider(provider);
      }

      // Set default provider (first active one)
      if (providers.length > 0) {
        this.defaultProvider = providers[0].name;
      }

      logger.info(`Loaded ${providers.length} SMS providers`);
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

    // Settings gates: sms/sms_enabled is the platform-level kill switch;
    // notifications/sms_notifications is the church's own toggle. Both live
    // in the settings catalog and are managed from the platform console.
    const churchSettings = require('../helpers/churchSettings');
    const [smsEnabled, churchSmsNotifications] = await Promise.all([
      churchSettings.getBool(null, 'sms_enabled', true),
      churchId ? churchSettings.getBool(churchId, 'sms_notifications', true) : Promise.resolve(true),
    ]);
    if (!smsEnabled || !churchSmsNotifications) {
      logger.info(`SMS suppressed by settings (sms_enabled=${smsEnabled}, sms_notifications=${churchSmsNotifications}) for church ${churchId}`);
      return { success: false, suppressed: true, reason: 'sms disabled by settings', gateway: 'none' };
    }

    const recipientCount = recipients.length;

    // Determine routing strategy
    const smallBatchThreshold = parseInt(process.env.SMS_SMALL_BATCH_THRESHOLD, 10) || 400;
    if (recipientCount < smallBatchThreshold) {
      // Small batch: JOSms relay first; bulk failover when no phone is connected.
      const josmsResult = await this.sendViaJOSms(payload);
      if (josmsResult.status === 'offline' && this._providersForChurch(churchId).length > 0) {
        logger.info(`JOSms offline for church ${churchId} — failing over to bulk provider`);
        return this.sendViaBulkProvider(payload, preferredProvider);
      }
      return josmsResult;
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

    // Truthfulness gate: never report queued when no relay phone is listening.
    if (!gatewayRegistry.isOnline(payload.churchId)) {
      logger.warn(`JOSms relay offline for church ${payload.churchId} — send refused`);
      return {
        success: false,
        gateway: 'JOSms',
        status: 'offline',
        reason: 'No JOSms gateway device connected',
        recipientCount: payload.recipients.length
      };
    }

    const batchId = payload.batchId || crypto.randomUUID();

    // Persist the per-recipient ledger BEFORE emitting — a crash between emit
    // and insert would otherwise produce deliveries with no record.
    await this._recordDeliveries(payload, batchId, 'josms', null);

    // Emit to church's relay namespace
    this.io.to(`relay:${payload.churchId}`).emit('process_bulk', {
      recipients: payload.recipients,
      message: payload.message,
      batchId
    });

    logger.info(`Queued ${payload.recipients.length} messages via JOSms for church ${payload.churchId} (batch ${batchId})`);
    return {
      success: true,
      gateway: 'JOSms',
      status: 'queued',
      batchId,
      recipientCount: payload.recipients.length
    };
  }

  /**
   * Write one sms_deliveries row per recipient. UNIQUE(batch_id, recipient)
   * makes replays idempotent — a re-emitted batch upserts instead of doubling.
   */
  async _recordDeliveries(payload, batchId, gateway, deviceId) {
    if (!payload.churchId || !Array.isArray(payload.recipients)) return;
    const preview = (payload.message || '').slice(0, 160);
    const idem = payload.idempotencyKey || batchId;
    const n = payload.recipients.length;
    const pPrev = `$${3 + n}`, pGw = `$${4 + n}`, pDev = `$${5 + n}`, pIdem = `$${6 + n}`;
    try {
      const values = payload.recipients.map((_, i) =>
        `($1, $2, $${3 + i}, ${pPrev}, ${pGw}, ${pDev}, 'queued', ${pIdem})`
      ).join(', ');
      const params = [
        payload.churchId, batchId,
        ...payload.recipients,
        preview, gateway, deviceId, idem
      ];
      await pool.query(
        `INSERT INTO sms_deliveries
           (church_id, batch_id, recipient, message_preview, gateway, device_id, status, idempotency_key)
         VALUES ${values}
         ON CONFLICT (batch_id, recipient) DO NOTHING`,
        params
      );
    } catch (err) {
      // Ledger write failure must not block the send — log loudly instead.
      if (err.code !== '42P01') {
        logger.error('sms_deliveries insert failed:', err.message);
      }
    }
  }

  /**
   * Providers usable by a church: its own church-scoped rows plus shared
   * platform providers (church_id NULL). Sorted by priority so failover
   * order is deterministic.
   */
  _providersForChurch(churchId) {
    return Array.from(this.providers.values())
      .filter(p => p && (p.church_id == null || !churchId || p.church_id === churchId))
      .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
  }

  /**
   * Send SMS via bulk provider with failover
   * @param {object} payload - SMS payload
   * @param {string} preferredProvider - Preferred provider name
   * @returns {Promise<object>} Send result
   */
  async sendViaBulkProvider(payload, preferredProvider = null) {
    const candidates = this._providersForChurch(payload.churchId);
    const provider = preferredProvider
      ? candidates.find(p => p.name === preferredProvider)
      : (candidates.find(p => p.name === this.defaultProvider) || candidates[0]);
    const providerName = provider?.name || preferredProvider || this.defaultProvider;

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

      // Ledger the bulk send so the outbox can show per-recipient state.
      const batchId = payload.batchId || crypto.randomUUID();
      await this._recordDeliveries({ ...payload, batchId }, batchId, providerName, null);

      logger.info(`Sent ${payload.recipients.length} messages via ${providerName}`);
      return {
        success: true,
        gateway: providerName,
        status: 'sent',
        batchId,
        recipientCount: payload.recipients.length,
        data: result
      };
    } catch (error) {
      logger.error(`Failed to send via ${providerName}:`, error);

      // Provider fallback: try the next church-usable provider
      const providerNames = candidates.map(p => p.name);
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
      await smsProviderRepo.updateBalance(providerId, balance);
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
      const provider = await smsProviderRepo.findById(providerId);
      return provider?.balance || 0;
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
