import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
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
  const [isPosting, setIsPosting] = useState(false);
  const [isSyncing, setIsSyncing] = useState({});
  const [isUpdating, setIsUpdating] = useState({});
  const [messageHistory, setMessageHistory] = useState({});
  const [channelAnalytics, setChannelAnalytics] = useState({});
  const { api } = useAuth();
  const toast = useToast();

  const fetchChannels = async () => {
    try {
      const response = await api.get('/telegram/channels');
      setChannels(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch channels');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/telegram/settings');
      setSettings(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch settings');
    }
  };

  const createChannel = async (channelData) => {
    try {
      const response = await api.post('/telegram/channels', channelData);
      await fetchChannels();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create channel');
      throw err;
    }
  };

  const updateChannel = async (channelId, channelData) => {
    try {
      setIsUpdating(prev => ({ ...prev, [channelId]: true }));
      const response = await api.put(`/telegram/channels/${channelId}`, channelData);
      await fetchChannels();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update channel');
      throw err;
    } finally {
      setIsUpdating(prev => ({ ...prev, [channelId]: false }));
    }
  };

  const deleteChannel = async (channelId) => {
    try {
      await api.delete(`/telegram/channels/${channelId}`);
      await fetchChannels();
    } catch (err) {
      toast.error('Failed to delete channel');
      throw err;
    }
  };

  const postToChannel = async (channelId, messageData) => {
    try {
      setIsPosting(true);
      const response = await api.post(`/telegram/channels/${channelId}/post`, messageData);
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post message');
      throw err;
    } finally {
      setIsPosting(false);
    }
  };

  const syncChannel = async (channelId) => {
    try {
      setIsSyncing(prev => ({ ...prev, [channelId]: true }));
      const response = await api.post(`/telegram/channels/${channelId}/sync`);
      return response.data;
    } catch (err) {
      toast.error('Failed to sync channel');
      throw err;
    } finally {
      setIsSyncing(prev => ({ ...prev, [channelId]: false }));
    }
  };

  const updateSettings = async (settingsData) => {
    try {
      const response = await api.put('/telegram/settings', settingsData);
      await fetchSettings();
      return response.data;
    } catch (err) {
      toast.error('Failed to update settings');
      throw err;
    }
  };

  const fetchChannelHistory = async (channelId, limit = 50) => {
    try {
      const response = await api.get(`/telegram/channels/${channelId}/history`, { params: { limit } });
      setMessageHistory(prev => ({ ...prev, [channelId]: response.data.data }));
      return response.data.data;
    } catch (err) {
      toast.error('Failed to fetch channel history');
      throw err;
    }
  };

  const fetchChannelAnalytics = async (channelId) => {
    try {
      const response = await api.get(`/telegram/channels/${channelId}/analytics`);
      setChannelAnalytics(prev => ({ ...prev, [channelId]: response.data.data }));
      return response.data.data;
    } catch (err) {
      toast.error('Failed to fetch channel analytics');
      throw err;
    }
  };

  const createWebhook = async (channelId, url) => {
    try {
      const response = await api.post(`/telegram/channels/${channelId}/webhook`, { url });
      return response.data;
    } catch (err) {
      toast.error('Failed to create webhook');
      throw err;
    }
  };

  const deleteWebhook = async (channelId) => {
    try {
      const response = await api.delete(`/telegram/channels/${channelId}/webhook`);
      return response.data;
    } catch (err) {
      toast.error('Failed to delete webhook');
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
    isPosting,
    isSyncing,
    isUpdating,
    messageHistory,
    channelAnalytics,
    fetchChannels,
    fetchSettings,
    createChannel,
    updateChannel,
    deleteChannel,
    postToChannel,
    syncChannel,
    updateSettings,
    fetchChannelHistory,
    fetchChannelAnalytics,
    createWebhook,
    deleteWebhook,
  };

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};