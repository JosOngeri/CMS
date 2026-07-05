import { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import PaletteSelector from '../../components/settings/PaletteSelector';
import SettingsTabs from '../../components/settings/SettingsTabs';
import Breadcrumb from '../../components/common/Breadcrumb';
import PermissionButton from '../../components/common/PermissionButton';
import { Save, Loader2, Settings as SettingsIcon, Send, CheckCircle, XCircle, RefreshCw, Moon, Sun, Globe, Users, Building, DollarSign, Megaphone, Bell, Palette, Shield, Info, BarChart3, Smartphone, Search, FileText, Monitor, Accessibility, TestTube, Flag } from 'lucide-react';
import axios from 'axios';
import { PERMISSIONS } from '../../constants/permissions';
import { FEATURE_FLAGS } from '../../config/featureFlags';

function SettingsOriginal() {
  const { settings, loading, updateSettings, getSetting } = useSettings();
  const { user } = useAuth();
  const { colors, setPalette, updateColors } = useColorPalette();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState({ connected: false, checking: false });
  const [syncing, setSyncing] = useState(false);
  const [tgStep, setTgStep] = useState(1); // 1=phone, 2=code, 3=channel
  const [tgPhone, setTgPhone] = useState('+254736075771');
  const [tgCode, setTgCode] = useState('');
  const [tgChannel, setTgChannel] = useState('@sdakiserianmain');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgChannels, setTgChannels] = useState([]);
  const [tgChannelsLoading, setTgChannelsLoading] = useState(false);
  const [tgChannelMode, setTgChannelMode] = useState('list'); // 'list' or 'manual'
  const [activeTab, setActiveTab] = useState('general')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [systemHealth, setSystemHealth] = useState(null)
  const [backupLogs, setBackupLogs] = useState([])
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([])
  const [showSystemHealth, setShowSystemHealth] = useState(false)
  const [showBackupLogs, setShowBackupLogs] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)

  useEffect(() => {
    if (!loading) {
      setLocalSettings(settings);
      // Load current palette from settings
      const currentPalette = {
        name: 'Custom',
        primary: getSetting('primary_color') || colors.primary,
        secondary: getSetting('secondary_color') || colors.secondary,
        background: getSetting('background_color') || colors.background,
        surface: colors.surface,
        text: getSetting('text_color') || colors.text,
      };
      setSelectedPalette(currentPalette);
    }
  }, [loading, settings, getSetting, colors]);

  const handlePaletteSelect = async (palette) => {
    setSelectedPalette(palette);
    setLocalSettings({
      ...localSettings,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      background_color: palette.background,
      text_color: palette.text,
    });
    // Apply immediately for preview
    updateColors(palette);
    // Auto-save to database
    try {
      await updateSettings([
        { key: 'primary_color', value: palette.primary },
        { key: 'secondary_color', value: palette.secondary },
        { key: 'background_color', value: palette.background },
        { key: 'text_color', value: palette.text },
      ]);
      toast.success('Color palette saved');
    } catch (error) {
      toast.error('Failed to save palette');
    }
  };


  const handleSave = async () => {
    // Validate before saving
    if (!validateAll()) {
      toast.error('Please fix validation errors before saving')
      return
    }

    setSaving(true);
    try {
      const settingsArray = Object.entries(localSettings).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      await updateSettings(settingsArray);
      toast.success('Settings saved successfully');
      setHasUnsavedChanges(false)
    } catch (error) {
      toast.error(error.error || 'Failed to save settings');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setLocalSettings(settings)
    setHasUnsavedChanges(false)
    setValidationErrors({})
    toast.info('Settings reset to last saved values')
  }

  const handleExportSettings = async () => {
    try {
      const response = await axios.get('/api/settings/export/data', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `settings_export_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Failed to export settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post('/api/settings/import/data', formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Settings imported successfully');
      // Reload settings
      window.location.reload();
    } catch (error) {
      console.error('Failed to import settings:', error);
      toast.error('Failed to import settings');
    }
  };

  const handleResetToDefaults = async (category) => {
    if (!confirm('Are you sure you want to reset settings to defaults?')) return;
    try {
      await axios.post('/api/settings/reset', { category }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Settings reset to defaults');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const handleGetSystemHealth = async () => {
    try {
      const response = await axios.get('/api/settings/system/health', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSystemHealth(response.data.data);
      setShowSystemHealth(true);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      toast.error('Failed to fetch system health');
    }
  };

  const handleCreateBackup = async () => {
    try {
      toast.loading('Creating backup...');
      await axios.post('/api/settings/backup/create', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Backup created successfully');
      handleGetBackupLogs();
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const handleGetBackupLogs = async () => {
    try {
      const response = await axios.get('/api/settings/backup/logs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBackupLogs(response.data.data || []);
      setShowBackupLogs(true);
    } catch (error) {
      console.error('Failed to fetch backup logs:', error);
      toast.error('Failed to fetch backup logs');
    }
  };

  const handleSetMaintenanceMode = async (enabled) => {
    try {
      await axios.post('/api/settings/maintenance/mode', { enabled }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to set maintenance mode:', error);
      toast.error('Failed to set maintenance mode');
    }
  };

  const handleScheduleMaintenance = async (scheduleData) => {
    try {
      await axios.post('/api/settings/maintenance/schedule', scheduleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Maintenance scheduled successfully');
      handleGetMaintenanceSchedules();
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      toast.error('Failed to schedule maintenance');
    }
  };

  const handleGetMaintenanceSchedules = async () => {
    try {
      const response = await axios.get('/api/settings/maintenance/schedules', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMaintenanceSchedules(response.data.data || []);
      setShowMaintenance(true);
    } catch (error) {
      console.error('Failed to fetch maintenance schedules:', error);
      toast.error('Failed to fetch maintenance schedules');
    }
  };

  const handleInputChange = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value });
    setHasUnsavedChanges(true)
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: null }))
    }
  };

  const validateField = (key, value) => {
    const errors = {}
    
    // Email validation
    if (key === 'contact_email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        errors[key] = 'Please enter a valid email address'
      }
    }
    
    // Phone validation
    if (key === 'contact_phone' && value) {
      const phoneRegex = /^\+?[\d\s-]{10,}$/
      if (!phoneRegex.test(value)) {
        errors[key] = 'Please enter a valid phone number'
      }
    }
    
    // Required fields
    if (key === 'site_name' && !value?.trim()) {
      errors[key] = 'Site name is required'
    }
    
    return errors
  }

  const validateAll = () => {
    const errors = {}
    
    // Validate all current fields
    Object.keys(localSettings).forEach(key => {
      const fieldErrors = validateField(key, localSettings[key])
      Object.assign(errors, fieldErrors)
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building },
    { id: 'treasury', label: 'Treasury', icon: DollarSign },
    { id: 'sms', label: 'Communications', icon: Megaphone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'monitoring', label: 'Monitoring', icon: Monitor },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'testing', label: 'Testing', icon: TestTube },
    { id: 'documentation', label: 'Documentation', icon: FileText },
    ...(user?.roles?.includes('Super Admin') ? [{ id: 'feature-flags', label: 'Feature Flags', icon: Flag }] : []),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]-600" />
      </div>
    );
  }

  const isAdmin = user?.roles?.includes('Super Admin') || user?.roles?.includes('Pastor') || user?.roles?.includes('First Elder');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* Church Information */}
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Church Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Site Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localSettings.site_name || ''}
                    onChange={(e) => handleInputChange('site_name', e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)] ${
                      validationErrors.site_name ? 'border-red-500' : 'border-[var(--color-border)]'
                    }`}
                  />
                  {validationErrors.site_name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.site_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Site Description</label>
                  <textarea
                    value={localSettings.site_description || ''}
                    onChange={(e) => handleInputChange('site_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={localSettings.contact_email || ''}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)] ${
                      validationErrors.contact_email ? 'border-red-500' : 'border-[var(--color-border)]'
                    }`}
                  />
                  {validationErrors.contact_email && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.contact_email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={localSettings.contact_phone || ''}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)] ${
                      validationErrors.contact_phone ? 'border-red-500' : 'border-[var(--color-border)]'
                    }`}
                  />
                  {validationErrors.contact_phone && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.contact_phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* System Settings */}
            {user?.roles?.includes('Super Admin') && (
              <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">System Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text)]">Maintenance Mode</label>
                      <p className="text-sm text-[var(--color-textSecondary)]">Put site in maintenance mode</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSettings.maintenance_mode === 'true'}
                      onChange={(e) => handleInputChange('maintenance_mode', e.target.checked.toString())}
                      className="h-5 w-5 text-primary focus:ring-primary border-[var(--color-border)] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Max Upload Size (bytes)</label>
                    <input
                      type="number"
                      value={localSettings.max_upload_size || ''}
                      onChange={(e) => handleInputChange('max_upload_size', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'members':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Member Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text)]">Enable Registration</label>
                    <p className="text-sm text-[var(--color-textSecondary)]">Allow new users to register</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enable_registration === 'true'}
                    onChange={(e) => handleInputChange('enable_registration', e.target.checked.toString())}
                    className="h-5 w-5 text-primary focus:ring-primary border-[var(--color-border)] rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'departments':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Settings</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Department-specific settings will be added here.</p>
            </div>
          </div>
        )

      case 'treasury':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Financial Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Default Currency</label>
                  <select
                    value={localSettings.currency || 'KES'}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)] text-[var(--color-text)]"
                  >
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'sms':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">SMS Configuration</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">SMS provider settings will be added here.</p>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text)]">Email Notifications</label>
                    <p className="text-sm text-[var(--color-textSecondary)]">Enable email notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.email_notifications === 'true'}
                    onChange={(e) => handleInputChange('email_notifications', e.target.checked.toString())}
                    className="h-5 w-5 text-primary focus:ring-primary border-[var(--color-border)] rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            {/* Color Palette */}
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Color Palette</h3>
              <PaletteSelector selectedPalette={selectedPalette} onSelect={handlePaletteSelect} />
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Authentication Settings</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Security settings will be added here.</p>
            </div>
          </div>
        )

      case 'monitoring':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">System Monitoring</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Monitor system performance and health.</p>
            </div>
          </div>
        )

      case 'seo':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">SEO Settings</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Configure search engine optimization settings.</p>
            </div>
          </div>
        )

      case 'accessibility':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Accessibility Settings</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Configure accessibility options for the site.</p>
            </div>
          </div>
        )

      case 'mobile':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Mobile App Settings</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Configure mobile application settings.</p>
            </div>
          </div>
        )

      case 'testing':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Testing Tools</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">Testing and debugging tools.</p>
            </div>
          </div>
        )

      case 'documentation':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Documentation</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">System documentation and guides.</p>
            </div>
          </div>
        )

      case 'feature-flags':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] shadow rounded-lg p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Tab Structure Feature Flags</h3>
              <p className="text-sm text-[var(--color-textSecondary)] mb-6">Control which tab structure approach users see. Changes affect users based on their user ID.</p>
              
              <div className="space-y-6">
                {/* Master Switch */}
                <div className="border-b border-[var(--color-border)] pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-[var(--color-text)]">Alternative Tab Structure (Master Switch)</h4>
                      <p className="text-sm text-[var(--color-textSecondary)]">Enable alternative tab structure globally</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={FEATURE_FLAGS.USE_ALTERNATIVE_TAB_STRUCTURE}
                      onChange={(e) => {
                        // This would need to update the actual feature flags file
                        toast.info('Feature flag update requires code change. Modify config/featureFlags.js');
                      }}
                      className="h-5 w-5 text-primary focus:ring-primary border-[var(--color-border)] rounded"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-[var(--color-textSecondary)]">Percentage of users:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={FEATURE_FLAGS.ALTERNATIVE_TABS_PERCENTAGE}
                      onChange={(e) => {
                        toast.info('Feature flag update requires code change. Modify config/featureFlags.js');
                      }}
                      className="w-20 px-3 py-1 border border-[var(--color-border)] rounded bg-[var(--color-surface)] text-[var(--color-text)]"
                    />
                    <span className="text-sm text-[var(--color-textSecondary)]">%</span>
                  </div>
                </div>

                {/* Individual Section Flags */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--color-text)]">Individual Section Controls</h4>
                  
                  {['Departments', 'Resources', 'Insights', 'Administration', 'Settings'].map((section) => {
                    const flagKey = `${section.toUpperCase()}_USE_ALTERNATIVE`;
                    const percentKey = `${section.toUpperCase()}_ALTERNATIVE_PERCENTAGE`;
                    return (
                      <div key={section} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
                        <div>
                          <h5 className="font-medium text-[var(--color-text)]">{section}</h5>
                          <p className="text-sm text-[var(--color-textSecondary)]">
                            Currently: {FEATURE_FLAGS[flagKey] ? 'Alternative' : 'Original'} ({FEATURE_FLAGS[percentKey]}%)
                          </p>
                        </div>
                        <span className="text-xs text-[var(--color-textSecondary)]">Edit in config/featureFlags.js</span>
                      </div>
                    );
                  })}
                </div>

                {/* Info Box */}
                <div className="bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-[var(--color-primary)]-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-[var(--color-primary)]-800 mb-1">How to Update Feature Flags</h5>
                      <p className="text-sm text-[var(--color-primary)]-700">
                        To update feature flags, edit the <code className="bg-[var(--color-primary)]-100 px-1 py-0.5 rounded">frontend/src/config/featureFlags.js</code> file. 
                        Changes require a redeploy to take effect. Users are assigned to test groups based on their user ID modulo 100.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">Settings</h1>
                <p className="mt-2 text-[var(--color-textSecondary)]">Manage your website configuration and preferences</p>
              </div>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Unsaved changes
                </span>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} persistKey="settings-active-tab" />

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-3">
          {hasUnsavedChanges && (
            <PermissionButton
              permission={PERMISSIONS.SETTINGS_EDIT}
              buttonProps={{
                onClick: handleReset,
                className: "px-6 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]  text-[var(--color-text)] transition-colors",
              }}
            >
              Reset
            </PermissionButton>
          )}
          <PermissionButton
            permission={PERMISSIONS.SETTINGS_EDIT}
            buttonProps={{
              onClick: handleSave,
              disabled: saving || !hasUnsavedChanges,
              className: "flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
            }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </PermissionButton>
        </div>
      </div>
    </div>
  );
}

export default SettingsOriginal;
