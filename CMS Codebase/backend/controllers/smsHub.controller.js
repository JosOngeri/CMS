const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const hybridSMS = require('../services/hybridSMS');
const apiHub = require('../services/apiHub');

/**
 * SMS Hub Controller (Phase 9)
 * Manages SMS providers, hybrid SMS routing, and delivery tracking
 */
class SmsHubController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SmsHubController');
  }

  /**
   * Send SMS with automatic provider selection
   */
  async sendSMS(req, res) {
    const { recipients, message, churchId, provider } = req.body;

    try {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return ResponseHandler.error(res, 'Recipients array is required');
      }

      if (!message || message.trim() === '') {
        return ResponseHandler.error(res, 'Message is required');
      }

      const result = await hybridSMS.sendSMS({
        recipients,
        message,
        churchId: churchId || req.user?.church_id,
        batchId: req.body.batchId,
        provider
      });

      return ResponseHandler.success(res, result, 'SMS sent successfully');
    } catch (error) {
      this.logger.error('sendSMS', error);
      return ResponseHandler.error(res, 'Failed to send SMS');
    }
  }

  /**
   * Get SMS provider status
   */
  async getProviderStatus(req, res) {
    const { provider } = req.params;

    try {
      const status = await hybridSMS.getProviderStatus(provider);
      return ResponseHandler.success(res, status);
    } catch (error) {
      this.logger.error('getProviderStatus', error);
      return ResponseHandler.error(res, 'Failed to get provider status');
    }
  }

  /**
   * Get all SMS provider statuses
   */
  async getAllProviderStatuses(req, res) {
    try {
      const statuses = await hybridSMS.getAllProviderStatuses();
      return ResponseHandler.success(res, statuses);
    } catch (error) {
      this.logger.error('getAllProviderStatuses', error);
      return ResponseHandler.error(res, 'Failed to get provider statuses');
    }
  }

  /**
   * Reload SMS providers from database
   */
  async reloadProviders(req, res) {
    try {
      await hybridSMS.loadProviders();
      return ResponseHandler.success(res, null, 'SMS providers reloaded successfully');
    } catch (error) {
      this.logger.error('reloadProviders', error);
      return ResponseHandler.error(res, 'Failed to reload providers');
    }
  }

  /**
   * Check API Hub integration health
   */
  async checkIntegrationHealth(req, res) {
    const { integration } = req.params;

    try {
      const health = await apiHub.checkHealth(integration);
      return ResponseHandler.success(res, health);
    } catch (error) {
      this.logger.error('checkIntegrationHealth', error);
      return ResponseHandler.error(res, 'Failed to check integration health');
    }
  }

  /**
   * Get all API Hub integration statuses
   */
  async getAllIntegrationStatuses(req, res) {
    try {
      const statuses = apiHub.getAllIntegrationStatuses();
      return ResponseHandler.success(res, statuses);
    } catch (error) {
      this.logger.error('getAllIntegrationStatuses', error);
      return ResponseHandler.error(res, 'Failed to get integration statuses');
    }
  }
}

module.exports = new SmsHubController();
