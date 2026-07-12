import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Permissions cache with 5-minute TTL
const permissionsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const useFieldPermissions = (module) => {
  const { api } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    // Check cache first
    const cached = permissionsCache.get(module);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPermissions(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/field-permissions/module/${module}`);
      const permissionsData = response.data.permissions || {};
      setPermissions(permissionsData);
      setError(null);

      // Update cache
      permissionsCache.set(module, {
        data: permissionsData,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to fetch field permissions:', err);
      setError(err);
      // Fallback: return empty permissions object with all fields readable but none writable
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [module, api]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canView = (field) => {
    if (permissions.all) return true;
    return permissions[field]?.read || false;
  };

  const canEdit = (field) => {
    if (permissions.all) return true;
    return permissions[field]?.write || false;
  };

  const canDelete = (field) => {
    if (permissions.all) return true;
    return permissions[field]?.delete || false;
  };

  const checkPermission = (field, action) => {
    if (permissions.all) return true;
    return permissions[field]?.[action] || false;
  };

  return {
    permissions,
    loading,
    error,
    canView,
    canEdit,
    canDelete,
    checkPermission,
    refetch: fetchPermissions
  };
};

export default useFieldPermissions;
