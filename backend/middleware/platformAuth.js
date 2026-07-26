const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { getPlatformJwtSecret } = require('../config/platformJwt');

const ROLE_PERMISSIONS = {
  platform_owner: ['*'],
  platform_admin: ['platform:read', 'tenant:read', 'tenant:manage', 'metrics:read', 'health:read', 'audit:read'],
  support: ['platform:read', 'tenant:read']
};

const normalizePermissions = (permissions, role) => {
  if (Array.isArray(permissions)) {
    return permissions;
  }

  if (typeof permissions === 'string') {
    try {
      const parsedPermissions = JSON.parse(permissions);
      if (Array.isArray(parsedPermissions)) {
        return parsedPermissions;
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

    const decoded = jwt.verify(token, getPlatformJwtSecret());

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
    console.error('Platform authentication error:', error);
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
  normalizePermissions
};