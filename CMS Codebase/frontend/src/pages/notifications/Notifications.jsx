import React, { useState } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Trash2, Filter, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Notifications = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      // Backend returns { success, data: [...] }
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Backend route: POST /:notificationId/read
      await api.post(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      // Backend route: POST /mark-all-read
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium': return <Info className="w-5 h-5 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-[var(--color-primary)]-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-blue-500';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  }).filter(n => {
    if (priorityFilter === 'all') return true;
    return n.priority === priorityFilter;
  });

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading notifications...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-textSecondary)]">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 bg-[var(--color-surface)]  rounded-lg border-l-4 ${
                notification.is_read ? 'border-[var(--color-border)] ' : 'border-[var(--color-primary)]-500'
              } ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getPriorityIcon(notification.priority)}
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.is_read && (
                      <span className="px-2 py-0.5 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800 text-xs rounded-full">New</span>
                    )}
                  </div>
                  <p className="text-[var(--color-textSecondary)] ">{notification.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-textSecondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    <span className="capitalize">{notification.priority} priority</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
