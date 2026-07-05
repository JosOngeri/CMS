/**
 * ProtectedComponent
 * Conditionally renders children based on user permissions
 * Use this to hide/show UI elements based on role or permission
 */

import React from 'react';
import { usePermission } from '../hooks/usePermission';

export const ProtectedComponent = ({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  role,
  roles = [],
  fallback = null,
  renderFallback = false,
}) => {
  const { can, canAny, canAll, is, isAny } = usePermission();

  // Check permission-based access
  const hasPermissionAccess = () => {
    if (permission) {
      return can(permission);
    }
    if (permissions.length > 0) {
      return requireAll ? canAll(permissions) : canAny(permissions);
    }
    return true; // No permission requirement
  };

  // Check role-based access
  const hasRoleAccess = () => {
    if (role) {
      return is(role);
    }
    if (roles.length > 0) {
      return isAny(roles);
    }
    return true; // No role requirement
  };

  // Combined access check
  const hasAccess = hasPermissionAccess() && hasRoleAccess();

  // Render nothing if no access and no fallback
  if (!hasAccess && !renderFallback) {
    return null;
  }

  // Render fallback if no access
  if (!hasAccess && renderFallback) {
    return <>{fallback}</>;
  }

  // Render children if has access
  return <>{children}</>;
};

/**
 * Permission-based button wrapper
 */
export const PermissionButton = ({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  disabledMessage = "You don't have permission to perform this action",
  ...props 
}) => {
  const { can, canAny, canAll } = usePermission();

  const hasPermission = () => {
    if (permission) {
      return can(permission);
    }
    if (permissions.length > 0) {
      return requireAll ? canAll(permissions) : canAny(permissions);
    }
    return true;
  };

  const canPerformAction = hasPermission();

  return (
    <button
      {...props}
      disabled={!canPerformAction || props.disabled}
      title={!canPerformAction ? disabledMessage : props.title}
      className={!canPerformAction 
        ? `${props.className || ''} opacity-50 cursor-not-allowed` 
        : props.className
      }
    >
      {children}
    </button>
  );
};

/**
 * Role-based component wrapper
 */
export const RoleComponent = ({ 
  children, 
  role, 
  roles = [], 
  fallback = null,
  renderFallback = false,
}) => {
  const { is, isAny } = usePermission();

  const hasRoleAccess = () => {
    if (role) {
      return is(role);
    }
    if (roles.length > 0) {
      return isAny(roles);
    }
    return true;
  };

  const hasAccess = hasRoleAccess();

  if (!hasAccess && !renderFallback) {
    return null;
  }

  if (!hasAccess && renderFallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Admin-only component wrapper
 */
export const AdminOnly = ({ children, fallback = null, renderFallback = false }) => {
  const { isAdmin } = usePermission();

  if (!isAdmin() && !renderFallback) {
    return null;
  }

  if (!isAdmin() && renderFallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Super Admin-only component wrapper
 */
export const SuperAdminOnly = ({ children, fallback = null, renderFallback = false }) => {
  const { isSuperAdmin } = usePermission();

  if (!isSuperAdmin() && !renderFallback) {
    return null;
  }

  if (!isSuperAdmin() && renderFallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedComponent;