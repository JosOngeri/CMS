import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Image, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TelegramChurchSettings = () => {
  const { api, user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState({
    channelId: '',
    channelName: '',
    channelUsername: '',
    autoSyncToAnnouncements: false,
    syncIntervalHours: 1,
    isActive: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/telegram-church/config');
      if (data.data) setConfig(data.data);
    } catch {
      toast.error('Failed to load Telegram config');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...config,
        syncIntervalHours: parseInt(config.syncIntervalHours, 10) || 1,
      };
      await api.put('/telegram-church/config', payload);
      toast.success('Telegram settings saved');
      fetchConfig();
    } catch (err) {
      toast.error('Failed to save Telegram settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/telegram-church/sync');
      toast.success('Telegram sync started. Refresh gallery in a minute.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[var(--color-primary)]" />
          Telegram Gallery Setup
        </h1>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6 mb-6">
        <p className="text-[var(--color-textSecondary)] mb-6">
          Configure the Telegram channel that this church's photo gallery should pull from. Each church can use its own channel.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Channel username or ID
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-3 w-5 h-5 text-[var(--color-primary)]" />
                <input
                  type="text"
                  name="channelUsername"
                  value={config.channelUsername || ''}
                  onChange={handleChange}
                  placeholder="@sdakiserianmain"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">e.g. @channelname or a numeric channel ID</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Display name</label>
              <input
                type="text"
                name="channelName"
                value={config.channelName || ''}
                onChange={handleChange}
                placeholder="SDA Kiserian Main"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Telegram channel ID (optional)</label>
              <input
                type="text"
                name="channelId"
                value={config.channelId || ''}
                onChange={handleChange}
                placeholder="3977987664"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sync interval (hours)
              </label>
              <input
                type="number"
                name="syncIntervalHours"
                value={config.syncIntervalHours || 1}
                onChange={handleChange}
                min="1"
                max="168"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="autoSync"
              name="autoSyncToAnnouncements"
              type="checkbox"
              checked={!!config.autoSyncToAnnouncements}
              onChange={handleChange}
              className="w-4 h-4 text-[var(--color-primary)] rounded"
            />
            <label htmlFor="autoSync" className="text-sm text-[var(--color-text)]">
              Auto-sync new Telegram posts to announcements
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={!!config.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-[var(--color-primary)] rounded"
            />
            <label htmlFor="isActive" className="text-sm text-[var(--color-text)]">
              Enabled
            </label>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !config.channelUsername}
              className="btn inline-flex items-center gap-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Starting...' : 'Sync Photos Now'}
            </button>
          </div>
        </form>
      </div>

      {config.last_sync_at && (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm text-[var(--color-text)]">
            Last sync: <span className="font-medium">{new Date(config.last_sync_at).toLocaleString()}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default TelegramChurchSettings;
