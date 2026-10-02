// Centralized error handling utility for backend
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('errorHandler');

// Keys whose values must never reach logs (passwords, tokens, OTPs, PII-adjacent)
const SENSITIVE_KEY = /pass(word)?|token|secret|otp|code|pin|jwt|auth|cookie|mpesa|session/i;

const sanitizeForLog = (value, depth = 0) => {
  if (value === null || typeof value !== 'object' || depth > 3) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeForLog(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      SENSITIVE_KEY.test(k) ? '[REDACTED]' : sanitizeForLog(v, depth + 1)
    ])
  );
};

class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ErrorHandler {
  static handleError(error, req, res, next) {
    // Log error for debugging
    logger.error('handleError', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: sanitizeForLog(req.body),
      user: req.user?.id
    });

    // Handle operational errors
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        error: error.message,
        details: error.details
      });
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Please login again'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        details: 'Please login again'
      });
    }

    // Handle database errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          return res.status(409).json({
            error: 'Duplicate entry',
            details: 'A record with this information already exists'
          });
        case '23503': // Foreign key violation
          return res.status(400).json({
            error: 'Invalid reference',
            details: 'Referenced record does not exist'
          });
        case '23502': // Not null violation
          return res.status(400).json({
            error: 'Missing required field',
            details: error.message
          });
        default:
          return res.status(500).json({
            error: 'Database error',
            details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
          });
      }
    }

    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }

  static asyncError(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static notFound(req, res, next) {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
  }
}

module.exports = {
  AppError,
  ErrorHandler
};
