import { useState, useEffect } from 'react';
import { Bell, X, Clock, Check, AlertTriangle, Info, CheckCircle, Filter, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const NotificationCenter = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get(`/notifications?filter=${filter}`);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.put(`/notifications/${id}/dismiss`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      toast.error('Failed to dismiss notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const iconMap = {
    alert: AlertTriangle,
    info: Info,
    success: CheckCircle,
    system: Bell
  };

  const colorMap = {
    alert: 'text-red-600 bg-red-100',
    info: 'text-[var(--color-primary)]-600 bg-[var(--color-primary)]-100',
    success: 'text-green-600 bg-green-100',
    system: 'text-[var(--color-textSecondary)] bg-[var(--color-surface)]'
  };

  const filteredNotifications = notifications.filter(notification =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
            aria-label="Mark all notifications as read"
          >
            <Check size={16} aria-hidden="true" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            aria-label="Search notifications"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
          aria-label="Filter notifications"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="alert">Alerts</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.map((notification) => {
          const Icon = iconMap[notification.type] || Bell;
          return (
            <div
              key={notification.id}
              className={`bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${colorMap[notification.type]}`}>
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{notification.title}</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                        <Clock size={12} aria-hidden="true" />
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="p-1 hover:bg-[var(--color-surface)] rounded"
                        aria-label={`Dismiss notification: ${notification.title}`}
                      >
                        <X size={16} className="text-[var(--color-textSecondary)]" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-textSecondary)] mt-1">{notification.message}</p>
                  {notification.action_url && (
                    <button className="text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700 mt-2">
                      View Details →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <Bell size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
          <p>No notifications found</p>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
