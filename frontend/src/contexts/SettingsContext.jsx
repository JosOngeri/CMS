import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicSettings();
  }, []);

  const fetchPublicSettings = async () => {
    try {
      const response = await axios.get('/api/settings/public');
      setSettings(response.data.data?.settings || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (settingsData) => {
    try {
      const response = await axios.put('/api/settings/bulk', { settings: settingsData });
      await fetchPublicSettings();
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update settings' };
    }
  };

  const getSetting = (key, defaultValue = null) => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  const value = useMemo(() => ({ settings, loading, updateSettings, getSetting, fetchPublicSettings }), [settings, loading, updateSettings, getSetting, fetchPublicSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
