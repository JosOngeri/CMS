class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const { createLogger } = require('./controllerLogger');
const logger = createLogger('errorHandler');

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

class ExternalServiceError extends AppError {
  constructor(message, details = null) {
    super(message, 502, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Standard response helpers for controllers
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, error, statusCode = 500) => {
  const response = {
    success: false,
    error: error.message || 'An error occurred'
  };
  
  if (error.details) {
    response.details = error.details;
  }
  
  return res.status(statusCode).json(response);
};

const sendValidationError = (res, details) => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details
  });
};

const sendNotFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    error: message
  });
};

const sendUnauthorized = (res, message = 'Authentication required') => {
  return res.status(401).json({
    success: false,
    error: message
  });
};

const sendForbidden = (res, message = 'Access denied') => {
  return res.status(403).json({
    success: false,
    error: message
  });
};

const sendConflict = (res, message = 'Resource conflict') => {
  return res.status(409).json({
    success: false,
    error: message
  });
};

/**
 * Async handler wrapper to catch errors in controllers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error handler middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return sendError(res, err, err.statusCode);
  }
  
  // Log unexpected errors
  logger.error('errorHandler', 'Unexpected error:', err);
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  asyncHandler,
  errorHandler
};