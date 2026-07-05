import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { useColorPalette } from '../../../contexts/ColorPaletteContext';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const ComponentAllocation = ({ departmentId }) => {
  const toast = useToast();
  const { colors } = useColorPalette();
  const [availableComponents, setAvailableComponents] = useState([]);
  const [allocatedComponents, setAllocatedComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchWithRetry = async (fetchFn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fetchFn()
        return result
      } catch (error) {
        if (error.message?.includes('429') && i < retries - 1) {
          // Exponential backoff for rate limiting
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
          continue
        }
        throw error
      }
    }
  }

  const fetchAvailableComponents = useCallback(async () => {
    try {
      const response = await fetchWithRetry(async () => {
        const res = await fetch('/api/departments/components/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) {
          if (res.status === 403) {
            const error = new Error('You do not have permission to view available components');
            error.status = res.status;
            throw error;
          }
          const error = new Error('Failed to fetch available components');
          error.status = res.status;
          throw error;
        }
        return res;
      });
      const data = await response.json();
      setAvailableComponents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch available components:', error);
      // Don't show toast for 403 errors - just set empty state
      if (error.status !== 403) {
        toast.error(error.message || 'Failed to fetch available components');
      }
      setAvailableComponents([]);
    }
  }, [toast]);

  const fetchAllocatedComponents = useCallback(async () => {
    try {
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${departmentId}/components`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) {
          if (res.status === 403) {
            const error = new Error('You do not have permission to view allocated components');
            error.status = res.status;
            throw error;
          }
          const error = new Error('Failed to fetch allocated components');
          error.status = res.status;
          throw error;
        }
        return res;
      });
      const data = await response.json();
      setAllocatedComponents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch allocated components:', error);
      // Don't show toast for 403 errors - just set empty state
      if (error.status !== 403) {
        toast.error(error.message || 'Failed to fetch allocated components');
      }
      setAllocatedComponents([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchAvailableComponents();
    fetchAllocatedComponents();
  }, [departmentId]);

  const allocateComponent = async (componentId) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/components`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ componentId }),
      });
      if (!response.ok) throw new Error('Failed to allocate component');
      toast.success('Component allocated successfully');
      fetchAllocatedComponents();
      setShowAddModal(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeComponent = async (componentId) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/components/${componentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to remove component');
      toast.success('Component removed successfully');
      fetchAllocatedComponents();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getAllocatedComponentIds = () => (allocatedComponents || []).map(c => c.id);

  const filteredAvailableComponents = (availableComponents || []).filter(
    component => !getAllocatedComponentIds().includes(component.id) &&
    ((component.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
     (component.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ color: colors.textSecondary }}>Loading components...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Allocated Components */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            Allocated Components
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>

        {allocatedComponents.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: colors.border }} />
            <p style={{ color: colors.textSecondary }}>No components allocated yet</p>
            <p className="text-sm mt-1" style={{ color: colors.border }}>
              Add components to enable additional functionality
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allocatedComponents.map((component) => (
              <div
                key={component.id}
                className="rounded-lg p-4 hover:shadow-md transition-shadow"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
                    <div>
                      <h4 className="font-medium" style={{ color: colors.text }}>
                        {component.name}
                      </h4>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {component.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComponent(component.id)}
                    className="p-1 rounded transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.error + '20'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <X className="w-4 h-4" style={{ color: colors.error }} />
                  </button>
                </div>
                {component.description && (
                  <p className="text-sm mb-2" style={{ color: colors.text }}>
                    {component.description}
                  </p>
                )}
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  Allocated by {component.granted_by_name || 'Unknown'} •{' '}
                  {new Date(component.granted_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Component Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.surface }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
                Add Component
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border + '20'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
              </button>
            </div>
            <div className="p-6">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
                  <input
                    type="text"
                    placeholder="Search components..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg"
                    style={{ 
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                      color: colors.text
                    }}
                  />
                </div>
              </div>

              {/* Available Components */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAvailableComponents.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.border }} />
                    <p style={{ color: colors.textSecondary }}>
                      {searchTerm ? 'No components found' : 'All components are already allocated'}
                    </p>
                  </div>
                ) : (
                  filteredAvailableComponents.map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center justify-between p-4 rounded-lg transition-colors"
                      style={{ border: `1px solid ${colors.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border + '10'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium" style={{ color: colors.text }}>
                          {component.name}
                        </h4>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          {component.type}
                        </p>
                        {component.description && (
                          <p className="text-xs mt-1" style={{ color: colors.text }}>
                            {component.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => allocateComponent(component.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: colors.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentAllocation;