import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Users,
  Building,
  DollarSign,
  Megaphone,
  Bell,
  Palette,
  Shield,
  Monitor,
  Smartphone,
  Accessibility,
  FileText,
  Save,
  Loader2
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import PaletteSelector from '../../components/settings/PaletteSelector';
import Breadcrumb from '../../components/common/Breadcrumb';

const SettingsAlternative = () => {
  const { settings, loading, updateSettings, getSetting } = useSettings();
  const { user } = useAuth();
  const { colors, setPalette, updateColors } = useColorPalette();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['general']);

  const settingsSections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building },
    { id: 'treasury', label: 'Treasury', icon: DollarSign },
    { id: 'communications', label: 'Communications', icon: Megaphone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'monitoring', label: 'Monitoring', icon: Monitor },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'documentation', label: 'Documentation', icon: FileText }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handlePaletteSelect = async (palette) => {
    setSelectedPalette(palette);
    setLocalSettings({
      ...localSettings,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      background_color: palette.background,
      text_color: palette.text,
    });
    updateColors(palette);
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
    setSaving(true);
    try {
      const settingsArray = Object.entries(localSettings).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      await updateSettings(settingsArray);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const handleInputChange = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const filteredSections = settingsSections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Site Name</label>
              <input
                type="text"
                value={localSettings.site_name || ''}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Site Description</label>
              <textarea
                value={localSettings.site_description || ''}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-4">
            <PaletteSelector selectedPalette={selectedPalette} onSelect={handlePaletteSelect} />
          </div>
        );
      default:
        return (
          <div className="text-center py-8 text-[var(--color-textSecondary)]">
            Settings for {sectionId} will be added here
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage your website configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
        <input
          type="text"
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 bg-[var(--color-surface)] text-[var(--color-text)]"
        />
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections.includes(section.id);
          
          return (
            <div
              key={section.id}
              className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-background)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className="w-5 h-5 text-[var(--color-primary)]-600" />
                  <span className="font-medium text-[var(--color-text)]">{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-[var(--color-textSecondary)]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[var(--color-textSecondary)]" />
                )}
              </button>
              
              {isExpanded && (
                <div className="p-4 border-t border-[var(--color-border)]">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          No settings found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default SettingsAlternative;
