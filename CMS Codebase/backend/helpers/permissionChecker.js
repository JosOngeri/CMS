/**
 * Permission Checker Helper
 * Provides centralized permission checking utilities for controllers
 */

const ADMIN_ROLES = ['Super Admin', 'Pastor', 'First Elder'];

/**
 * Check if user has any of the specified admin roles
 */
const hasAdminRole = (userRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }
  return ADMIN_ROLES.some(role => userRoles.includes(role));
};

/**
 * Check if user has a specific role
 */
const hasRole = (userRoles, requiredRole) => {
  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }
  return userRoles.includes(requiredRole);
};

/**
 * Check if user has any of the specified roles
 */
const hasAnyRole = (userRoles, allowedRoles) => {
  if (!userRoles || !Array.isArray(userRoles) || !allowedRoles) {
    return false;
  }
  return allowedRoles.some(role => userRoles.includes(role));
};

/**
 * Check if user is the owner of a resource
 */
const isOwner = (userId, resourceOwnerId) => {
  return userId === resourceOwnerId;
};

/**
 * Check if user can access a department
 * NOTE: This helper only performs role-based structural checks.
 * Deep resource ownership logic (e.g., verifying department membership)
 * should be handled in the Repository/Service layer to avoid business logic leakage.
 */
const canAccessDepartment = (userRoles, userId, departmentHeadId, isMember = false) => {
  // Admins can access all departments
  if (hasAdminRole(userRoles)) {
    return true;
  }

  // Department head can access their own department
  if (userId === departmentHeadId) {
    return true;
  }

  // Members can access their department
  if (isMember) {
    return true;
  }

  return false;
};

/**
 * Check if user can perform admin action on a resource
 * NOTE: This helper only performs role-based structural checks.
 * Deep resource ownership logic should be handled in the Repository/Service layer.
 */
const canPerformAdminAction = (userRoles, userId, resourceOwnerId, departmentHeadId = null) => {
  // Admins can perform all actions
  if (hasAdminRole(userRoles)) {
    return true;
  }

  // Resource owner can perform actions on their own resources
  if (userId === resourceOwnerId) {
    return true;
  }

  // Department head can perform actions on department resources
  if (departmentHeadId && userId === departmentHeadId) {
    return true;
  }

  return false;
};

/**
 * Get permission check result with appropriate error response
 */
const checkPermission = (allowed, errorMessage = 'Permission denied') => {
  return {
    allowed,
    error: allowed ? null : errorMessage
  };
};

/**
 * Middleware-style permission checker for Express routes
 */
const requirePermission = (checkFn) => {
  return (req, res, next) => {
    const result = checkFn(req.user, req.params, req.body);
    
    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.error || 'Permission denied'
      });
    }
    
    next();
  };
};

/**
 * Common permission check functions
 */
const permissionChecks = {
  isAdmin: (user) => checkPermission(hasAdminRole(user?.roles)),
  isSuperAdmin: (user) => checkPermission(hasRole(user?.roles, 'Super Admin')),
  isOwner: (user, resourceOwnerId) => checkPermission(isOwner(user?.id, resourceOwnerId)),
  canEditDepartment: (user, department) => checkPermission(
    canAccessDepartment(user?.roles, user?.id, department?.head_id, department?.is_member)
  ),
  canDeleteResource: (user, resource) => checkPermission(
    canPerformAdminAction(user?.roles, user?.id, resource?.created_by, resource?.department_head_id)
  )
};

module.exports = {
  ADMIN_ROLES,
  hasAdminRole,
  hasRole,
  hasAnyRole,
  isOwner,
  canAccessDepartment,
  canPerformAdminAction,
  checkPermission,
  requirePermission,
  permissionChecks
};
