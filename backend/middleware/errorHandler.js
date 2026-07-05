const { AppError } = require('../helpers/errorHandler');
const logger = require('../config/logging');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
  } else if (err.name === 'DatabaseError') {
    statusCode = 500;
  } else if (err.name === 'ExternalServiceError') {
    statusCode = 502;
  }

  // Handle PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Duplicate entry';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Referenced record does not exist';
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Required field is missing';
        break;
      case '22P02': // Invalid text representation
        statusCode = 400;
        message = 'Invalid data format';
        break;
      default:
        statusCode = 500;
        message = 'Database error';
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Prepare response
  const response = {
    success: false,
    error: message
  };

  // Add details in development or if operational error
  if (process.env.NODE_ENV === 'development' || err.isOperational) {
    response.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};