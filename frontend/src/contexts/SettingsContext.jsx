import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPublicSettings = useCallback(async () => {
    try {
      let url = '/api/settings/public';
      const stored = localStorage.getItem('msabato_church');
      if (stored) {
        const church = JSON.parse(stored);
        if (church?.slug) url += `?church=${encodeURIComponent(church.slug)}`;
      }
      const response = await axios.get(url);
      setSettings(response.data.data?.settings || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicSettings();
    const handler = () => fetchPublicSettings();
    window.addEventListener('msabato:church-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('msabato:church-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [fetchPublicSettings]);

  const updateSettings = useCallback(async (settingsData) => {
    try {
      const response = await axios.put('/api/settings/bulk', { settings: settingsData });
      await fetchPublicSettings();
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update settings' };
    }
  }, [fetchPublicSettings]);

  const getSetting = useCallback((key, defaultValue = null) => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }, [settings]);

  const value = useMemo(() => ({ settings, loading, updateSettings, getSetting, fetchPublicSettings }), [settings, loading, updateSettings, getSetting, fetchPublicSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
