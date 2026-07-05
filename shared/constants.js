/**
 * Shared API Endpoints
 * Centralized API endpoint configuration for the entire application
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh',
    MFA_SETUP: '/api/auth/mfa/setup',
    MFA_VERIFY: '/api/auth/mfa/verify',
    CHANGE_PASSWORD: '/api/auth/change-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DETAIL: '/api/users/:id',
    CREATE: '/api/users',
    UPDATE: '/api/users/:id',
    DELETE: '/api/users/:id',
    ROLES: '/api/users/:id/roles',
    PERMISSIONS: '/api/users/:id/permissions',
  },

  // Members
  MEMBERS: {
    LIST: '/api/members',
    DETAIL: '/api/members/:id',
    CREATE: '/api/members',
    UPDATE: '/api/members/:id',
    DELETE: '/api/members/:id',
    SEARCH: '/api/members/search',
  },

  // Departments
  DEPARTMENTS: {
    LIST: '/api/departments',
    DETAIL: '/api/departments/:id',
    CREATE: '/api/departments',
    UPDATE: '/api/departments/:id',
    DELETE: '/api/departments/:id',
    MEMBERS: '/api/departments/:id/members',
    MEETINGS: '/api/departments/:id/meetings',
    TASKS: '/api/departments/:id/tasks',
    RESOURCES: '/api/departments/:id/resources',
  },

  // Treasury
  TREASURY: {
    ACCOUNTS: '/api/treasury/accounts',
    TRANSACTIONS: '/api/treasury/transactions',
    BUDGETS: '/api/treasury/budgets',
    REPORTS: '/api/treasury/reports',
    DASHBOARD: '/api/treasury/dashboard',
  },

  // Payments
  PAYMENTS: {
    METHODS: '/api/payments/methods',
    RECORDS: '/api/payments/records',
    REFUNDS: '/api/payments/refunds',
    M_PESA_INITIATE: '/api/payments/mpesa/initiate',
    M_PESA_CALLBACK: '/api/payments/mpesa/callback',
  },

  // Gallery
  GALLERY: {
    ALBUMS: '/api/gallery/albums',
    PHOTOS: '/api/gallery/photos',
    TAGS: '/api/gallery/tags',
    COMMENTS: '/api/gallery/comments',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: '/api/notifications/:id/read',
    PREFERENCES: '/api/notifications/preferences',
    TYPES: '/api/notifications/types',
  },

  // Settings
  SETTINGS: {
    ALL: '/api/settings',
    CATEGORY: '/api/settings/:category',
    EXPORT: '/api/settings/export',
    IMPORT: '/api/settings/import',
  },

  // Search
  SEARCH: {
    GLOBAL: '/api/search/global',
    ADVANCED: '/api/search/advanced',
    SUGGESTIONS: '/api/search/suggestions',
    SAVED: '/api/search/saved',
  },

  // Health
  HEALTH: {
    STATUS: '/api/health',
    DATABASE: '/api/health/db',
    REDIS: '/api/health/redis',
  },
};

export default API_ENDPOINTS;
