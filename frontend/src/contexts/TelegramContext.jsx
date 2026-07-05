import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

const TelegramContext = createContext();

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

export const TelegramProvider = ({ children }) => {
  const [channels, setChannels] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchChannels = async () => {
    try {
      const response = await axios.get('/api/telegram/channels');
      setChannels(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch channels');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/telegram/settings');
      setSettings(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch settings');
    }
  };

  const createChannel = async (channelData) => {
    try {
      const response = await axios.post('/api/telegram/channels', channelData);
      await fetchChannels();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create channel');
      throw err;
    }
  };

  const updateChannel = async (channelId, channelData) => {
    try {
      const response = await axios.put(`/api/telegram/channels/${channelId}`, channelData);
      await fetchChannels();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update channel');
      throw err;
    }
  };

  const deleteChannel = async (channelId) => {
    try {
      await axios.delete(`/api/telegram/channels/${channelId}`);
      await fetchChannels();
    } catch (err) {
      toast.error('Failed to delete channel');
      throw err;
    }
  };

  const postToChannel = async (channelId, messageData) => {
    try {
      const response = await axios.post(`/api/telegram/channels/${channelId}/post`, messageData);
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post message');
      throw err;
    }
  };

  const syncChannel = async (channelId) => {
    try {
      const response = await axios.post(`/api/telegram/channels/${channelId}/sync`);
      return response.data;
    } catch (err) {
      toast.error('Failed to sync channel');
      throw err;
    }
  };

  const updateSettings = async (settingsData) => {
    try {
      const response = await axios.put('/api/telegram/settings', settingsData);
      await fetchSettings();
      return response.data;
    } catch (err) {
      toast.error('Failed to update settings');
      throw err;
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchSettings();
  }, []);

  const value = {
    channels,
    settings,
    isLoading,
    fetchChannels,
    fetchSettings,
    createChannel,
    updateChannel,
    deleteChannel,
    postToChannel,
    syncChannel,
    updateSettings,
  };

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};