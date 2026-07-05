/**
 * usePermission Hook
 * Provides easy access to permission checking functions
 * This is a convenience hook that wraps AuthContext permission methods
 */

import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, getModulePermissions } from '../constants/permissions';

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, user } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const can = (permission) => {
    return hasPermission(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (permissions) => {
    return hasAnyPermission(permissions);
  };

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissions) => {
    return hasAllPermissions(permissions);
  };

  /**
   * Check if user can access a specific module path
   */
  const canAccessModule = (path) => {
    const requiredPermissions = getModulePermissions(path);
    return canAny(requiredPermissions);
  };

  /**
   * Check if user has a specific role
   */
  const is = (role) => {
    return hasRole(role);
  };

  /**
   * Check if user has any of the specified roles
   */
  const isAny = (roles) => {
    return hasAnyRole(roles);
  };

  /**
   * Check if user is an admin (Super Admin, Pastor, or First Elder)
   */
  const isAdmin = () => {
    return isAny(['Super Admin', 'Pastor', 'First Elder']);
  };

  /**
   * Check if user is a Super Admin
   */
  const isSuperAdmin = () => {
    return is('Super Admin');
  };

  /**
   * Get user's permissions array
   */
  const getUserPermissions = () => {
    return user?.permissions || [];
  };

  /**
   * Get user's roles array
   */
  const getUserRoles = () => {
    return user?.roles || [];
  };

  return {
    // Direct permission checks
    can,
    canAny,
    canAll,
    canAccessModule,
    
    // Role checks
    is,
    isAny,
    isAdmin,
    isSuperAdmin,
    
    // User data
    getUserPermissions,
    getUserRoles,
    
    // Permission constants (for convenience)
    PERMISSIONS,
    
    // User object
    user,
  };
};