const IdentityService = require('../services/IdentityService');
const ResponseHandler = require('../utils/ResponseHandler');

/**
 * Role & Permission Guards (Phase 5 - REQ-SEC-02)
 * Uses IdentityService for centralized authorization logic
 */

const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    const authorized = IdentityService.hasAnyRole(req.user, allowedRoles);
    if (!authorized) {
      return ResponseHandler.forbidden(res, 'Insufficient role permissions');
    }
    next();
  };
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    if (!IdentityService.hasPermission(req.user, permission)) {
      return ResponseHandler.forbidden(res, `Missing permission: ${permission}`);
    }
    next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return ResponseHandler.unauthorized(res, 'Authentication required');
  }

  if (!IdentityService.isSuperAdmin(req.user)) {
    return ResponseHandler.forbidden(res, 'Super Admin access required');
  }
  next();
};

module.exports = { hasRole, hasPermission, requireSuperAdmin };
