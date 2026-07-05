/**
 * Shared Validators
 * Common validation functions used across frontend and backend
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Kenya format: 2547XXXXXXXX)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^2547\d{8}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if valid
 */
export const isValidSlug = (slug) => {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Validate date string
 * @param {string} date - Date string to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Validate amount (positive number)
 * @param {number|string} amount - Amount to validate
 * @returns {boolean} True if valid
 */
export const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

/**
 * Validate percentage (0-100)
 * @param {number|string} percentage - Percentage to validate
 * @returns {boolean} True if valid
 */
export const isValidPercentage = (percentage) => {
  const num = parseFloat(percentage);
  return !isNaN(num) && num >= 0 && num <= 100;
};

export default {
  isValidEmail,
  isValidPhone,
  isValidUUID,
  validatePassword,
  isValidSlug,
  sanitizeInput,
  isValidDate,
  isValidAmount,
  isValidPercentage,
};
