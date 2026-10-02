/**
 * WHAT THIS FILE DOES
 * -------------------
 * A central list of every REST endpoint the web app calls. Keeping them
 * in one place means we never have to hunt for hard-coded URLs in components.
 *
 * IMPORTANT: the Axios client in AuthContext automatically adds `/api` to the
 * front of paths that do not start with `/api`, so all constants here are the
 * path AFTER `/api`. Because of that, singular/plural matters: the backend
 * mounts some routes under `/department` and others under `/departments`.
 *
 * FILES IT TALKS TO
 * -----------------
 * - AuthContext.jsx → axios instance auto-prefixes these paths
 * - Every page/service hook that fetches data
 * - backend/routes/*.routes.js → the real mounted paths on the server
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    PROFILE: '/auth/profile',
    REQUEST_PASSWORD_RESET: '/auth/request-password-reset',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_PASSWORD: '/auth/verify-password',
  },

  // Users & people
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    DIRECTORY: '/members',
    ACTIVITY_HISTORY: '/users/activity-history',
    CHANGE_PASSWORD: '/users/change-password',
  },

  // Announcements
  ANNOUNCEMENTS: {
    BASE: '/announcements',
    PUBLIC: '/announcements/public',
    PUBLIC_BY_ID: (id) => `/announcements/public/${id}`,
    BY_ID: (id) => `/announcements/${id}`,
  },

  // Departments — canonical plural mount. `/department/*` remains a 308
  // redirect for older clients, but new code should always use `/departments/*`.
  DEPARTMENTS: {
    BASE: '/departments',
    BY_ID: (id) => `/departments/${id}`,
    AVAILABLE: '/departments/available',
    JOIN: '/departments/join',
    LEAVE: (id) => `/departments/leave/${id}`,
    MY_DEPARTMENTS: '/departments/my-departments',
    PENDING_REQUESTS: (id) => `/departments/${id}/pending-requests`,
    APPROVE_REQUEST: (deptId, userId) => `/departments/${deptId}/approve/${userId}`,
    REJECT_REQUEST: (deptId, userId) => `/departments/${deptId}/reject/${userId}`,
    DASHBOARD: (id) => `/departments/${id}/dashboard`,
    COMMUNICATIONS: (id) => `/departments/${id}/communications`,
    MEMBERS: (id) => `/departments/${id}/members`,
    MEETINGS: (id) => `/departments/${id}/meetings`,
    TASKS: (id) => `/departments/${id}/tasks`,
    TASK_BY_ID: (deptId, taskId) => `/departments/${deptId}/tasks/${taskId}`,
    RESOURCES: (id) => `/departments/${id}/resources`,
    ACTIVITY_FEED: (id) => `/departments/${id}/activity-feed`,
    ACTIVITY_SUMMARY: (id) => `/departments/${id}/activity-summary`,

    // Department finance & operations
    BUDGETS: (id) => `/departments/${id}/budgets`,
    BUDGET_BY_ID: (deptId, budgetId) => `/departments/${deptId}/budgets/${budgetId}`,
    OBLIGATIONS: (id) => `/departments/${id}/obligations`,
    COLLECTIONS: (id) => `/departments/${id}/collections`,
    REMITTANCES: (id) => `/departments/${id}/remittances`,
    PENDING_FUNDS: (id) => `/departments/${id}/remittances/pending-funds`,
    SUBCOMMITTEES: (id) => `/departments/${id}/subcommittees`,
  },

  // Obligations ("What I Owe")
  OBLIGATIONS: {
    MINE: '/departments/me/obligations',
    BY_ID: (id) => `/obligations/${id}`,
  },

  // Payments
  PAYMENTS: {
    BASE: '/payments',
    MY_PAYMENTS: '/payments/my-payments',
    STATUS: (transaction_id) => `/payments/status/${transaction_id}`,
    CATEGORIES: '/payments/categories',
    CALLBACK: '/payments/mpesa/callback',
    METHODS: '/payments/methods',
    BY_ID: (id) => `/payments/${id}`,
    RECEIPT: (id) => `/payments/${id}/receipt`,
    REFUND: (id) => `/payments/${id}/refund`,
    VERIFY: (id) => `/payments/${id}/verify`,
    CANCEL: (id) => `/payments/${id}/cancel`,
    PLEDGES: '/payments/pledges',
    PLEDGE_BY_ID: (id) => `/payments/pledges/${id}`,
    PLEDGE_PAYMENTS: (id) => `/payments/pledges/${id}/payments`,
    SUMMARY: '/payments/summary',
    ANALYTICS: '/payments/analytics',
    TRENDS: '/payments/trends',
    REFUNDS: '/payments/refunds',
    REFUND_APPROVE: (id) => `/payments/refunds/${id}/approve`,
    REFUND_REJECT: (id) => `/payments/refunds/${id}/reject`,
  },

  // Events
  EVENTS: {
    BASE: '/events',
    BY_ID: (id) => `/events/${id}`,
  },

  // SMS / communications
  SMS: {
    BASE: '/sms',
    HISTORY: '/sms/history',
    BALANCE: '/sms/balance',
    SEND: '/sms/send',
  },

  // Dashboard summary endpoints (role-specific)
  DASHBOARD: {
    STATS: '/dashboard/stats',
    ACTIVITY: '/dashboard/activity',
    SYSTEM_HEALTH: '/dashboard/system-health',
    FINANCIAL_STATS: '/dashboard/financial-stats',
    FINANCIAL_HEALTH: '/dashboard/financial-health',
    TRANSACTIONS: '/dashboard/transactions',
    MINISTRY_HEALTH: '/dashboard/ministry-health',
    DEPARTMENT_STATS: '/dashboard/department-stats',
    DEPARTMENT_HEALTH: '/dashboard/department-health',
    DEPARTMENT_ACTIVITY: '/dashboard/department-activity',
    PERSONAL_STATS: '/dashboard/personal-stats',
    PERSONAL_STATUS: '/dashboard/personal-status',
    PERSONAL_ACTIVITY: '/dashboard/personal-activity',
  },

  // Notifications / messages
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id) => `/notifications/${id}`,
  },

  // Approvals / decisions needing me
  APPROVALS: {
    BASE: '/approvals',
    PENDING_COUNT: '/approvals/pending-count',
    APPROVE: (id) => `/approvals/${id}/approve`,
    REJECT: (id) => `/approvals/${id}/reject`,
  },

  // Audit Logs
  AUDIT_LOGS: {
    BASE: '/audit-logs',
    BY_ID: (id) => `/audit-logs/${id}`,
    BY_DEPARTMENT: (id) => `/audit-logs/department/${id}`,
  },

  // Collections (fundraising/offering rounds)
  COLLECTIONS: {
    BASE: '/collections',
    BY_ID: (id) => `/collections/${id}`,
    MY_COLLECTIONS: '/collections/my-collections',
    MY_STATEMENT: '/collections/my-statement',
    EVENT: '/collections/event',
    STATUS: (id) => `/collections/${id}/status`,
    CONTRIBUTIONS: (id) => `/collections/${id}/contributions`,
    CONTRIBUTION_DELETE: (id, contributionId) => `/collections/${id}/contributions/${contributionId}`,
    ANALYTICS: (id) => `/collections/${id}/analytics`,
    CLOSE: (id) => `/collections/${id}/close`,
    REOPEN: (id) => `/collections/${id}/reopen`,
  },

  // Health check
  HEALTH: '/health',

  // Gallery
  GALLERY: {
    BASE: '/gallery',
    CATEGORIES: '/gallery/categories',
    TELEGRAM_AUTH_STATUS: '/telegram/auth/status',
  },

  // Documents / resources
  DOCUMENTS: {
    BASE: '/documents',
  },

  // Treasury / church finances
  TREASURY: {
    ACCOUNTS: '/treasury/accounts',
    TRANSACTIONS: '/treasury/transactions',
    INCOME_CATEGORIES: '/treasury/income-categories',
    EXPENSE_CATEGORIES: '/treasury/expense-categories',
    BUDGETS: '/treasury/budgets',
    FUNDS: '/treasury/funds',
    VENDORS: '/treasury/vendors',
    ANALYTICS: '/treasury/analytics',
    RECURRING_PAYMENTS: '/treasury/recurring-payments',
    RECEIPTS: '/treasury/receipts',
    PROJECTS: '/treasury/projects',
    PLEDGES: '/treasury/pledges',
    CAMPAIGNS: '/treasury/campaigns',
    FIXED_ASSETS: '/treasury/fixed-assets',
    RECONCILIATIONS: '/treasury/reconciliations',
    SUMMARY: '/treasury/summary',
    REPORTS: {
      TRIAL_BALANCE: '/treasury/reports/trial-balance',
      INCOME_STATEMENT: '/treasury/reports/income-statement',
      BALANCE_SHEET: '/treasury/reports/balance-sheet',
      CASH_FLOW: '/treasury/reports/cash-flow',
      FUND_BALANCE: '/treasury/reports/fund-balance',
    },
  },

  // Telegram
  TELEGRAM: {
    CHANNELS: '/telegram/channels',
    SETTINGS: '/telegram/settings',
    AUTH_STATUS: '/telegram/auth/status',
    AUTH_METHODS: '/telegram/auth-methods',
    AUTH_START: '/telegram/auth/start',
    AUTH_VERIFY: '/telegram/auth/verify',
  },

  // Projects
  PROJECTS: {
    BASE: '/projects',
    BY_ID: (id) => `/projects/${id}`,
    MILESTONES: (id) => `/projects/${id}/milestones`,
    CONTRIBUTIONS: (id) => `/projects/${id}/contributions`,
    ANALYTICS: (id) => `/projects/${id}/analytics`,
    STATUS: (id) => `/projects/${id}/status`,
  },

  // Reports & trends (previously called analytics)
  REPORTS: {
    DASHBOARD: '/analytics/dashboard',
    MEMBER_GROWTH: '/analytics/member-growth',
    MEMBER_DEMOGRAPHICS: '/analytics/member-demographics',
    MEMBER_ACTIVITY: '/analytics/member-activity',
    FINANCIAL_TRENDS: '/analytics/financial-trends',
    FINANCIAL_SUMMARY: '/analytics/financial-summary',
    CONTRIBUTION_TRENDS: '/analytics/contribution-trends',
    DEPARTMENT_ACTIVITY: '/analytics/department-activity',
    DEPARTMENT_PERFORMANCE: '/analytics/department-performance',
    ATTENDANCE_TRENDS: '/analytics/attendance-trends',
    ATTENDANCE_SUMMARY: '/analytics/attendance-summary',
    COLLECTION_PERFORMANCE: '/analytics/collection-performance',
    COLLECTION_TRENDS: '/analytics/collection-trends',
    EVENT_ENGAGEMENT: '/analytics/event-engagement',
    EVENT_ATTENDANCE: '/analytics/event-attendance',
    SMS_PERFORMANCE: '/analytics/sms-performance',
    SMS_DELIVERY: '/analytics/sms-delivery',
    CUSTOM: '/analytics/custom',
    EXPORT: '/analytics/export',
  },
};

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
