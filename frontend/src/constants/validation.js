/**
 * Validation constants
 */

export const VALIDATION = {
  // Password
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,

  // Username
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,

  // Email
  MAX_EMAIL_LENGTH: 255,

  // Names
  MAX_FIRST_NAME_LENGTH: 50,
  MAX_LAST_NAME_LENGTH: 50,

  // Phone
  PHONE_PATTERN: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,

  // Text fields
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_NOTE_LENGTH: 500,
  MAX_BIO_LENGTH: 500,
  MAX_ADDRESS_LENGTH: 255,

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,

  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

  // Rate limiting
  RATE_LIMITS: {
    AUTH: 10, // per 15 minutes
    SMS: 20, // per 15 minutes
    GENERAL: 100, // per 15 minutes
  },
}

export const ERROR_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`,
  PASSWORD_TOO_LONG: `Password must not exceed ${VALIDATION.MAX_PASSWORD_LENGTH} characters`,
  USERNAME_TOO_SHORT: `Username must be at least ${VALIDATION.MIN_USERNAME_LENGTH} characters`,
  USERNAME_TOO_LONG: `Username must not exceed ${VALIDATION.MAX_USERNAME_LENGTH} characters`,
  USERNAME_INVALID: 'Username can only contain letters, numbers, and underscores',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed size',
  INVALID_FILE_TYPE: 'Invalid file type',
}

export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  MEMBER_ADDED: 'Member added successfully',
  DEPARTMENT_CREATED: 'Department created successfully',
  ANNOUNCEMENT_CREATED: 'Announcement created successfully',
  EVENT_CREATED: 'Event created successfully',
  PAYMENT_SUCCESSFUL: 'Payment processed successfully',
}
