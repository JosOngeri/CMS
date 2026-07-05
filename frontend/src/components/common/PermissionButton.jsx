import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock } from 'lucide-react';

/**
 * PermissionButton - Button that is disabled/hidden based on permissions
 * 
 * @param {string|string[]} permission - Required permission(s)
 * @param {boolean} requireAll - If true, requires ALL permissions (default: false)
 * @param {boolean} requireRole - If true, checks roles instead of permissions
 * @param {string|string[]} role - Required role(s)
 * @param {boolean} hideWhenUnauthorized - Hide button instead of disabling (default: false)
 * @param {string} unauthorizedTooltip - Tooltip message when unauthorized
 * @param {React.ReactNode} children - Button content
 * @param {object} buttonProps - Additional button props (className, onClick, etc.)
 */
const PermissionButton = ({
  permission = null,
  requireAll = false,
  requireRole = false,
  role = null,
  hideWhenUnauthorized = false,
  unauthorizedTooltip = 'You do not have permission to perform this action',
  children,
  buttonProps = {},
  ...rest
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole: hasUserRole, hasAnyRole } = useAuth();

  // Check permissions
  let isAuthorized = false;

  if (requireRole && role) {
    const roles = Array.isArray(role) ? role : [role];
    isAuthorized = hasAnyRole(roles);
  } else if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (requireAll) {
      isAuthorized = hasAllPermissions(permissions);
    } else {
      isAuthorized = hasAnyPermission(permissions);
    }
  } else {
    isAuthorized = true;
  }

  // Hide if unauthorized and hideWhenUnauthorized is true
  if (!isAuthorized && hideWhenUnauthorized) {
    return null;
  }

  // Render disabled button if unauthorized
  const buttonClassName = buttonProps.className || 'px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)] transition-colors';
  const disabledClassName = `${buttonClassName} opacity-50 cursor-not-allowed`;

  return (
    <button
      {...rest}
      {...buttonProps}
      className={isAuthorized ? buttonClassName : disabledClassName}
      disabled={!isAuthorized}
      title={!isAuthorized ? unauthorizedTooltip : buttonProps.title}
      onClick={(e) => {
        if (!isAuthorized) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (buttonProps.onClick) {
          buttonProps.onClick(e);
        }
      }}
    >
      {!isAuthorized && (
        <Lock className="w-4 h-4 mr-2 inline" />
      )}
      {children}
    </button>
  );
};

/**
 * PermissionLink - Link that is hidden based on permissions
 */
const PermissionLink = ({
  permission = null,
  requireAll = false,
  requireRole = false,
  role = null,
  children,
  to,
  linkProps = {},
  ...rest
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole: hasUserRole, hasAnyRole } = useAuth();

  let isAuthorized = false;

  if (requireRole && role) {
    const roles = Array.isArray(role) ? role : [role];
    isAuthorized = hasAnyRole(roles);
  } else if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (requireAll) {
      isAuthorized = hasAllPermissions(permissions);
    } else {
      isAuthorized = hasAnyPermission(permissions);
    }
  } else {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <Link
      to={to}
      {...rest}
      {...linkProps}
    >
      {children}
    </Link>
  );
};

export default PermissionButton;
export { PermissionLink };
