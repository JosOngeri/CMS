import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle, Eye, Settings, Activity, User, Clock, MapPin, Monitor, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Security = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock security logs
  const mockLogs = [
    { id: 1, action: 'LOGIN_SUCCESS', user: 'admin@sda.org', ip: '192.168.1.100', timestamp: '2026-06-18 14:32:15', status: 'success' },
    { id: 2, action: 'LOGIN_FAILED', user: 'unknown@test.com', ip: '192.168.1.105', timestamp: '2026-06-18 14:30:22', status: 'failed' },
    { id: 3, action: 'PASSWORD_CHANGE', user: 'pastor@sda.org', ip: '192.168.1.102', timestamp: '2026-06-18 14:15:00', status: 'success' },
    { id: 4, action: 'ROLE_UPDATE', user: 'admin@sda.org', ip: '192.168.1.100', timestamp: '2026-06-18 13:45:30', status: 'success' },
    { id: 5, action: 'LOGIN_SUCCESS', user: 'elder@sda.org', ip: '192.168.1.103', timestamp: '2026-06-18 13:30:00', status: 'success' },
    { id: 6, action: 'UNAUTHORIZED_ACCESS', user: 'unknown', ip: '192.168.1.200', timestamp: '2026-06-18 12:15:45', status: 'failed' },
    { id: 7, action: 'API_ACCESS', user: 'system', ip: '127.0.0.1', timestamp: '2026-06-18 12:00:00', status: 'success' },
    { id: 8, action: 'LOGIN_SUCCESS', user: 'treasurer@sda.org', ip: '192.168.1.104', timestamp: '2026-06-18 11:45:00', status: 'success' },
  ];

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordExpiry: 90,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    ipWhitelist: '',
    enforceStrongPassword: true,
    requireMfaForAdmin: true,
  });

  const fetchLogs = async () => {
    try {
      const response = await api.get('/security/logs');
      setLogs(response.data.logs || mockLogs);
    } catch (error) {
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      toast.loading('Saving security settings...');
      await api.put('/security/settings', securitySettings);
      toast.success('Security settings saved successfully');
    } catch (error) {
      toast.error('Failed to save security settings');
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'LOGIN_FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PASSWORD_CHANGE': return <Lock className="w-4 h-4 text-[var(--color-primary)]-500" />;
      case 'ROLE_UPDATE': return <User className="w-4 h-4 text-purple-500" />;
      case 'UNAUTHORIZED_ACCESS': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-textSecondary)]" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.status === 'success';
    if (filter === 'failed') return log.status === 'failed';
    return log.action === filter;
  });

  React.useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'logs' ? 'bg-[var(--color-primary)]-600 text-white' : 'bg-[var(--color-surface)] '}`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'settings' ? 'bg-[var(--color-primary)]-600 text-white' : 'bg-[var(--color-surface)] '}`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'logs' && (
        <>
          <div className="flex gap-4 mb-6">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Events</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
              <option value="LOGIN_SUCCESS">Logins</option>
              <option value="PASSWORD_CHANGE">Password Changes</option>
              <option value="ROLE_UPDATE">Role Updates</option>
            </select>
          </div>

          <div className="bg-[var(--color-surface)]  rounded-lg border">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Security Events ({filteredLogs.length})</h2>
              <button className="text-sm text-[var(--color-primary)]-600 hover:underline">Export Logs</button>
            </div>
            <div className="p-4">
              {filteredLogs.length === 0 ? (
                <p className="text-[var(--color-textSecondary)] text-center py-8">No security events found</p>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded">
                      <div className="flex items-center gap-3">
                        {getActionIcon(log.action)}
                        <div>
                          <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-[var(--color-textSecondary)]">{log.user}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--color-textSecondary)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {log.ip}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.timestamp}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Authentication Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Require 2FA for all users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require MFA for Admin</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Enforce MFA for admin accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireMfaForAdmin}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireMfaForAdmin: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password Expiry (days)</label>
                <input
                  type="number"
                  value={securitySettings.passwordExpiry}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Login Security
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
                <input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IP Whitelist (comma-separated)</label>
                <input
                  type="text"
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="192.168.1.1, 192.168.1.2"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Password Policy
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enforce Strong Passwords</p>
                <p className="text-sm text-[var(--color-textSecondary)]">Require complex passwords with special characters</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.enforceStrongPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, enforceStrongPassword: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="px-6 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Security;
