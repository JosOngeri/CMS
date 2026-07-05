const { verifyAccessToken } = require('../helpers/security');
const IdentityService = require('../services/IdentityService');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('auth.middleware');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    // Also accept the HttpOnly cookie set by the login endpoint
    const cookieToken = req.cookies?.jwt;
    const token = headerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);

    // Build the full, standardized user identity so downstream controllers
    // get the same shape regardless of whether they use auth.middleware or identityGuard.
    const identity = await IdentityService.getIdentity(decoded.userId);

    req.user = {
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
      if (!permissions[permission]) {
        return res.status(403).json({ success: false, error: 'Insufficient department permissions' });
      }

      next();
    } catch (error) {
      logger.error('requireDepartmentPermission', error);
      return res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
};

module.exports = { authenticateToken, requireRole, requirePermission, requireDepartmentPermission };
