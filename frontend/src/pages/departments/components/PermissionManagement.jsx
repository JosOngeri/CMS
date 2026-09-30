/**
 * WHAT THIS COMPONENT DOES
 * ------------------------
 * Settings-tab panel for managing department admins: view current admins,
 * grant admin rights to members, and revoke them. Church-level admins act
 * directly; regular department leaders create an approval request instead.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /departments/:id/admins   → list, grant, revoke
 * - backend /departments/:id/members  → pick list for new admins
 * - backend /approvals                → approval requests (non-admin path)
 * - Rendered by pages/departments/DepartmentDashboard.jsx (settings tab)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  UserPlus,
  UserMinus,
  Crown,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useColorPalette } from '../../../contexts/ColorPaletteContext';
import { API_ENDPOINTS } from '../../../constants/api';

const PermissionManagement = ({ departmentId }) => {
  const toast = useToast();
  const { api, user } = useAuth();
  const { colors } = useColorPalette();
  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Check if user is an admin (can bypass approval)
  const isAdmin = user?.roles?.some(role =>
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  );

  // The api client attaches the auth cookie + CSRF token automatically.
  // 403 means "not allowed" — show an empty panel rather than an error toast.
  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get(`/departments/${departmentId}/admins`);
      setAdmins(res.data.data || []);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch admins');
      }
      setAdmins([]);
    }
  }, [api, departmentId, toast]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get(`/departments/${departmentId}/members`);
      setMembers(res.data.data || res.data.members || []);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch members');
      }
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [api, departmentId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchAdmins();
    fetchMembers();
  }, [departmentId]);

  const grantAdmin = async (userId) => {
    try {
      if (isAdmin) {
        // Admins can grant admin access directly
        await api.post(`/departments/${departmentId}/admins`, { userId });
        toast.success('Admin access granted successfully');
      } else {
        // Non-admins need to create an approval request
        const response = await api.post(API_ENDPOINTS.APPROVALS.BASE, {
          requestType: 'grant_admin',
          entityType: 'user',
          entityId: userId,
          departmentId: departmentId,
          metadata: { role: 'Admin' }
        });
        toast.success('Admin access request submitted for approval');
      }
      fetchAdmins();
      fetchMembers();
      setShowAddModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || error.message || 'Failed to grant admin access');
    }
  };

  const revokeAdmin = async (userId) => {
    try {
      if (isAdmin) {
        // Admins can revoke admin access directly
        await api.delete(`/departments/${departmentId}/admins/${userId}`);
        toast.success('Admin access revoked successfully');
      } else {
        // Non-admins need to create an approval request
        const response = await api.post(API_ENDPOINTS.APPROVALS.BASE, {
          requestType: 'revoke_admin',
          entityType: 'user',
          entityId: userId,
          departmentId: departmentId,
          metadata: { role: 'Member' }
        });
        toast.success('Admin revocation request submitted for approval');
      }
      fetchAdmins();
      fetchMembers();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || error.message || 'Failed to revoke admin access');
    }
  };

  const getAdminIds = () => (admins || []).map(a => a.id);

  const filteredMembers = (members || []).filter(
    member => !getAdminIds().includes(member.id) &&
    ((member.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
     (member.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
     (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ color: colors.textSecondary }}>Loading permissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Admins */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            <Shield className="w-5 h-5" style={{ color: colors.primary }} />
            Department Admins
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          >
            <UserPlus className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        {admins.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: colors.border }} />
            <p style={{ color: colors.textSecondary }}>No department admins assigned</p>
            <p className="text-sm mt-1" style={{ color: colors.border }}>
              Add admins to help manage the department
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="rounded-lg p-4 transition-shadow"
                style={{ backgroundColor: colors.background, borderColor: colors.border, borderWidth: '1px', borderStyle: 'solid' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
                      <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                        {admin.first_name?.[0] || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium flex items-center gap-2" style={{ color: colors.text }}>
                        {admin.first_name} {admin.last_name}
                        {admin.is_head && <Crown className="w-4 h-4" style={{ color: colors.warning }} />}
                      </h4>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>{admin.role}</p>
                    </div>
                  </div>
                  {!admin.is_head && (
                    <button
                      type="button"
                      onClick={() => revokeAdmin(admin.id)}
                      className="p-1 rounded transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.error + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Revoke admin access"
                    >
                      <UserMinus className="w-4 h-4" style={{ color: colors.error }} />
                    </button>
                  )}
                </div>
                <div className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                  <p>{admin.email}</p>
                  {admin.phone_number && <p>{admin.phone_number}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.surface }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
                Add Department Admin
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
                    placeholder="Search members..."
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

              {/* Available Members */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.border }} />
                    <p style={{ color: colors.textSecondary }}>
                      {searchTerm ? 'No members found' : 'All members are already admins'}
                    </p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg transition-colors"
                      style={{ border: `1px solid ${colors.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border + '10'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.border + '20' }}>
                          <span className="text-sm font-semibold" style={{ color: colors.text }}>
                            {member.first_name?.[0] || 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium" style={{ color: colors.text }}>
                            {member.first_name} {member.last_name}
                          </h4>
                          <p className="text-sm" style={{ color: colors.textSecondary }}>{member.email}</p>
                          <p className="text-xs" style={{ color: colors.text }}>
                            Role: {member.role_in_department || 'Member'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => grantAdmin(member.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: colors.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                      >
                        <UserPlus className="w-4 h-4" />
                        Grant Admin
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

export default PermissionManagement;