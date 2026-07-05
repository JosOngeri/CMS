import { useState, useEffect } from 'react';
import { Eye, Keyboard, Contrast, ZoomIn, Moon, Sun, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const AccessibilityManager = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState({
    highContrast: false,
    reducedMotion: false,
    textSize: 'medium',
    screenReader: false,
    keyboardNavigation: true,
    focusIndicators: true,
    skipLinks: true
  });
  const [auditResults, setAuditResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/accessibility/settings');
      setSettings(response.data.settings || settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    try {
      const response = await api.post('/accessibility/audit');
      setAuditResults(response.data.results);
    } catch (error) {
      toast.error('Failed to run accessibility audit');
    }
  };

  const saveSettings = async () => {
    try {
      await api.put('/accessibility/settings', settings);
      toast.success('Accessibility settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading accessibility settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Accessibility Manager</h2>

      {/* Visual Settings */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="text-[var(--color-primary)]-600" size={20} />
          <h3 className="font-semibold">Visual Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">High Contrast Mode</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Increase contrast for better visibility</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => setSettings({ ...settings, highContrast: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Reduced Motion</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Minimize animations for sensitive users</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Text Size</label>
            <select
              value={settings.textSize}
              onChange={(e) => setSettings({ ...settings, textSize: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Keyboard Settings */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="text-green-600" size={20} />
          <h3 className="font-semibold">Keyboard Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Keyboard Navigation</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Enable keyboard shortcuts and tab navigation</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.keyboardNavigation}
                onChange={(e) => setSettings({ ...settings, keyboardNavigation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Focus Indicators</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Show clear focus indicators for keyboard users</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.focusIndicators}
                onChange={(e) => setSettings({ ...settings, focusIndicators: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Skip Links</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Add skip links for keyboard navigation</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.skipLinks}
                onChange={(e) => setSettings({ ...settings, skipLinks: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Screen Reader */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Contrast className="text-purple-600" size={20} />
          <h3 className="font-semibold">Screen Reader Support</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Screen Reader Mode</div>
            <div className="text-sm text-[var(--color-textSecondary)]">Optimize for screen reader users</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.screenReader}
              onChange={(e) => setSettings({ ...settings, screenReader: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600" />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={runAudit}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
        >
          <ZoomIn size={16} />
          Run Accessibility Audit
        </button>
        <button
          onClick={saveSettings}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
        >
          <Check size={16} />
          Save Settings
        </button>
      </div>

      {/* Audit Results */}
      {auditResults && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Accessibility Audit Results</h3>
          <div className="space-y-3">
            {auditResults.issues.map((issue, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  issue.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                  issue.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-green-50 border border-green-200'
                }`}
              >
                {issue.severity === 'critical' ? (
                  <AlertTriangle className="text-red-600 mt-0.5" size={16} />
                ) : (
                  <Check className="text-green-600 mt-0.5" size={16} />
                )}
                <div>
                  <div className="font-medium">{issue.title}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{issue.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityManager;
