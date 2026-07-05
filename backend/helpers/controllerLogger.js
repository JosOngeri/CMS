/**
 * Controller Logger Helper
 * Provides consistent logging across all controllers
 */

const logger = {
  /**
   * Log info message
   * @param {string} controller - Controller name
   * @param {string} action - Action being performed
   * @param {Object} data - Additional data to log
   */
  info(controller, action, data = {}) {
    console.log(`[${controller}] ${action}`, data);
  },

  /**
   * Log error message
   * @param {string} controller - Controller name
   * @param {string} action - Action being performed
   * @param {Error} error - Error object
   * @param {Object} data - Additional data to log
   */
  error(controller, action, error, data = {}) {
    console.error(`[${controller}] ERROR in ${action}:`, {
      message: error.message,
      stack: error.stack,
      ...data
    });
  },

  /**
   * Log warning message
   * @param {string} controller - Controller name
   * @param {string} action - Action being performed
   * @param {string} message - Warning message
   * @param {Object} data - Additional data to log
   */
  warn(controller, action, message, data = {}) {
    console.warn(`[${controller}] WARNING in ${action}:`, message, data);
  },

  /**
   * Log debug message
   * @param {string} controller - Controller name
   * @param {string} action - Action being performed
   * @param {Object} data - Additional data to log
   */
  debug(controller, action, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${controller}] DEBUG ${action}:`, data);
    }
  },

  /**
   * Log database query
   * @param {string} controller - Controller name
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  query(controller, query, params = []) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${controller}] QUERY:`, {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        params
      });
    }
  },

  /**
   * Log API request
   * @param {string} controller - Controller name
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} req - Express request object
   */
  request(controller, method, endpoint, req) {
    logger.info(controller, `${method} ${endpoint}`, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  },

  /**
   * Log API response
   * @param {string} controller - Controller name
   * @param {number} statusCode - HTTP status code
   * @param {number} duration - Request duration in ms
   */
  response(controller, statusCode, duration) {
    logger.debug(controller, 'Response', {
      statusCode,
      duration: `${duration}ms`
    });
  }
};

/**
 * Create a logger instance for a specific controller
 * @param {string} controllerName - Name of the controller
 * @returns {Object} Logger instance with controller name bound
 */
const createLogger = (controllerName) => {
  return {
    info: (action, data) => logger.info(controllerName, action, data),
    error: (action, error, data) => logger.error(controllerName, action, error, data),
    warn: (action, message, data) => logger.warn(controllerName, action, message, data),
    debug: (action, data) => logger.debug(controllerName, action, data),
    query: (query, params) => logger.query(controllerName, query, params),
    request: (method, endpoint, req) => logger.request(controllerName, method, endpoint, req),
    response: (statusCode, duration) => logger.response(controllerName, statusCode, duration)
  };
};

module.exports = {
  logger,
  createLogger
};
