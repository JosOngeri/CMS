/**
 * Platform-admin authentication (separate platform_users table) + role/permission guards for /api/platform/*.
 * @exports {authenticatePlatformUser, requirePlatformRole, requirePlatformPermission, normalizePermissions}
 * @deps config/platformJwt, config/database
 * @known jwt.verify enforces iss+aud claims and the `type:'platform'` payload claim — church tokens are rejected.
 */
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { getPlatformJwtSecret, PLATFORM_JWT_VERIFY_OPTIONS } = require('../config/platformJwt');
const logger = require('../config/logging');
// The catalog lives in constants/ so routes, migrations, and the staff UI
// share one source of truth — middleware just consumes it.
const { ROLE_PERMISSIONS } = require('../constants/platformPermissions');

// Legacy rows store 'all' as the wildcard; requirePlatformPermission only
// understands '*' — normalize so seeded owners aren't locked out of every
// endpoint.
const mapWildcard = (list) => list.map((permission) => (permission === 'all' ? '*' : permission));

const normalizePermissions = (permissions, role) => {
  if (Array.isArray(permissions)) {
    return mapWildcard(permissions);
  }

  if (typeof permissions === 'string') {
    try {
      const parsedPermissions = JSON.parse(permissions);
      if (Array.isArray(parsedPermissions)) {
        return mapWildcard(parsedPermissions);
      }
    } catch {
      return ROLE_PERMISSIONS[role] || [];
    }
  }

  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Platform User Authentication Middleware
 * Authenticates platform admin users (SaaS owner, platform admins, support staff)
 */
const authenticatePlatformUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = bearerToken || req.cookies?.platform_session;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, getPlatformJwtSecret(), PLATFORM_JWT_VERIFY_OPTIONS);

    // iss/aud prove the token was minted for the platform; the explicit type
    // claim is the final guard against any church-token reuse.
    if (decoded.type !== 'platform') {
      return res.status(401).json({
        success: false,
        error: 'Invalid platform token'
      });
    }

    // Check if user exists in platform_users table
    const userResult = await pool.query(
      'SELECT * FROM platform_users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid platform user' 
      });
    }

    const platformUser = userResult.rows[0];

    // Attach platform user to request
    req.platformUser = {
      id: platformUser.id,
      email: platformUser.email,
      name: platformUser.name,
      role: platformUser.role,
      permissions: normalizePermissions(platformUser.permissions, platformUser.role)
    };

    next();
  } catch (error) {
    logger.error('Platform authentication error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

/**
 * Check if platform user has required role
 */
const requirePlatformRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.platformUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.platformUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

const requirePlatformPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.platformUser) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const permissions = req.platformUser.permissions || [];
    const hasPermission = permissions.includes('*') || requiredPermissions.every((permission) => permissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticatePlatformUser,
  requirePlatformRole,
  requirePlatformPermission,
  normalizePermissions,
  ROLE_PERMISSIONS // re-export for callers that seeded users from this module
};