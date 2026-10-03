/**
 * @deprecated Compatibility shim — the canonical error classes and response
 * helpers live in ../helpers/errorHandler.js, and the mounted Express
 * middleware lives in ../middleware/errorHandler.js. This file only keeps
 * `sanitizeForLog` (log scrubbing unique to this module) and re-exports the
 * canonical symbols so legacy imports keep working.
 */
const {
  AppError,
  asyncHandler
} = require('../helpers/errorHandler');
const { errorHandler: mountedErrorHandler } = require('../middleware/errorHandler');
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

// Back-compat facade: ErrorHandler.handleError logs the sanitized body then
// delegates to the mounted middleware (which maps PG/JWT codes to statuses).
class ErrorHandler {
  static handleError(error, req, res, next) {
    logger.error('handleError', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: sanitizeForLog(req.body),
      user: req.user?.id
    });
    return mountedErrorHandler(error, req, res, next);
  }

  static asyncError(fn) {
    return asyncHandler(fn);
  }

  static notFound(req, res, next) {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  }
}

module.exports = {
  AppError,
  ErrorHandler,
  sanitizeForLog
};
