/**
 * WHAT THIS FILE DOES
 * -------------------
 * This is the single source of truth for every permission string the app
 * understands. It also tells the Sidebar and route guards which pages each
 * role is allowed to see.
 *
 * The backend sends a list of permission strings when a user logs in; those
 * strings MUST match the values defined here. If you add a new page that
 * needs to be gated, add its permission here, map it to a route in
 * MODULE_PERMISSIONS, and add it to the correct roles in ROLE_PERMISSIONS.
 *
 * FILES IT TALKS TO
 * -----------------
 * - Sidebar.jsx      → uses MODULE_PERMISSIONS to show/hide menu items
 * - ProtectedRoute.jsx → uses ROLE_PERMISSIONS / hasPermission
 * - usePermission.js → helper hooks for checks
 * - dashboard.routes.jsx → route-level role guards
 * - Backend login/profile response → supplies the user's actual permissions
 */

export const PERMISSIONS = {
  // Dashboard / common
  DASHBOARD_VIEW: 'dashboard.view',

  // Members / people
  MEMBERS_VIEW: 'members.view',
  MEMBERS_CREATE: 'members.create',
  MEMBERS_EDIT: 'members.edit',
  MEMBERS_DELETE: 'members.delete',
  MEMBERS_EXPORT: 'members.export',

  // Departments
  DEPARTMENTS_VIEW: 'departments.view',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_EDIT: 'departments.edit',
  DEPARTMENTS_DELETE: 'departments.delete',
  DEPARTMENTS_MANAGE: 'departments.manage',

  // Gallery
  GALLERY_VIEW: 'gallery.view',
  GALLERY_VIEW_PUBLIC: 'gallery.view_public',
  GALLERY_VIEW_ALL: 'gallery.view_all',
  GALLERY_REQUEST_UPLOAD: 'gallery.request_upload',
  GALLERY_UPLOAD: 'gallery.upload',
  GALLERY_EDIT: 'gallery.edit',
  GALLERY_DELETE: 'gallery.delete',
  GALLERY_APPROVE: 'gallery.approve',
  GALLERY_MANAGE: 'gallery.manage',

  // Documents
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_DELETE: 'documents.delete',
  DOCUMENTS_MANAGE: 'documents.manage',

  // Treasury / church finances
  TREASURY_VIEW: 'treasury.view',
  TREASURY_MANAGE: 'treasury.manage',
  TREASURY_REPORTS: 'treasury.reports',
  TREASURY_TRANSACTIONS: 'treasury.transactions',
  TREASURY_BUDGETS: 'treasury.budgets',

  // SMS / communications
  SMS_VIEW: 'sms.view',
  SMS_SEND: 'sms.send',
  SMS_MANAGE: 'sms.manage',
  SMS_TEMPLATES: 'sms.templates',
  SMS_CAMPAIGNS: 'sms.campaigns',

  // Announcements
  ANNOUNCEMENTS_VIEW: 'announcements.view',
  ANNOUNCEMENTS_CREATE: 'announcements.create',
  ANNOUNCEMENTS_EDIT: 'announcements.edit',
  ANNOUNCEMENTS_DELETE: 'announcements.delete',
  ANNOUNCEMENTS_PUBLISH: 'announcements.publish',

  // Approvals / decisions needing me
  APPROVALS_VIEW: 'approvals.view',
  APPROVALS_REQUEST: 'approvals.request',
  APPROVALS_APPROVE: 'approvals.approve',
  APPROVALS_REJECT: 'approvals.reject',
  APPROVALS_MANAGE: 'approvals.manage',

  // Users / administration
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage_roles',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_MANAGE: 'settings.manage',

  // Events
  EVENTS_VIEW: 'events.view',
  EVENTS_CREATE: 'events.create',
  EVENTS_EDIT: 'events.edit',
  EVENTS_DELETE: 'events.delete',
  EVENTS_MANAGE: 'events.manage',

  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_VIEW_OWN: 'payments.view_own',
  PAYMENTS_DOWNLOAD_RECEIPT: 'payments.download_receipt',
  PAYMENTS_PROCESS: 'payments.process',
  PAYMENTS_REFUND: 'payments.refund',
  PAYMENTS_MANAGE: 'payments.manage',

  // Collections
  COLLECTIONS_VIEW: 'collections.view',
  COLLECTIONS_VIEW_OWN: 'collections.view_own',
  COLLECTIONS_ADD_OWN: 'collections.add_own',
  COLLECTIONS_DOWNLOAD_STATEMENT: 'collections.download_statement',
  COLLECTIONS_MANAGE: 'collections.manage',

  // Obligations / what I owe
  OBLIGATIONS_VIEW: 'obligations.view',

  // Reports (backend calls the permission category 'analytics')
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_EXPORT: 'reports.export',
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_ADVANCED: 'analytics.advanced',

  // Content
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',

  // Notifications / messages
  NOTIFICATIONS_VIEW: 'notifications.view',

  // Security
  SECURITY_VIEW: 'security.view',
  SECURITY_MANAGE: 'security.manage',
  SECURITY_AUDIT: 'security.audit',

  // Telegram
  TELEGRAM_VIEW: 'telegram.view',
  TELEGRAM_MANAGE: 'telegram.manage',
  TELEGRAM_BROADCAST: 'telegram.broadcast',

  // Mobile app
  MOBILE_VIEW: 'mobile.view',
  MOBILE_MANAGE: 'mobile.manage',

  // Monitoring
  MONITORING_VIEW: 'monitoring.view',
  MONITORING_MANAGE: 'monitoring.manage',

  // SEO
  SEO_VIEW: 'seo.view',
  SEO_MANAGE: 'seo.manage',

  // Accessibility
  ACCESSIBILITY_VIEW: 'accessibility.view',
  ACCESSIBILITY_MANAGE: 'accessibility.manage',

  // Testing tools
  TESTING_VIEW: 'testing.view',
  TESTING_EXECUTE: 'testing.execute',

  // Documentation
  DOCUMENTATION_VIEW: 'documentation.view',
  DOCUMENTATION_EDIT: 'documentation.edit',
};

