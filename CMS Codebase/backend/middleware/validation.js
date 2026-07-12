/**
 * Input Validation Middleware
 * Provides comprehensive input validation and sanitization
 */

const { body, validationResult, param, query } = require('express-validator');

/**
 * Validates request and returns formatted errors if validation fails
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Common validation rules for frequently used fields
 */
const commonValidations = {
  // ID validation
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  // Email validation
  email: body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  // Phone validation
  phone: body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number (E.164 format)'),
  
  // URL validation
  url: body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid URL'),
  
  // Text validation
  text: (fieldName, minLength = 1, maxLength = 1000) => 
    body(fieldName)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${fieldName} must be ${minLength}-${maxLength} characters`)
      .escape(),
  
  // Number validation
  number: (fieldName, min = 0, max = null) => {
    const validation = body(fieldName)
      .isNumeric()
      .withMessage(`${fieldName} must be a number`);
    
    if (min !== null) {
      validation.isFloat({ min }).withMessage(`${fieldName} must be at least ${min}`);
    }
    
    if (max !== null) {
      validation.isFloat({ max }).withMessage(`${fieldName} must be at most ${max}`);
    }
    
    return validation;
  },
  
  // Boolean validation
  boolean: (fieldName) =>
    body(fieldName)
      .optional()
      .isBoolean()
      .withMessage(`${fieldName} must be true or false`),
  
  // Date validation
  date: (fieldName) =>
    body(fieldName)
      .optional()
      .isISO8601()
      .withMessage(`${fieldName} must be a valid date`),
  
  // Enum validation
  enum: (fieldName, values) =>
    body(fieldName)
      .isIn(values)
      .withMessage(`${fieldName} must be one of: ${values.join(', ')}`),
  
  // Array validation
  array: (fieldName) =>
    body(fieldName)
      .optional()
      .isArray()
      .withMessage(`${fieldName} must be an array`),
  
  // JSON validation
  json: (fieldName) =>
    body(fieldName)
      .optional()
      .isJSON()
      .withMessage(`${fieldName} must be valid JSON`)
};

/**
 * Sanitization middleware to prevent XSS attacks
 * Uses express-validator's native sanitizers for robust XSS prevention
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    // Use express-validator's native sanitizers
    let sanitized = str.trim().escape();
    // Strip JavaScript protocol URIs and event handlers
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/onerror=/gi, '')
      .replace(/onload=/gi, '')
      .replace(/onclick=/gi, '')
      .replace(/onmouseover=/gi, '');
    return sanitized;
  };

  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }
  next();
};

/**
 * Length validation helper
 */
const validateLength = (fieldName, min, max) => {
  return body(fieldName)
    .trim()
    .isLength({ min, max })
    .withMessage(`${fieldName} must be ${min}-${max} characters`);
};

/**
 * Pattern validation helper
 */
const validatePattern = (fieldName, pattern, message) => {
  return body(fieldName)
    .trim()
    .matches(pattern)
    .withMessage(message);
};

/**
 * File validation helper
 */
const validateFile = (fieldName, allowedTypes, maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`
      });
    }
    
    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  validate: validateRequest,
  validateRequest,
  commonValidations,
  validationRules: {
    idParam: [
      param('id').notEmpty().withMessage('ID is required')
    ],
    user: {
      update: [
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
        body('last_name').optional().notEmpty().withMessage('Last name cannot be empty')
      ],
      changePassword: [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      ]
    },
    announcement: {
      create: [
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required')
      ],
      update: [
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('content').optional().notEmpty().withMessage('Content cannot be empty')
      ]
    },
    department: {
      create: [
        body('name').notEmpty().withMessage('Department name is required'),
        body('slug').notEmpty().withMessage('Department slug is required')
      ],
      addMember: [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('role').notEmpty().withMessage('Role is required')
      ]
    }
  },
  sanitizeInput,
  validateLength,
  validatePattern,
  validateFile
};