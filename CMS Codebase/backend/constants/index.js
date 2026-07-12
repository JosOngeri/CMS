/**
 * Backend constants
 */

// Database configuration
exports.DB_CONFIG = {
  DEFAULT_POOL_SIZE: 20,
  MAX_POOL_SIZE: 100,
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  IDLE_TIMEOUT: 30000, // 30 seconds
}

// Rate limiting
exports.RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10,
  },
  SMS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 20,
  },
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
}

// JWT configuration
exports.JWT_CONFIG = {
  DEFAULT_EXPIRES_IN: '1h',
  REFRESH_EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
}

// Password hashing
exports.PASSWORD_CONFIG = {
  SALT_ROUNDS: 10,
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
}

// Validation rules
exports.VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  NAMES: {
    MAX_LENGTH: 50,
  },
  PHONE: {
    PATTERN: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  },
  TEXT_FIELDS: {
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 10000,
    MAX_NOTE_LENGTH: 500,
  },
}

// User roles
exports.ROLES = {
  SUPER_ADMIN: 'Super Admin',
  PASTOR: 'Pastor',
  FIRST_ELDER: 'First Elder',
  DEPARTMENT_HEAD: 'Department Head',
  MEMBER: 'Member',
}

exports.ADMIN_ROLES = [
  exports.ROLES.SUPER_ADMIN,
  exports.ROLES.PASTOR,
  exports.ROLES.FIRST_ELDER,
]

// Announcement types
exports.ANNOUNCEMENT_TYPES = {
  GENERAL: 'general',
  DEPARTMENT: 'department',
  EMERGENCY: 'emergency',
}

// Announcement priorities
exports.ANNOUNCEMENT_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
}

// Payment categories
exports.PAYMENT_CATEGORIES = {
  TITHE: 'tithe',
  OFFERING: 'offering',
  BUILDING_FUND: 'building_fund',
  MISSION_OFFERING: 'mission_offering',
  CHURCH_BUDGET: 'church_budget',
  LOCAL_CHURCH_BUDGET: 'local_church_budget',
  OTHER: 'other',
}

// HTTP status codes
exports.HTTP_STATUS = {
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
}

// Error messages
exports.ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Permission denied',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
}

// Cache durations (in seconds)
exports.CACHE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 600, // 10 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
}
