const { pool } = require('../config/database');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendUnauthorized, 
  sendForbidden, 
  sendValidationError 
} = require('../helpers/errorHandler');
const { hasAdminRole, hasAnyRole } = require('../helpers/permissionChecker');

/**
 * Base Controller Class
 * Provides common functionality for all controllers
 * 
 * Extending controllers should:
 * 1. Call super() in constructor
 * 2. Use this.pool for database queries
 * 3. Use response helpers for consistent responses
 * 4. Use permission helpers for access control
 */
class BaseController {
  constructor() {
    this.pool = pool;
    // Bind all prototype methods to the instance so they can be passed
    // directly to Express route handlers without losing `this` context.
    const prototype = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (descriptor && typeof descriptor.value === 'function' && name !== 'constructor') {
        this[name] = this[name].bind(this);
      }
    });
  }

  /**
   * Get database pool
   * @returns {Object} PostgreSQL pool
   */
  getPool() {
    return this.pool;
  }

  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  success(res, data, message = 'Success', statusCode = 200) {
    return sendSuccess(res, data, message, statusCode);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {Error|string} error - Error object or message
   * @param {number} statusCode - HTTP status code
   */
  error(res, error, statusCode = 500) {
    return sendError(res, error, statusCode);
  }

  /**
   * Send not found response
   * @param {Object} res - Express response object
   * @param {string} message - Not found message
   */
  notFound(res, message = 'Resource not found') {
    return sendNotFound(res, message);
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   */
  unauthorized(res, message = 'Authentication required') {
    return sendUnauthorized(res, message);
  }

  /**
   * Send forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   */
  forbidden(res, message = 'Access denied') {
    return sendForbidden(res, message);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array} details - Validation error details
   */
  validationError(res, details) {
    return sendValidationError(res, details);
  }

  /**
   * Check if user has admin role
   * @param {Object} user - User object with roles array
   * @returns {boolean}
   */
  isAdmin(user) {
    return hasAdminRole(user?.roles);
  }

  /**
   * Check if user has any of the specified roles
   * @param {Object} user - User object with roles array
   * @param {Array} allowedRoles - Array of allowed role names
   * @returns {boolean}
   */
  hasRole(user, allowedRoles) {
    return hasAnyRole(user?.roles, allowedRoles);
  }

  /**
   * Check if user is the owner of a resource
   * @param {string} userId - Current user ID
   * @param {string} resourceOwnerId - Resource owner ID
   * @returns {boolean}
   */
  isOwner(userId, resourceOwnerId) {
    return userId === resourceOwnerId;
  }

  /**
   * Wrap async controller method with error handling
   * @param {Function} fn - Async function to wrap
   * @returns {Function} Wrapped function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Log controller action
   * @param {string} action - Action name
   * @param {Object} details - Action details
   * @param {Object} req - Express request object
   */
  async logAction(action, details, req) {
    try {
      await this.pool.query(
        `INSERT INTO audit_log (action, details, user_id, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          action,
          JSON.stringify(details),
          req.user?.id,
          req.ip,
          req.headers['user-agent']
        ]
      );
    } catch (error) {
      console.error('Failed to log action:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Execute database query with error handling
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(query, params = []) {
    try {
      const result = await this.pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute database transaction
   * @param {Function} callback - Callback function with client
   * @returns {Promise<*>} Transaction result
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate required fields in request body
   * @param {Object} body - Request body
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} Validation result { valid: boolean, missing: string[] }
   */
  validateRequired(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Build pagination object from query params
   * @param {Object} query - Express query object
   * @param {number} defaultLimit - Default limit per page
   * @param {number} maxLimit - Maximum limit per page
   * @returns {Object} Pagination object { page, limit, offset }
   */
  buildPagination(query, defaultLimit = 20, maxLimit = 100) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), maxLimit);
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * Build pagination response metadata
   * @param {number} total - Total number of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Object} Pagination metadata
   */
  buildPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}

module.exports = BaseController;
