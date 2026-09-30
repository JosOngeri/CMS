/**
 * WHAT THIS FILE DOES
 * -------------------
 * A wrapper that guards a page. It checks:
 *   1. Is the user logged in? If not, send them to the login page.
 *   2. Does the user have one of the required roles? If not, send them home.
 *   3. Does the user have the required permission(s)? If not, send them home.
 *
 * Use it in the router around any page that needs protection.
 *
 * FILES IT TALKS TO
 * -----------------
 * - AuthContext.jsx  → isAuthenticated / user loading state
 * - hooks/usePermission.js → role and permission checks
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  redirectTo = '/login',
  requiredRoles = []
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { can, canAny, canAll, isAny } = usePermission();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectPath} replace />;
  }

  if (requiredRoles.length > 0 && !isAny(requiredRoles)) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  if (permission || permissions.length > 0) {
    const allowed = permission
      ? can(permission)
      : requireAll
        ? canAll(permissions)
        : canAny(permissions);

    if (!allowed) {
      return <Navigate to="/dashboard/overview" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
