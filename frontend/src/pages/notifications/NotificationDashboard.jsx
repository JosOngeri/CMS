/**
 * WHAT THIS FILE DOES
 * -------------------
 * The Notifications inbox. Lists everything the system has told this user
 * (approvals, memberships, department changes). Users can mark items as
 * read or delete them, and filter All / Unread / Read.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/notifications               → list
 * - backend /api/notifications/unread-count  → badge count
 * - backend /api/notifications/{id}/read     → mark one read
 * - backend /api/notifications/read-all      → mark all read
 * - backend /api/notifications/{id}          → delete
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, CheckCircle as CheckCircleIcon, Trash2, XCircle,
  Crown, Building2, Users, UserMinus, RefreshCw, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { API_ENDPOINTS } from '../../constants/api';
import { FullPageLoading } from '../../components/common/Loading';

const NotificationDashboard = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  const fetchNotifications = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.BASE);
      setNotifications(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date() })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notifications.find(n => n.id === id)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      approval_request: ClipboardList,
      membership_approved: CheckCircleIcon,
      membership_rejected: XCircle,
      admin_granted: Crown,
      admin_revoked: Crown,
      department_created: Building2,
      member_added: Users,
      member_removed: UserMinus,
      approval_approved: CheckCircleIcon,
      approval_rejected: XCircle,
      department_head_changed: RefreshCw,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      approval_request: 'bg-[var(--color-primary-light)] border-[var(--color-primary-light)] border-[var(--color-primary)]',
      membership_approved: 'bg-[var(--color-success-light)] border-[var(--color-success)]',
      membership_rejected: 'bg-[var(--color-error-light)] border-[var(--color-error)]',
      admin_granted: 'bg-[var(--color-accent-light)] border-[var(--color-accent)]',
      admin_revoked: 'bg-[var(--color-warning-light)] border-[var(--color-warning)]',
      department_created: 'bg-[var(--color-primary-light)] border-[var(--color-primary)]',
      member_added: 'bg-[var(--color-secondary-light)] border-[var(--color-secondary)]',
      member_removed: 'bg-[var(--color-error-light)] border-[var(--color-error)]',
      approval_approved: 'bg-[var(--color-success-light)] border-[var(--color-success)]',
      approval_rejected: 'bg-[var(--color-error-light)] border-[var(--color-error)]',
      department_head_changed: 'bg-[var(--color-warning-light)] border-[var(--color-warning)]',
    };
    return colors[type] || 'bg-[var(--color-background)] border-[var(--color-border)]';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  if (loading) {
    return <FullPageLoading message="Loading notifications..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Notifications</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No unread notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'read'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-[var(--color-textSecondary)] mx-auto mb-4" />
          <p className="text-[var(--color-textSecondary)] text-lg">No notifications</p>
          <p className="text-sm text-[var(--color-textSecondary)] mt-1">
            {filter === 'unread' ? 'You have no unread notifications' : 'Your notification inbox is empty'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 transition-all ${
                notification.is_read
                  ? 'bg-[var(--color-surface)] border-[var(--color-border)]'
                  : `border-l-4 ${getNotificationColor(notification.type)}`
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl text-[var(--color-textSecondary)]">
                  {(() => { const Icon = getNotificationIcon(notification.type); return <Icon className="w-6 h-6" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${notification.is_read ? 'text-[var(--color-textSecondary)]' : 'text-[var(--color-text)]'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{notification.body}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-[var(--color-textSecondary)]" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 hover:bg-[var(--color-error-light)] rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-error)]" />
                      </button>
                    </div>
                  </div>
                  {notification.link && (
                    <Link
                      to={notification.link}
                      className="inline-flex items-center gap-1 mt-3 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard;
