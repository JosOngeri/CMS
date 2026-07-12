const { pool } = require('../config/database');
const { verifyAccessToken } = require('../helpers/security');
const IdentityService = require('../services/IdentityService');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('auth.middleware');

// Simple in-memory LRU cache for identity lookups
// In production, this should be replaced with Redis
const identityCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = process.env.AUTH_CACHE_SIZE ? parseInt(process.env.AUTH_CACHE_SIZE) : 1000;

/**
 * Extract token from HttpOnly cookie or Authorization header
 * Shared helper used by both auth.js and identityGuard.js
 */
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.jwt;
  return headerToken || cookieToken;
};

/**
 * Build standardized user identity object
 * Shared helper used by both auth.js and identityGuard.js
 */
const buildUserIdentity = (identity) => {
  return {
    id: identity.id,
    email: identity.email,
    username: identity.username,
    firstName: identity.firstName,
    first_name: identity.firstName,
    lastName: identity.lastName,
    last_name: identity.lastName,
    phoneNumber: identity.phoneNumber,
    phone_number: identity.phoneNumber,
    churchId: identity.churchId,
    church_id: identity.churchId,
    churchSlug: identity.churchSlug,
    church_slug: identity.churchSlug,
    churchName: identity.churchName,
    roles: identity.roles,
    permissions: identity.permissions,
    mfaEnabled: identity.mfaEnabled,
    mfaVerified: identity.mfaVerified,
    isActive: identity.isActive
  };
};

const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);

    // Check cache first to avoid DB hit on every request
    const cacheKey = decoded.userId;
    const cached = identityCache.get(cacheKey);

    let identity;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      identity = cached.data;
      logger.debug(`Cache HIT for user ${cacheKey}`);
      // Update last access time for LRU tracking
      cached.lastAccess = Date.now();
      identityCache.set(cacheKey, cached);
    } else {
      logger.debug(`Cache MISS for user ${cacheKey}`);
      // Build the full, standardized user identity so downstream controllers
      // get the same shape regardless of whether they use auth.middleware or identityGuard.
      identity = await IdentityService.getIdentity(decoded.userId);

      // Cache the result
      if (identityCache.size >= MAX_CACHE_SIZE) {
        // Remove least recently used entry (true LRU)
        let lruKey = null;
        let lruTime = Infinity;
        for (const [key, value] of identityCache.entries()) {
          if (value.lastAccess < lruTime) {
            lruTime = value.lastAccess;
            lruKey = key;
          }
        }
        if (lruKey) {
          identityCache.delete(lruKey);
        }
      }
      identityCache.set(cacheKey, { data: identity, timestamp: Date.now(), lastAccess: Date.now() });
    }

    req.user = buildUserIdentity(identity);

    next();
  } catch (error) {
    logger.error('authenticateToken', error);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const hasRole = allowedRoles.some(role => req.user.roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const hasPermission = req.user.permissions && req.user.permissions.includes(requiredPermission);
    
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    const identity = await IdentityService.getIdentity(decoded.userId);
    req.user = buildUserIdentity(identity);
  } catch (error) {
    // Token is optional; ignore invalid/expired tokens
  }
  next();
};

const requireDepartmentPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'Department ID required' });
    }

    try {
      // Check if user has department-specific permission
      const permissionResult = await pool.query(
        `SELECT dp.permissions FROM department_permissions dp
         JOIN user_roles ur ON dp.role_id = ur.role_id
         WHERE dp.department_id = $1 AND ur.user_id = $2`,
        [departmentId, req.user.id]
      );

      if (permissionResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'No department permissions found' });
      }

      const permissions = permissionResult.rows[0].permissions;
      if (!permissions.includes(permission)) {
        return res.status(403).json({ success: false, error: 'Insufficient department permissions' });
      }

      next();
    } catch (error) {
      logger.error('requireDepartmentPermission', error);
      return res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
};

/**
 * Invalidate user cache entry
 * Call this when user roles or permissions change
 */
const invalidateUserCache = (userId) => {
  identityCache.delete(userId);
  logger.debug(`Cache invalidated for user ${userId}`);
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireDepartmentPermission,
  extractToken,
  buildUserIdentity,
  invalidateUserCache
};
