import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useFieldPermissions = (module) => {
  const { api } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, [module]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/field-permissions/module/${module}`);
      setPermissions(response.data.permissions || {});
      setError(null);
    } catch (err) {
      console.error('Failed to fetch field permissions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

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
