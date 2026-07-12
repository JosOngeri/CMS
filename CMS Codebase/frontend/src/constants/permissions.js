/**
 * Permission constants and module-permission mappings
 * Defines which permissions are required for each module/function
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Members
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
  
  // Treasury
  TREASURY_VIEW: 'treasury.view',
  TREASURY_MANAGE: 'treasury.manage',
  TREASURY_REPORTS: 'treasury.reports',
  TREASURY_TRANSACTIONS: 'treasury.transactions',
  TREASURY_BUDGETS: 'treasury.budgets',
  
  // SMS
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
  
  // Approvals
  APPROVALS_VIEW: 'approvals.view',
  APPROVALS_REQUEST: 'approvals.request',
  APPROVALS_APPROVE: 'approvals.approve',
  APPROVALS_REJECT: 'approvals.reject',
  APPROVALS_MANAGE: 'approvals.manage',
  
  // Users
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
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_EXPORT: 'reports.export',
  
  // Content
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_ADVANCED: 'analytics.advanced',
  
  // Security
  SECURITY_VIEW: 'security.view',
  SECURITY_MANAGE: 'security.manage',
  SECURITY_AUDIT: 'security.audit',
  
  // Telegram
  TELEGRAM_VIEW: 'telegram.view',
  TELEGRAM_MANAGE: 'telegram.manage',
  TELEGRAM_BROADCAST: 'telegram.broadcast',
  
  // Mobile
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
  
  // Testing
  TESTING_VIEW: 'testing.view',
  TESTING_EXECUTE: 'testing.execute',
  
  // Documentation
  DOCUMENTATION_VIEW: 'documentation.view',
  DOCUMENTATION_EDIT: 'documentation.edit',
};

/**
 * Module permission requirements
 * Maps each module route to the required permission(s)
 */
export const MODULE_PERMISSIONS = {
  '/dashboard': [PERMISSIONS.DASHBOARD_VIEW],
  '/dashboard/overview': [PERMISSIONS.DASHBOARD_VIEW],
  '/dashboard/members': [PERMISSIONS.MEMBERS_VIEW],
  '/dashboard/departments': [PERMISSIONS.DEPARTMENTS_VIEW],
  '/dashboard/gallery': [PERMISSIONS.GALLERY_VIEW],
  '/dashboard/admin/documents': [PERMISSIONS.DOCUMENTS_VIEW],
  '/dashboard/treasury': [PERMISSIONS.TREASURY_VIEW],
  '/dashboard/sms': [PERMISSIONS.SMS_VIEW],
  '/dashboard/announcements': [PERMISSIONS.ANNOUNCEMENTS_VIEW],
  '/dashboard/approvals': [PERMISSIONS.APPROVALS_VIEW],
  '/dashboard/users': [PERMISSIONS.USERS_VIEW],
  '/dashboard/admin/settings': [PERMISSIONS.SETTINGS_VIEW],
  '/dashboard/events': [PERMISSIONS.EVENTS_VIEW],
  '/dashboard/collections': [PERMISSIONS.COLLECTIONS_VIEW_OWN],
  '/dashboard/reports': [PERMISSIONS.REPORTS_VIEW],
  '/dashboard/content': [PERMISSIONS.CONTENT_VIEW],
  '/dashboard/analytics': [PERMISSIONS.ANALYTICS_VIEW],
  '/dashboard/security': [PERMISSIONS.SECURITY_VIEW],
  '/dashboard/telegram': [PERMISSIONS.TELEGRAM_VIEW],
  '/dashboard/mobile': [PERMISSIONS.MOBILE_VIEW],
  '/dashboard/monitoring': [PERMISSIONS.MONITORING_VIEW],
  '/dashboard/seo': [PERMISSIONS.SEO_VIEW],
  '/dashboard/accessibility': [PERMISSIONS.ACCESSIBILITY_VIEW],
  '/dashboard/testing': [PERMISSIONS.TESTING_VIEW],
  '/dashboard/documentation': [PERMISSIONS.DOCUMENTATION_VIEW],
};

/**
 * Role-based permission mappings
 * Defines which permissions each role has by default
 */
export const ROLE_PERMISSIONS = {
  'Super Admin': Object.values(PERMISSIONS), // All permissions
  'Pastor': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_EDIT,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DEPARTMENTS_MANAGE,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.TREASURY_MANAGE,
    PERMISSIONS.TREASURY_REPORTS,
    PERMISSIONS.SMS_VIEW,
    PERMISSIONS.SMS_SEND,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.ANNOUNCEMENTS_PUBLISH,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SECURITY_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_ADD_OWN,
    PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
  ],
  'First Elder': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DEPARTMENTS_MANAGE,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.TREASURY_REPORTS,
    PERMISSIONS.SMS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_ADD_OWN,
    PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
  ],
  'Department Head': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DEPARTMENTS_EDIT,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.SMS_VIEW,
    PERMISSIONS.SMS_SEND,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.APPROVALS_VIEW,
    PERMISSIONS.APPROVALS_REQUEST,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.PAYMENTS_DOWNLOAD_RECEIPT,
    PERMISSIONS.COLLECTIONS_VIEW_OWN,
    PERMISSIONS.COLLECTIONS_ADD_OWN,
    PERMISSIONS.COLLECTIONS_DOWNLOAD_STATEMENT,
  ],
  'Member': [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.GALLERY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.CONTENT_VIEW,
  ],
};

/**
 * Check if user has required permission
 */
export const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !requiredPermission) return false;
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if user has any of the required permissions
 */
export const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !requiredPermissions) return false;
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

/**
 * Check if user has all required permissions
 */
export const hasAllPermissions = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !requiredPermissions) return false;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

/**
 * Get required permissions for a module path
 */
export const getModulePermissions = (path) => {
  return MODULE_PERMISSIONS[path] || [];
};