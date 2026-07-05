import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw, Send, Settings, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramChannels = () => {
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    channelId: '',
    channelName: '',
    channelUsername: '',
    requires2fa: false,
    autoSyncToAnnouncements: false,
    syncIntervalHours: 1,
  });
  const toast = useToast();
  const { colors } = useColorPalette();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await axios.get('/api/telegram/channels');
      setChannels(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch channels');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingChannel) {
        await axios.put(`/telegram/channels/${editingChannel.id}`, formData);
        toast.success('Channel updated successfully');
      } else {
        await axios.post('/api/telegram/channels', formData);
        toast.success('Channel created successfully');
      }
      setShowModal(false);
      setEditingChannel(null);
      resetForm();
      fetchChannels();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
    setIsLoading(false);
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      channelId: channel.channel_id,
      channelName: channel.channel_name,
      channelUsername: channel.channel_username || '',
      requires2fa: channel.requires_2fa,
      autoSyncToAnnouncements: channel.auto_sync_to_announcements,
      syncIntervalHours: channel.sync_interval_hours,
    });
    setShowModal(true);
  };

  const handleDelete = async (channelId) => {
    if (!confirm('Are you sure you want to delete this channel?')) {
      return;
    }

    try {
      await axios.delete(`/api/telegram/channels/${channelId}`);
      toast.success('Channel deleted successfully');
      fetchChannels();
    } catch (err) {
      toast.error('Failed to delete channel');
    }
  };

  const handleSync = async (channelId) => {
    try {
      const response = await axios.post(`/api/telegram/channels/${channelId}/sync`);
      toast.success(`Synced ${response.data.data.syncedCount} posts`);
      fetchChannels();
    } catch (err) {
      toast.error('Failed to sync channel');
    }
  };

  const resetForm = () => {
    setFormData({
      channelId: '',
      channelName: '',
      channelUsername: '',
      requires2fa: false,
      autoSyncToAnnouncements: false,
      syncIntervalHours: 1,
    });
  };

  if (isLoading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Telegram Channels
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Manage your Telegram channel integrations
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingChannel(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            aria-label="Add new Telegram channel"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Channel
          </button>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="p-6 rounded-lg shadow-sm"
              style={{ backgroundColor: colors.surface }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                    <Send className="h-5 w-5" style={{ color: colors.primary }} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: colors.text }}>
                      {channel.channel_name}
                    </h3>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>
                      @{channel.channel_username || channel.channel_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {channel.is_active ? (
                    <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" style={{ color: 'var(--color-error)' }} aria-hidden="true" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4" style={{ color: colors.textSecondary }}>
                <div className="flex items-center justify-between">
                  <span>2FA Required:</span>
                  <span>{channel.requires_2fa ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto Sync:</span>
                  <span>{channel.auto_sync_to_announcements ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sync Interval:</span>
                  <span>{channel.sync_interval_hours}h</span>
                </div>
                {channel.last_sync_at && (
                  <div className="flex items-center justify-between">
                    <span>Last Sync:</span>
                    <span>{new Date(channel.last_sync_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(channel.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm"
                  aria-label={`Sync channel ${channel.channel_name}`}
                  style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Sync
                </button>
                <button
                  onClick={() => handleEdit(channel)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm"
                  aria-label={`Edit channel ${channel.channel_name}`}
                  style={{ backgroundColor: colors.background, color: colors.text }}
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="px-3 py-2 rounded-lg text-sm"
                  aria-label={`Delete channel ${channel.channel_name}`}
                  style={{ backgroundColor: 'var(--color-error)20', color: 'var(--color-error)' }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {channels.length === 0 && !isLoading && (
          <div className="text-center py-12 rounded-lg" style={{ backgroundColor: colors.surface }}>
            <Send className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
            <p className="text-lg font-medium" style={{ color: colors.text }}>
              No channels configured
            </p>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Add your first Telegram channel to get started
            </p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="max-w-md w-full p-6 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                {editingChannel ? 'Edit Channel' : 'Add Channel'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Channel ID
                  </label>
                  <input
                    type="text"
                    value={formData.channelId}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="-1001234567890"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={formData.channelName}
                    onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="Church Announcements"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Channel Username (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.channelUsername}
                    onChange={(e) => setFormData({ ...formData, channelUsername: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    placeholder="@church_announcements"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires2fa}
                      onChange={(e) => setFormData({ ...formData, requires2fa: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colors.text }}>Requires 2FA</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoSyncToAnnouncements}
                      onChange={(e) => setFormData({ ...formData, autoSyncToAnnouncements: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm" style={{ color: colors.text }}>Auto-sync to announcements</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Sync Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.syncIntervalHours}
                    onChange={(e) => setFormData({ ...formData, syncIntervalHours: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    min="1"
                    max="24"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingChannel(null);
                      resetForm();
                    }}
                    className="flex-1 py-2 rounded-lg"
                    aria-label="Cancel channel form"
                    style={{ backgroundColor: colors.background, color: colors.text }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg text-white"
                    aria-label={editingChannel ? 'Update channel' : 'Create channel'}
                    style={{ backgroundColor: colors.primary }}
                  >
                    {editingChannel ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramChannels;