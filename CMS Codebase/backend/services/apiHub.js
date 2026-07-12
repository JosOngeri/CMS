const axios = require('axios');
const logger = require('../config/logging');

/**
 * API Hub Service (Phase 9)
 * Centralized management of external API integrations
 * Handles payment gateways, SMS providers, and other third-party services
 */
class ApiHub {
  constructor() {
    this.integrations = new Map();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
  }

  /**
   * Register an external API integration
   * @param {string} name - Integration name
   * @param {object} config - Integration configuration
   */
  registerIntegration(name, config) {
    this.integrations.set(name, {
      ...config,
      healthStatus: 'unknown',
      lastHealthCheck: null,
      failureCount: 0
    });
    logger.info(`API integration registered: ${name}`);
  }

  /**
   * Make API call with retry logic and failover
   * @param {string} integration - Integration name
   * @param {string} endpoint - API endpoint
   * @param {object} options - Axios options
   * @returns {Promise<object>} API response
   */
  async callAPI(integration, endpoint, options = {}) {
    const config = this.integrations.get(integration);
    if (!config) {
      throw new Error(`Integration not found: ${integration}`);
    }

    const url = `${config.baseUrl}${endpoint}`;
    const headers = {
      ...config.headers,
      ...options.headers
    };

    let lastError;
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios({
          url,
          method: options.method || 'POST',
          headers,
          data: options.data,
          params: options.params,
          timeout: options.timeout || 30000
        });

        // Reset failure count on success
        config.failureCount = 0;
        config.healthStatus = 'healthy';
        config.lastHealthCheck = new Date();

        return response.data;
      } catch (error) {
        lastError = error;
        config.failureCount++;
        config.healthStatus = 'unhealthy';
        config.lastHealthCheck = new Date();

        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
          logger.warn(`API call failed for ${integration}, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Try failover if configured
    if (config.failoverIntegration) {
      logger.info(`Primary integration ${integration} failed, trying failover: ${config.failoverIntegration}`);
      return this.callAPI(config.failoverIntegration, endpoint, options);
    }

    throw lastError;
  }

  /**
   * Check health of an integration
   * @param {string} integration - Integration name
   * @returns {Promise<object>} Health status
   */
  async checkHealth(integration) {
    const config = this.integrations.get(integration);
    if (!config) {
      return { status: 'not_found' };
    }

    if (!config.healthEndpoint) {
      return { status: 'no_health_check' };
    }

    try {
      const response = await axios({
        url: `${config.baseUrl}${config.healthEndpoint}`,
        method: 'GET',
        timeout: 5000
      });

      config.healthStatus = 'healthy';
      config.lastHealthCheck = new Date();
      config.failureCount = 0;

      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'unknown',
        timestamp: config.lastHealthCheck
      };
    } catch (error) {
      config.healthStatus = 'unhealthy';
      config.lastHealthCheck = new Date();
      config.failureCount++;

      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: config.lastHealthCheck
      };
    }
  }

  /**
   * Get integration status
   * @param {string} integration - Integration name
   * @returns {object} Integration status
   */
  getIntegrationStatus(integration) {
    const config = this.integrations.get(integration);
    if (!config) {
      return { status: 'not_found' };
    }

    return {
      name: integration,
      healthStatus: config.healthStatus,
      lastHealthCheck: config.lastHealthCheck,
      failureCount: config.failureCount,
      hasFailover: !!config.failoverIntegration
    };
  }

  /**
   * Get all integration statuses
   * @returns {object[]} All integration statuses
   */
  getAllIntegrationStatuses() {
    return Array.from(this.integrations.entries()).map(([name, config]) => ({
      name,
      healthStatus: config.healthStatus,
      lastHealthCheck: config.lastHealthCheck,
      failureCount: config.failureCount,
      hasFailover: !!config.failoverIntegration
    }));
  }
}

module.exports = new ApiHub();
