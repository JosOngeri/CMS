/**
 * Role/permission guards throwing AppError via IdentityService.
 * hasRole accepts an array OR varargs — hasRole(['A','B']) or hasRole('A','B').
 * Varargs used to silently take only the first arg (a string), which crashed
 * IdentityService.hasAnyRole on '.some' — now flattened for tolerance.
 * @exports {hasRole, hasPermission, requireSuperAdmin}
 * @deps services/IdentityService
 */
const IdentityService = require('../services/IdentityService');
const { AppError } = require('../helpers/errorHandler');

/**
 * Role & Permission Guards (Phase 5 - REQ-SEC-02)
 * Uses IdentityService for centralized authorization logic
 * Standardized to throw AppError for consistent error handling
 */

const hasRole = (...args) => {
  const allowedRoles = args.flat().filter(Boolean);
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const authorized = IdentityService.hasAnyRole(req.user, allowedRoles);
    if (!authorized) {
      throw new AppError('Insufficient role permissions', 403);
    }
    next();
  };
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!IdentityService.hasPermission(req.user, permission)) {
      throw new AppError(`Missing permission: ${permission}`, 403);
    }
    next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (!IdentityService.isSuperAdmin(req.user)) {
    throw new AppError('Super Admin access required', 403);
  }
  next();
};

module.exports = { hasRole, hasPermission, requireSuperAdmin };
