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

// 4.7: outside development, mirror warn+ entries into platform_app_logs so
// the console log explorer can query them (stdout still gets everything).
if (!isDevelopment && process.env.DISABLE_DB_LOG_STREAM !== 'true') {
  const { appLogDbStream } = require('./appLogDbStream');
  const dbLogger = pino({ level: 'warn', redact: loggerOpts.redact }, appLogDbStream);
  for (const method of ['warn', 'error', 'fatal']) {
    const original = logger[method].bind(logger);
    logger[method] = (...args) => {
      original(...args);
      try { dbLogger[method](...args); } catch { /* sink must never throw */ }
    };
  }
}

module.exports = logger;
