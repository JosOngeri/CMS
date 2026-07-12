/**
 * Feature Registry (Phase 8)
 * Maps feature slugs to React components
 * Enables dynamic component loading based on feature allocations
 */

// Feature component imports (would be dynamically loaded in production)
// import MembershipManagement from './features/MembershipManagement';
// import TelegramSync from './features/TelegramSync';
// etc.

const featureRegistry = {
  MEMBERSHIP_MANAGEMENT: {
    component: null, // Would be actual component
    name: 'Membership Management',
    category: 'core',
    icon: 'Users',
    route: '/dashboard/membership',
    permissions: ['read:members', 'write:members']
  },
  TELEGRAM_SYNC: {
    component: null,
    name: 'Telegram Integration',
    category: 'communication',
    icon: 'Send',
    route: '/dashboard/telegram',
    permissions: ['read:telegram', 'write:telegram']
  },
  SMS_NOTIFICATIONS: {
    component: null,
    name: 'SMS Notifications',
    category: 'communication',
    icon: 'MessageSquare',
    route: '/dashboard/sms',
    permissions: ['read:sms', 'write:sms']
  },
  FINANCIAL_TRACKING: {
    component: null,
    name: 'Financial Tracking',
    category: 'treasury',
    icon: 'DollarSign',
    route: '/dashboard/finance',
    permissions: ['read:finance', 'write:finance']
  },
  EVENT_LOGISTICS: {
    component: null,
    name: 'Event Management',
    category: 'events',
    icon: 'Calendar',
    route: '/dashboard/events',
    permissions: ['read:events', 'write:events']
  },
  AI_ANNOUNCEMENT_DRAFTING: {
    component: null,
    name: 'AI Announcement Drafting',
    category: 'content',
    icon: 'Sparkles',
    route: '/dashboard/ai-announcements',
    permissions: ['read:content', 'write:content']
  },
  ATTENDANCE_TRACKING: {
    component: null,
    name: 'Attendance Tracking',
    category: 'core',
    icon: 'CheckSquare',
    route: '/dashboard/attendance',
    permissions: ['read:attendance', 'write:attendance']
  },
  DOCUMENT_MANAGEMENT: {
    component: null,
    name: 'Document Management',
    category: 'content',
    icon: 'FileText',
    route: '/dashboard/documents',
    permissions: ['read:documents', 'write:documents']
  },
  REPORT_GENERATION: {
    component: null,
    name: 'Report Generation',
    category: 'treasury',
    icon: 'BarChart',
    route: '/dashboard/reports',
    permissions: ['read:reports']
  },
  PRAYER_REQUESTS: {
    component: null,
    name: 'Prayer Requests',
    category: 'pastoral',
    icon: 'Heart',
    route: '/dashboard/prayer',
    permissions: ['read:prayer', 'write:prayer']
  },
  VOLUNTEER_MANAGEMENT: {
    component: null,
    name: 'Volunteer Management',
    category: 'core',
    icon: 'Users',
    route: '/dashboard/volunteers',
    permissions: ['read:volunteers', 'write:volunteers']
  },
  RESOURCE_SCHEDULING: {
    component: null,
    name: 'Resource Scheduling',
    category: 'operations',
    icon: 'Clock',
    route: '/dashboard/resources',
    permissions: ['read:resources', 'write:resources']
  }
};

/**
 * Get feature configuration by slug
 */
export const getFeature = (slug) => {
  return featureRegistry[slug] || null;
};

/**
 * Get all features
 */
export const getAllFeatures = () => {
  return Object.values(featureRegistry);
};

/**
 * Get features by category
 */
export const getFeaturesByCategory = (category) => {
  return Object.values(featureRegistry).filter(f => f.category === category);
};

/**
 * Check if user has required permissions for a feature
 */
export const hasFeaturePermissions = (slug, userPermissions = []) => {
  const feature = getFeature(slug);
  if (!feature || !feature.permissions) return true;
  
  return feature.permissions.some(perm => userPermissions.includes(perm));
};

export default featureRegistry;
