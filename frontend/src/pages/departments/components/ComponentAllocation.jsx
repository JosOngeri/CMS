/**
 * WHAT THIS COMPONENT DOES
 * ------------------------
 * Settings-tab panel that lets a department admin attach optional
 * "components" (feature modules) to their department, or remove them.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /departments/components/all        → catalog of addable modules
 * - backend /departments/:id/components        → add/remove on this dept
 * - Rendered by pages/departments/DepartmentDashboard.jsx (settings tab)
 */

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
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const ComponentAllocation = ({ departmentId }) => {
  const toast = useToast();
  const { api } = useAuth();
  const [availableComponents, setAvailableComponents] = useState([]);
  const [allocatedComponents, setAllocatedComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  // The api client attaches the auth cookie + CSRF token automatically.
  // 403 means "not allowed" — show an empty panel rather than an error toast.
  const fetchAvailableComponents = useCallback(async () => {
    try {
      const res = await api.get('/departments/components/all');
      setAvailableComponents(res.data.data || []);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch available components');
      }
      setAvailableComponents([]);
    }
  }, [api, toast]);

  const fetchAllocatedComponents = useCallback(async () => {
    try {
      const res = await api.get(`/departments/${departmentId}/components`);
      setAllocatedComponents(res.data.data || []);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch allocated components');
      }
      setAllocatedComponents([]);
    } finally {
      setLoading(false);
    }
  }, [api, departmentId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchAvailableComponents();
    fetchAllocatedComponents();
  }, [departmentId]);

  const allocateComponent = async (componentId) => {
    try {
      await api.post(`/departments/${departmentId}/components`, { componentId });
      toast.success('Component allocated successfully');
      fetchAllocatedComponents();
      setShowAddModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to allocate component');
    }
  };

  const removeComponent = (componentId) => setRemoveTarget(componentId);

  const confirmRemove = async () => {
    const componentId = removeTarget;
    setRemoveTarget(null);
    try {
      await api.delete(`/departments/${departmentId}/components/${componentId}`);
      toast.success('Component removed successfully');
      fetchAllocatedComponents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove component');
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
        <div className="text-[var(--color-textSecondary)]">Loading components...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Allocated Components */}
      <div className="rounded-lg shadow p-6 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            Allocated Components
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-on-solid)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>

        {allocatedComponents.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-[var(--color-border)]" />
            <p className="text-[var(--color-textSecondary)]">No components allocated yet</p>
            <p className="text-sm mt-1 text-[var(--color-border)]">
              Add components to enable additional functionality
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allocatedComponents.map((component) => (
              <div
                key={component.id}
                className="rounded-lg p-4 hover:shadow-md transition-shadow border border-[var(--color-border)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
                    <div>
                      <h4 className="font-medium text-[var(--color-text)]">
                        {component.name}
                      </h4>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        {component.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComponent(component.id)}
                    className="p-1 rounded transition-colors hover:bg-[var(--color-error-light)]"
                    aria-label={`Remove ${component.name}`}
                  >
                    <X className="w-4 h-4 text-[var(--color-error)]" />
                  </button>
                </div>
                {component.description && (
                  <p className="text-sm mb-2 text-[var(--color-text)]">
                    {component.description}
                  </p>
                )}
                <div className="text-xs text-[var(--color-textSecondary)]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-overlay-50)]">
          <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-[var(--color-surface)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Add Component
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surfaceHover)]"
                aria-label="Close add component dialog"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <div className="p-6">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
                  <input
                    type="text"
                    aria-label="Search components"
                    placeholder="Search components..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              {/* Available Components */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAvailableComponents.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--color-border)]" />
                    <p className="text-[var(--color-textSecondary)]">
                      {searchTerm ? 'No components found' : 'All components are already allocated'}
                    </p>
                  </div>
                ) : (
                  filteredAvailableComponents.map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center justify-between p-4 rounded-lg transition-colors border border-[var(--color-border)] hover:bg-[var(--color-surfaceHover)]"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-[var(--color-text)]">
                          {component.name}
                        </h4>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          {component.type}
                        </p>
                        {component.description && (
                          <p className="text-xs mt-1 text-[var(--color-text)]">
                            {component.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => allocateComponent(component.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-on-solid)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] transition-colors"
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

      <ConfirmDialog
        show={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove Component"
        message="Remove this component from the department?"
        confirmLabel="Remove"
      />
    </div>
  );
};

export default ComponentAllocation;