import { useState, useEffect } from 'react';
import { Shield, Lock, Key, Globe, Smartphone, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SecuritySettings = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    sessionTimeout: 30,
    mfaEnabled: false,
    ipWhitelist: [],
    ipBlacklist: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/security/settings');
      setSettings(response.data.settings || settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/security/settings', settings);
      toast.success('Security settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Password Policy */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-[var(--color-primary)]-600" size={20} />
          <h3 className="font-semibold">Password Policy</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Length</label>
            <input
              type="number"
              value={settings.passwordPolicy.minLength}
              onChange={(e) => setSettings({
                ...settings,
                passwordPolicy: { ...settings.passwordPolicy, minLength: parseInt(e.target.value) }
              })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireUppercase}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireUppercase: e.target.checked }
                })}
              />
              Require Uppercase
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireLowercase}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireLowercase: e.target.checked }
                })}
              />
              Require Lowercase
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireNumbers}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireNumbers: e.target.checked }
                })}
              />
              Require Numbers
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.passwordPolicy.requireSpecialChars}
                onChange={(e) => setSettings({
                  ...settings,
                  passwordPolicy: { ...settings.passwordPolicy, requireSpecialChars: e.target.checked }
                })}
              />
              Require Special Characters
            </label>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="text-green-600" size={20} />
          <h3 className="font-semibold">Session Management</h3>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
            className="w-full p-2 border rounded-lg"
          />
        </div>
      </div>

      {/* MFA */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="text-purple-600" size={20} />
            <h3 className="font-semibold">Two-Factor Authentication</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.mfaEnabled}
              onChange={(e) => setSettings({ ...settings, mfaEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
          </label>
        </div>
        <p className="text-sm text-[var(--color-textSecondary)] mt-2">
          Enable 2FA to add an extra layer of security to your account
        </p>
      </div>

      {/* IP Whitelist/Blacklist */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="text-orange-600" size={20} />
          <h3 className="font-semibold">IP Access Control</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">IP Whitelist (comma-separated)</label>
            <textarea
              value={settings.ipWhitelist.join(', ')}
              onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value.split(',').map(ip => ip.trim()) })}
              placeholder="e.g., 192.168.1.1, 10.0.0.1"
              className="w-full p-2 border rounded-lg h-20 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">IP Blacklist (comma-separated)</label>
            <textarea
              value={settings.ipBlacklist.join(', ')}
              onChange={(e) => setSettings({ ...settings, ipBlacklist: e.target.value.split(',').map(ip => ip.trim()) })}
              placeholder="e.g., 192.168.1.100, 10.0.0.100"
              className="w-full p-2 border rounded-lg h-20 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
