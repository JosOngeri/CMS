import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

/**
 * Dynamic Sidebar Loader (Phase 8)
 * Generates sidebar menu based on allocated department features
 * Replaces static menu definitions with feature-based dynamic loading
 */
const SidebarLoader = ({ departmentId }) => {
  const { user } = useAuth();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDepartmentFeatures();
  }, [departmentId]);

  const loadDepartmentFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/department-features/${departmentId}`);
      setFeatures(response.data.features || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load department features:', err);
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-[var(--color-textSecondary)]">Loading menu...</div>;
  }

  if (error) {
    return <div className="p-4 text-[var(--color-error)]">{error}</div>;
  }

  if (features.length === 0) {
    return <div className="p-4 text-[var(--color-textSecondary)]">No features allocated</div>;
  }

  // Map feature slugs to menu items
  const featureMenuMap = {
    MEMBERSHIP_MANAGEMENT: {
      label: 'Members',
      icon: 'Users',
      path: '/members',
      items: [
        { label: 'All Members', path: '/members' },
        { label: 'Add Member', path: '/members/new' },
        { label: 'Attendance', path: '/members/attendance' },
      ]
    },
    TELEGRAM_SYNC: {
      label: 'Telegram',
      icon: 'Send',
      path: '/telegram',
      items: [
        { label: 'Channels', path: '/telegram/channels' },
        { label: 'Posts', path: '/telegram/posts' },
        { label: 'Settings', path: '/telegram/settings' },
      ]
    },
    SMS_NOTIFICATIONS: {
      label: 'SMS',
      icon: 'MessageSquare',
      path: '/sms',
      items: [
        { label: 'Campaigns', path: '/sms/campaigns' },
        { label: 'Templates', path: '/sms/templates' },
        { label: 'Analytics', path: '/sms/analytics' },
      ]
    },
    FINANCIAL_TRACKING: {
      label: 'Finance',
      icon: 'DollarSign',
      path: '/treasury',
      items: [
        { label: 'Accounts', path: '/treasury/accounts' },
        { label: 'Transactions', path: '/treasury/transactions' },
        { label: 'Budgets', path: '/treasury/budgets' },
      ]
    },
    EVENT_LOGISTICS: {
      label: 'Events',
      icon: 'Calendar',
      path: '/events',
      items: [
        { label: 'All Events', path: '/events' },
        { label: 'Calendar', path: '/events/calendar' },
        { label: 'Create Event', path: '/events/new' },
      ]
    },
  };

  return (
    <nav className="space-y-1">
      {features.map((feature) => {
        const menuConfig = featureMenuMap[feature.slug];
        if (!menuConfig) return null;

        return (
          <div key={feature.id} className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 text-[var(--color-text)] font-medium">
              <span>{menuConfig.label}</span>
            </div>
            {menuConfig.items && menuConfig.items.length > 0 && (
              <ul className="ml-4 space-y-1">
                {menuConfig.items.map((item) => (
                  <li key={item.path}>
                    <a
                      href={item.path}
                      className="block px-3 py-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)] rounded-md transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarLoader;
