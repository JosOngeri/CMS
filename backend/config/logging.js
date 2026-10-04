const pino = require('pino');

/**
 * Pino Logger with conditional transport and PII redaction
 */
const isDevelopment = process.env.NODE_ENV === 'development';

const loggerOpts = {
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'token',
      'tokens',
      'authorization',
      'accessToken',
      'refreshToken',
      'mfaToken',
      'email',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-auth-token"]',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.oldPassword',
      'req.body.confirmPassword',
      'req.body.email',
      'req.body.phone',
      'req.body.phone_number',
      'req.body.otp',
      'req.body.code',
      'req.body.token',
      'req.body.mfaSecret',
      'req.body.pin',
      'new_value',
      'old_value',
      'res.headers["set-cookie"]'
    ],
    remove: true
  },
};

const logger = pino({
  ...loggerOpts,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
});

// 4.7: outside development, mirror entries into platform_app_logs so the
// console log explorer can query them (stdout still gets everything).
// APP_LOG_DB_LEVEL sets the minimum captured level (default 'warn').
if (!isDevelopment && process.env.DISABLE_DB_LOG_STREAM !== 'true') {
  const { appLogDbStream } = require('./appLogDbStream');
  const rank = { info: 30, warn: 40, error: 50, fatal: 60 };
  const dbLevel = (process.env.APP_LOG_DB_LEVEL || 'warn').toLowerCase();
  const minRank = rank[dbLevel] || 40;
  const dbLogger = pino({ level: dbLevel, redact: loggerOpts.redact }, appLogDbStream);
  for (const method of ['info', 'warn', 'error', 'fatal']) {
    if (rank[method] < minRank) continue;
    const original = logger[method].bind(logger);
    logger[method] = (...args) => {
      original(...args);
      try { dbLogger[method](...args); } catch { /* sink must never throw */ }
    };
  }
}

// Routes that catch-and-500 with a static message usually log the real error
// first — find Error arguments and tag client-input failures so
// standardResponse can downgrade the response to a truthful 4xx.
const { markRequestError } = require('../helpers/pgClientError');
const originalError = logger.error.bind(logger);
logger.error = (...args) => {
  for (const arg of args) {
    if (arg instanceof Error) { markRequestError(arg); break; }
    if (arg && typeof arg === 'object' && arg.err instanceof Error) { markRequestError(arg.err); break; }
  }
  return originalError(...args);
};

module.exports = logger;