/**
 * Maps each dashboard route to the permission(s) needed to see it.
 * The Sidebar uses this to decide whether a menu item appears.
 */
export const MODULE_PERMISSIONS = {
  // Home & personal
  '/dashboard': [PERMISSIONS.DASHBOARD_VIEW],
  '/dashboard/overview': [PERMISSIONS.DASHBOARD_VIEW],
  '/dashboard/profile': [PERMISSIONS.DASHBOARD_VIEW],
  '/dashboard/profile-management': [PERMISSIONS.DASHBOARD_VIEW],

  // Member essentials
  '/dashboard/obligations': [PERMISSIONS.OBLIGATIONS_VIEW],
  '/dashboard/payments/my': [PERMISSIONS.PAYMENTS_VIEW_OWN],
  '/dashboard/payments/history': [PERMISSIONS.PAYMENTS_VIEW_OWN],
  '/dashboard/collections': [PERMISSIONS.COLLECTIONS_VIEW_OWN],

  // Church information (most roles can view)
  '/dashboard/announcements': [PERMISSIONS.ANNOUNCEMENTS_VIEW],
  '/dashboard/events': [PERMISSIONS.EVENTS_VIEW],
  '/dashboard/gallery': [PERMISSIONS.GALLERY_VIEW],
  '/dashboard/documents': [PERMISSIONS.DOCUMENTS_VIEW],
  '/dashboard/content': [PERMISSIONS.CONTENT_VIEW],
  '/dashboard/notifications': [PERMISSIONS.NOTIFICATIONS_VIEW],

  // Departments
  '/dashboard/departments': [PERMISSIONS.DEPARTMENTS_VIEW],
  '/dashboard/my-departments': [PERMISSIONS.DEPARTMENTS_VIEW],
  '/dashboard/departments/handovers': [PERMISSIONS.DEPARTMENTS_VIEW],
  '/dashboard/departments/head-allocation': [PERMISSIONS.DEPARTMENTS_MANAGE],
  '/dashboard/departments/settings': [PERMISSIONS.DEPARTMENTS_MANAGE],
  '/dashboard/departments/categories': [PERMISSIONS.DEPARTMENTS_MANAGE],

  // People
  '/dashboard/members': [PERMISSIONS.MEMBERS_VIEW],
  '/dashboard/users': [PERMISSIONS.USERS_VIEW],

  // Finance / treasury
  '/dashboard/treasury': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/payments/management': [PERMISSIONS.PAYMENTS_MANAGE],
  '/dashboard/treasury/accounts': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/journal-entries': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/budgets': [PERMISSIONS.TREASURY_BUDGETS],
  '/dashboard/treasury/expenses': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/reports': [PERMISSIONS.TREASURY_REPORTS],
  '/dashboard/treasury/funds': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/reconciliations': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/contributions': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/vendors': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/projects': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/assets': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/pledges': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/recurring': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/receipts': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/treasury/analytics': [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW],

  // Reports (analytics)
  '/dashboard/reports': [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANALYTICS_VIEW],

  // Communications
  '/dashboard/sms': [PERMISSIONS.SMS_VIEW],
  '/dashboard/sms/dashboard': [PERMISSIONS.SMS_VIEW],
  '/dashboard/sms/contacts': [PERMISSIONS.SMS_VIEW],
  '/dashboard/sms/groups': [PERMISSIONS.SMS_VIEW],
  '/dashboard/telegram': [PERMISSIONS.TELEGRAM_VIEW],
  '/dashboard/telegram/auth': [PERMISSIONS.TELEGRAM_VIEW],
  '/dashboard/telegram/church': [PERMISSIONS.TELEGRAM_VIEW],

  // Administration
  '/dashboard/admin': [PERMISSIONS.USERS_VIEW],
  '/dashboard/admin/database': [PERMISSIONS.USERS_VIEW],
  '/dashboard/admin/settings': [PERMISSIONS.SETTINGS_VIEW],
  '/dashboard/admin/documents': [PERMISSIONS.DOCUMENTS_MANAGE],
  '/dashboard/security': [PERMISSIONS.SECURITY_VIEW],
  '/dashboard/monitoring': [PERMISSIONS.MONITORING_VIEW],
  '/dashboard/seo': [PERMISSIONS.SEO_VIEW],
  '/dashboard/accessibility': [PERMISSIONS.ACCESSIBILITY_VIEW],
  '/dashboard/testing': [PERMISSIONS.TESTING_VIEW],
  '/dashboard/documentation': [PERMISSIONS.DOCUMENTATION_VIEW],

  // Approvals
  '/dashboard/approvals': [PERMISSIONS.APPROVALS_VIEW],
};

