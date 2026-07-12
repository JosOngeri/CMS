/**
 * usePermission Hook
 * Provides easy access to permission checking functions
 * This is a convenience hook that wraps AuthContext permission methods
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, getModulePermissions } from '../constants/permissions';

// Permission hierarchy: if user has higher permission, they automatically have lower permission
const PERMISSION_HIERARCHY = {
  'manage_members': ['view_members'],
  'manage_departments': ['view_departments'],
  'manage_treasury': ['view_treasury'],
  'manage_content': ['view_content'],
  'manage_events': ['view_events'],
  'manage_users': ['view_users'],
  'manage_analytics': ['view_analytics'],
  'manage_settings': ['view_settings'],
  'delete_members': ['manage_members', 'view_members'],
  'delete_departments': ['manage_departments', 'view_departments'],
};

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, user } = useAuth();

  /**
   * Check if user has a specific permission
   * Includes permission hierarchy: if user has higher permission, they automatically have lower permission
   */
  const can = (permission) => {
    // Direct check
    if (hasPermission(permission)) {
      return true;
    }

    // Check hierarchy: if user has any permission that implies this permission
    for (const [higherPermission, impliedPermissions] of Object.entries(PERMISSION_HIERARCHY)) {
      if (impliedPermissions.includes(permission) && hasPermission(higherPermission)) {
        return true;
      }
    }

    return false;
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

  return useMemo(() => ({
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
  }), [can, canAny, canAll, canAccessModule, is, isAny, isAdmin, isSuperAdmin, getUserPermissions, getUserRoles, user]);
};