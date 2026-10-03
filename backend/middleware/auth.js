/**
 * Church-user auth: Bearer/cookie JWT verification via IdentityService (5-min LRU identity cache), plus role/permission guards.
 * @exports {authenticateToken, optionalAuth, requireRole, requirePermission, requireDepartmentPermission, extractToken, buildUserIdentity, invalidateUserCache}
 * @deps helpers/security, services/IdentityService
 * @known is_active enforced via cached identity (≤5min staleness); 401 returned for missing/invalid/expired tokens, 403 only for authenticated-but-forbidden; cached-identity mutation poisons cache — ledger.
 */
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
  // x-auth-token is in the CORS allowlist for legacy/API clients; it goes
  // through the same verification as Bearer — this is only how it's carried.
  const legacyHeader = req.headers['x-auth-token'];
  return headerToken || cookieToken || legacyHeader;
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
    isActive: identity.isActive,
    churchQuarantined: identity.churchQuarantined
  };
};

const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);

    // Platform impersonation sessions carry an `impersonation` claim
    // (services/platformImpersonation.service.js). Readonly sessions may
    // only ever observe — mutating methods are rejected before any
    // controller runs.
    if (decoded.impersonation) {
      req.impersonation = decoded.impersonation;
      const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (decoded.impersonation.mode === 'readonly' && !isRead) {
        return res.status(403).json({
          success: false,
          error: 'Read-only impersonation session — changes are disabled'
        });
      }
    }

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
      identity = await IdentityService.getIdentity(decoded.userId, decoded.mfaVerified === true);

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

    // L403: a valid JWT for a deleted/inactive-directory user yields a null
    // identity — treat as unauthenticated, not as a generic error/403.
    if (!identity) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = buildUserIdentity(identity);

    // Deactivated accounts are rejected even when the JWT itself is still valid.
    // Checked against the (cached) identity so the flag refreshes within CACHE_TTL.
    if (req.user.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    // §8.2 — a quarantined church is cut off entirely; platform operators
    // lift quarantine from the console after investigation.
    if (req.user.churchQuarantined === true) {
      return res.status(503).json({ success: false, error: 'This church is temporarily unavailable' });
    }

    // MFA status lives in the JWT claim — identity.mfaVerified is always false.
    req.user.mfaVerified = decoded.mfaVerified === true;

    // Add scope from token if present
    if (decoded.scope) {
      req.user.scope = decoded.scope;
    }

    next();
  } catch (error) {
    // L403: bad/expired/unverifiable token is an authentication failure (401),
    // not an authorization failure (403) — clients retry login on 401.
    logger.error('authenticateToken', error);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // 'Admin' is the seeded church-administrator role (see ChurchRepository /
    // seed-role-accounts.js). Route allowlists are written for 'Super Admin',
    // so treat Admin as its church-scoped equivalent — tenant scoping still
    // confines it to its own church_id.
    const roles = req.user.roles.includes('Admin')
      ? [...req.user.roles, 'Super Admin']
      : req.user.roles;
    const hasRole = allowedRoles.some(role => roles.includes(role));
    
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

    // L403: share the identity cache — public routes with a token were hitting
    // the DB on every request while authenticateToken cached.
    const cacheKey = decoded.userId;
    const cached = identityCache.get(cacheKey);
    let identity;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      identity = cached.data;
      cached.lastAccess = Date.now();
    } else {
      identity = await IdentityService.getIdentity(decoded.userId, decoded.mfaVerified === true);
      if (identity) {
        identityCache.set(cacheKey, { data: identity, timestamp: Date.now(), lastAccess: Date.now() });
      }
    }
    if (identity) {
      req.user = buildUserIdentity(identity);
    }
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

    // Routes use both :departmentId and :id — accept either.
    const departmentId = req.params.departmentId || req.params.id;

    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'Department ID required' });
    }

    try {
      // Real schema: department_permissions(department_id, user_id, permission, granted).
      // Church-joined so a foreign-church dept id never yields permissions.
      const permissionResult = await pool.query(
        `SELECT dp.permission FROM department_permissions dp
         JOIN users u ON dp.user_id = u.id
         JOIN departments d ON dp.department_id = d.id AND d.church_id = u.church_id
         WHERE dp.department_id = $1 AND dp.user_id = $2 AND dp.granted = true`,
        [departmentId, req.user.id]
      );

      if (permissionResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'No department permissions found' });
      }

      const permissions = permissionResult.rows.map(r => r.permission);
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
