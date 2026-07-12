import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Bell, Smartphone, Moon, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const NotificationPreferences = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [preferences, setPreferences] = useState({
    email: { enabled: true, digest: 'daily' },
    sms: { enabled: false, urgentOnly: true },
    inApp: { enabled: true, sound: true },
    push: { enabled: false },
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    categories: {
      announcements: true,
      payments: true,
      events: true,
      approvals: true,
      system: false
    }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data.preferences || preferences);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', preferences);
      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Channel Preferences */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6 space-y-6">
        <h3 className="font-semibold text-lg">Notification Channels</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="text-[var(--color-primary)]-600" size={24} />
              <div>
                <div className="font-medium">Email</div>
                <div className="text-sm text-[var(--color-textSecondary)]">Receive notifications via email</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={preferences.email.digest}
                onChange={(e) => setPreferences({ ...preferences, email: { ...preferences.email, digest: e.target.value } })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email.enabled}
                  onChange={(e) => setPreferences({ ...preferences, email: { ...preferences.email, enabled: e.target.checked } })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-green-600" size={24} />
              <div>
                <div className="font-medium">SMS</div>
                <div className="text-sm text-[var(--color-textSecondary)]">Receive urgent notifications via SMS</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.sms.urgentOnly}
                  onChange={(e) => setPreferences({ ...preferences, sms: { ...preferences.sms, urgentOnly: e.target.checked } })}
                />
                Urgent only
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sms.enabled}
                  onChange={(e) => setPreferences({ ...preferences, sms: { ...preferences.sms, enabled: e.target.checked } })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="text-purple-600" size={24} />
              <div>
                <div className="font-medium">In-App</div>
                <div className="text-sm text-[var(--color-textSecondary)]">Show notifications in the app</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.inApp.sound}
                  onChange={(e) => setPreferences({ ...preferences, inApp: { ...preferences.inApp, sound: e.target.checked } })}
                />
                Sound
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.inApp.enabled}
                  onChange={(e) => setPreferences({ ...preferences, inApp: { ...preferences.inApp, enabled: e.target.checked } })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="text-orange-600" size={24} />
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-[var(--color-textSecondary)]">Receive push notifications on mobile</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.push.enabled}
                onChange={(e) => setPreferences({ ...preferences, push: { ...preferences.push, enabled: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Moon className="text-indigo-600" size={20} />
          <h3 className="font-semibold">Quiet Hours</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Do Not Disturb</div>
            <div className="text-sm text-[var(--color-textSecondary)]">Mute notifications during quiet hours</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => setPreferences({ ...preferences, quietHours: { ...preferences.quietHours, start: e.target.value } })}
                className="px-3 py-2 border rounded-lg"
              />
              <span>to</span>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => setPreferences({ ...preferences, quietHours: { ...preferences.quietHours, end: e.target.value } })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => setPreferences({ ...preferences, quietHours: { ...preferences.quietHours, enabled: e.target.checked } })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Category Preferences */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Notification Categories</h3>
        <div className="space-y-3">
          {Object.entries(preferences.categories).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
              <span className="capitalize">{category}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    categories: { ...preferences.categories, [category]: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
