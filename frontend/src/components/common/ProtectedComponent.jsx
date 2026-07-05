import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, AlertCircle } from 'lucide-react';

/**
 * ProtectedComponent - Conditionally renders content based on user permissions
 * 
 * @param {boolean} requireAll - If true, requires ALL permissions. If false, requires ANY permission (default: false)
 * @param {string|string[]} permission - Single permission or array of permissions
 * @param {boolean} requireRole - If true, checks roles instead of permissions
 * @param {string|string[]} role - Single role or array of roles
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {React.ReactNode} fallback - Content to render if unauthorized (optional)
 * @param {boolean} showLockIcon - Show lock icon when unauthorized (default: true)
 * @param {string} unauthorizedMessage - Custom message when unauthorized
 */
const ProtectedComponent = ({
  requireAll = false,
  permission = null,
  requireRole = false,
  role = null,
  children,
  fallback = null,
  showLockIcon = true,
  unauthorizedMessage = 'You do not have permission to access this feature'
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole: hasUserRole, hasAnyRole } = useAuth();

  // Check permissions
  let isAuthorized = false;

  if (requireRole && role) {
    // Role-based check
    const roles = Array.isArray(role) ? role : [role];
    isAuthorized = hasAnyRole(roles);
  } else if (permission) {
    // Permission-based check
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (requireAll) {
      isAuthorized = hasAllPermissions(permissions);
    } else {
      isAuthorized = hasAnyPermission(permissions);
    }
  } else {
    // No permission/role specified, allow access
    isAuthorized = true;
  }

  // Render authorized content
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Render fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthorized state
  return (
    <div className="flex items-center justify-center p-6 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
      {showLockIcon && (
        <div className="flex-shrink-0 mr-4">
          <Lock className="w-6 h-6 text-[var(--color-textSecondary)]" />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm text-[var(--color-textSecondary)]">{unauthorizedMessage}</p>
      </div>
    </div>
  );
};

/**
 * PermissionBadge - Visual indicator for permission-restricted features
 */
const PermissionBadge = ({ permission, size = 'sm' }) => {
  const { hasPermission } = useAuth();
  const hasAccess = hasPermission(permission);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${
      hasAccess
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    }`}>
      {hasAccess ? (
        <span className="w-3 h-3 bg-green-500 rounded-full" />
      ) : (
        <Lock className="w-3 h-3" />
      )}
      <span>{permission}</span>
    </span>
  );
};

/**
 * RequestAccessButton - Button to request access to restricted features
 */
const RequestAccessButton = ({ 
  feature, 
  onRequest, 
  variant = 'primary',
  size = 'sm' 
}) => {
  const { user } = useAuth();

  const handleRequest = () => {
    if (onRequest) {
      onRequest(feature);
    } else {
      // Default behavior: send request to admin
      console.log(`Requesting access to: ${feature}`);
    }
  };

  const variantClasses = {
    primary: 'bg-[var(--color-primary)]-600 text-white hover:bg-[var(--color-primary)]-700',
    secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]',
    outline: 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-background)]'
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5'
  };

  return (
    <button
      onClick={handleRequest}
      className={`rounded-lg transition-colors flex items-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      <AlertCircle className="w-4 h-4" />
      Request Access
    </button>
  );
};

export default ProtectedComponent;
export { PermissionBadge, RequestAccessButton };
