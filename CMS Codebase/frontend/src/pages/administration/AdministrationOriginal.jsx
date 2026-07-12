import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  Settings,
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { AdministrationEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';

const AdministrationOriginal = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'permissions', label: 'Permissions', icon: Key },
    { id: 'system-settings', label: 'System Settings', icon: Settings },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText }
  ];

  const handleExport = () => {
    toast.info('Export functionality will be implemented');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Administration</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">System administration and user management</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <TabNavigation 
        tabs={adminTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="administration-tab"
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Users</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <Users className="w-8 h-8 text-[var(--color-primary)]-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Active Roles</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">System Status</p>
                  <p className="text-2xl font-bold text-green-600">Healthy</p>
                </div>
                <Settings className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Recent Logs</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <Users className="w-5 h-5 text-[var(--color-primary)]-600" />
                <span className="text-[var(--color-text)]">Manage Users</span>
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-[var(--color-text)]">Manage Roles</span>
              </button>
              <button
                onClick={() => setActiveTab('system-settings')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <Settings className="w-5 h-5 text-purple-600" />
                <span className="text-[var(--color-text)]">System Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Users className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No users found</p>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Role
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Shield className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No roles found</p>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Permission
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Key className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No permissions found</p>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system-settings' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Settings className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">System settings will be displayed here</p>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
              <Download className="w-4 h-4" />
              Export Logs
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No audit logs found</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdministrationOriginal;