/**
 * Default permission sets per role.
 * The backend is the real authority — it sends the user's actual permissions
 * at login — but this map is used as a fallback and for the Sidebar's initial
 * render before the session loads.
 *
 * KEEP IN SYNC with backend/migrations/038_role_permission_backfill.sql
 */
export const ROLE_PERMISSIONS = {
  'Super Admin': Object.values(PERMISSIONS),

  'Pastor': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MEMBERS_EDIT,
    PERMISSIONS.DEPARTMENTS_VIEW, PERMISSIONS.DEPARTMENTS_MANAGE,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.TREASURY_VIEW, PERMISSIONS.TREASURY_MANAGE, PERMISSIONS.TREASURY_REPORTS,
    PERMISSIONS.SMS_VIEW, PERMISSIONS.SMS_SEND,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE, PERMISSIONS.ANNOUNCEMENTS_PUBLISH,
    PERMISSIONS.APPROVALS_VIEW, PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.CONTENT_VIEW, PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SECURITY_VIEW,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.PAYMENTS_VIEW_OWN, PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN, PERMISSIONS.COLLECTIONS_ADD_OWN, PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.OBLIGATIONS_VIEW,
  ],

  'First Elder': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW, PERMISSIONS.DEPARTMENTS_MANAGE,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.TREASURY_VIEW, PERMISSIONS.TREASURY_REPORTS,
    PERMISSIONS.SMS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.APPROVALS_VIEW, PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN, PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN, PERMISSIONS.COLLECTIONS_ADD_OWN, PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.SECURITY_VIEW, PERMISSIONS.TELEGRAM_VIEW,
  ],

  'Treasurer': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW, PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.TREASURY_VIEW, PERMISSIONS.TREASURY_MANAGE, PERMISSIONS.TREASURY_REPORTS,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_MANAGE, PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW, PERMISSIONS.COLLECTIONS_MANAGE, PERMISSIONS.COLLECTIONS_VIEW_OWN, PERMISSIONS.COLLECTIONS_ADD_OWN,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],

  'Elder': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Church Board Member': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Deacon': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Deaconess': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Department Head': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW, PERMISSIONS.DEPARTMENTS_EDIT,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.CONTENT_VIEW, PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.SMS_VIEW, PERMISSIONS.SMS_SEND,
    // Scoped in the backend to budget-type requests on departments they head;
    // everything else is escalated to First Elder/Pastor via delegate.
    PERMISSIONS.APPROVALS_VIEW, PERMISSIONS.APPROVALS_REQUEST, PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.PAYMENTS_VIEW_OWN, PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN, PERMISSIONS.COLLECTIONS_ADD_OWN, PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],

  'Assistant Department Head': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Subcommittee Head': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SMS_VIEW,
  ],

  'Subcommittee Collector': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN, PERMISSIONS.COLLECTIONS_VIEW,
    PERMISSIONS.OBLIGATIONS_VIEW,
  ],

  'Member': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.DOCUMENTS_VIEW, PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.OBLIGATIONS_VIEW,
  ],

  'Child': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW, PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.GALLERY_VIEW, PERMISSIONS.CONTENT_VIEW,
  ],
};

// Permission helpers used by hooks, route guards, and the Sidebar.
export const hasPermission = (userPermissions, requiredPermission) =>
  !!(userPermissions && requiredPermission && userPermissions.includes(requiredPermission));

export const hasAnyPermission = (userPermissions, requiredPermissions) =>
  !!(userPermissions && requiredPermissions && requiredPermissions.some(p => userPermissions.includes(p)));

export const hasAllPermissions = (userPermissions, requiredPermissions) =>
  !!(userPermissions && requiredPermissions && requiredPermissions.every(p => userPermissions.includes(p)));

export const getModulePermissions = (path) => MODULE_PERMISSIONS[path] || [];
