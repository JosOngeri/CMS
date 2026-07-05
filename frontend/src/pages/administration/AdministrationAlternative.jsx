import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  Settings,
  Activity,
  Server,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  MoreVertical,
  LogOut,
  UserPlus,
  Lock,
  Database,
  Wifi
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const AdministrationAlternative = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'permissions', label: 'Permissions', icon: Key },
    { id: 'system', label: 'System', icon: Server },
    { id: 'logs', label: 'Audit Logs', icon: Activity }
  ];

  const systemStatus = [
    { service: 'Database', status: 'healthy', icon: Database },
    { service: 'API Server', status: 'healthy', icon: Server },
    { service: 'Cache', status: 'healthy', icon: Wifi },
    { service: 'Background Jobs', status: 'warning', icon: Clock }
  ];

  const recentActivities = [
    { action: 'User created', user: 'Admin', time: '2 minutes ago' },
    { action: 'Role updated', user: 'Admin', time: '15 minutes ago' },
    { action: 'System backup', user: 'System', time: '1 hour ago' }
  ];

  const quickActions = [
    { id: 'add-user', label: 'Add User', icon: UserPlus, description: 'Create a new user account' },
    { id: 'manage-roles', label: 'Manage Roles', icon: Shield, description: 'Configure user roles' },
    { id: 'system-check', label: 'System Check', icon: Server, description: 'Run system diagnostics' },
    { id: 'security', label: 'Security', icon: Lock, description: 'Review security settings' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-[var(--color-textSecondary)] bg-[var(--color-surface)]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full">
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Admin Console</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">System administration dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="w-64 bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)]">Navigation</h3>
          </div>
          <div className="flex-1 p-2">
            {sidebarItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    activeSection === item.id ? 'bg-[var(--color-primary)]-50 text-[var(--color-primary)]-600' : 'hover:bg-[var(--color-background)] text-[var(--color-text)]'
                  }`}
                >
                  <ItemIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="p-4 border-t border-[var(--color-border)]">
            <button className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6">
          {/* System Status */}
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">System Status</h3>
            <div className="grid grid-cols-4 gap-4">
              {systemStatus.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.service} className="flex items-center gap-3 p-3 bg-[var(--color-background)] rounded-lg">
                    <ItemIcon className="w-5 h-5 text-[var(--color-textSecondary)]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.service}</p>
                      <div className={`flex items-center gap-1 text-xs ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{item.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => toast.info(`${action.label} functionality will be implemented`)}
                    className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-left"
                  >
                    <ActionIcon className="w-6 h-6 text-[var(--color-primary)]-600 mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text)]">{action.label}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-text)]">Recent Activity</h3>
              <button className="text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-800">View All</button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-[var(--color-background)] rounded-lg">
                  <Activity className="w-4 h-4 text-[var(--color-primary)]-600" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--color-text)]">{activity.action}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">by {activity.user} • {activity.time}</p>
                  </div>
                  <button className="p-1 hover:bg-[var(--color-surface)] rounded">
                    <MoreVertical className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdministrationAlternative;
