import { useState, useEffect } from 'react';
import { Settings, Save, Key, Globe, Clock, Shield, Activity, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramSettings = () => {
  const [settings, setSettings] = useState({
    botToken: '',
    botUsername: '',
    webhookUrl: '',
    webhookSecret: '',
    maxFileSizeMb: 50,
    apiTimeoutSeconds: 30,
  });
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);
  const toast = useToast();
  const { colors } = useColorPalette();

  useEffect(() => {
    fetchSettings();
    checkWebhookStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/telegram/settings');
      setSettings(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch settings');
    }
    setIsLoading(false);
  };

  const checkWebhookStatus = async () => {
    setIsCheckingWebhook(true);
    try {
      // This would be a real endpoint to check webhook status
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWebhookStatus({
        isActive: settings.webhookUrl && settings.webhookUrl.length > 0,
        lastUpdate: new Date().toISOString(),
        errorCount: 0,
      });
    } catch (err) {
      setWebhookStatus({
        isActive: false,
        error: 'Failed to check webhook status',
      });
    }
    setIsCheckingWebhook(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await axios.put('/api/telegram/settings', settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
              <Settings className="h-6 w-6" style={{ color: colors.primary }} />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Telegram Settings
            </h1>
          </div>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Configure your Telegram bot and API settings
          </p>
        </div>

        {/* Settings Form */}
        <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bot Configuration */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                <Key className="h-5 w-5" />
                Bot Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={settings.botToken}
                    onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="Enter your bot token from @BotFather"
                  />
                  <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                    Get your bot token from @BotFather on Telegram
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Bot Username
                  </label>
                  <input
                    type="text"
                    value={settings.botUsername}
                    onChange={(e) => setSettings({ ...settings, botUsername: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="@your_bot_username"
                  />
                </div>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="https://your-domain.com/api/telegram/webhook"
                  />
                  <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                    URL where Telegram will send webhook updates
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={settings.webhookSecret}
                    onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="Secret token for webhook verification"
                  />
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                <Clock className="h-5 w-5" />
                API Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.maxFileSizeMb}
                    onChange={(e) => setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    API Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.apiTimeoutSeconds}
                    onChange={(e) => setSettings({ ...settings, apiTimeoutSeconds: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    min="5"
                    max="120"
                  />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.primary + '10' }}>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 mt-0.5" style={{ color: colors.primary }} />
                <div>
                  <h4 className="font-medium" style={{ color: colors.text }}>Security Notice</h4>
                  <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                    Your bot token and webhook secret are sensitive credentials. Never share them publicly or commit them to version control.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhook Status */}
        <div className="mt-6 p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.text }}>
              <Activity className="h-5 w-5" />
              Webhook Status
            </h3>
            <button
              onClick={checkWebhookStatus}
              disabled={isCheckingWebhook}
              className="text-sm px-3 py-1 rounded-lg"
              style={{ backgroundColor: colors.background, color: colors.text }}
            >
              {isCheckingWebhook ? 'Checking...' : 'Check Status'}
            </button>
          </div>

          {webhookStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Status:
                </span>
                <div className="flex items-center gap-2">
                  {webhookStatus.isActive ? (
                    <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
                  ) : (
                    <XCircle className="h-4 w-4" style={{ color: 'var(--color-error)' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    {webhookStatus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {webhookStatus.lastUpdate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Last Update:
                  </span>
                  <span className="text-sm" style={{ color: colors.text }}>
                    {new Date(webhookStatus.lastUpdate).toLocaleString()}
                  </span>
                </div>
              )}

              {webhookStatus.errorCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Error Count:
                  </span>
                  <span className="text-sm" style={{ color: colors.text }}>
                    {webhookStatus.errorCount}
                  </span>
                </div>
              )}

              {webhookStatus.error && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error)20' }}>
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                    {webhookStatus.error}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Click "Check Status" to view webhook status
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;