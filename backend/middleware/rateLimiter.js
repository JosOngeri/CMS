/**
 * express-rate-limit factories — Redis store when connected at boot, else in-memory; named limiters used by index.routes.js.
 * @exports {authLimiter, generalLimiter, strictLimiter, apiLimiter, passwordResetLimiter, platformAuthLimiter, uploadLimiter, getRateLimitStats}
 * @known platformAuthLimiter mounted on /platform/auth/login (platform.routes.js).
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisCache = require('../services/redisCache');
const logger = require('../config/logging');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true';

// L410: check Redis lazily per request — it may connect after module load.
const redisUp = () => redisCache.isConnected === true;

// Create Redis store if available, otherwise use in-memory
const createRateLimiter = (options) => {
  // Disable rate limiting in test environment
  if (isTest) {
    return (req, res, next) => next();
  }

  const limiterName = options.prefix || 'default';

  // Remove prefix from options as it's not supported in v7
  const { prefix, ...limiterOptions } = options;

  // Some proxies append the client port to X-Forwarded-For (e.g. "1.2.3.4:5678"),
  // which trips express-rate-limit's IP validation. Strip a trailing :port so
  // rate limiting keys on a clean IP.
  const clientIp = (req) => {
    const ip = req.ip || '';
    // Only strip ":port" from IPv4-style values (e.g. "1.2.3.4:5678");
    // leave IPv6 and plain IPv4 untouched.
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
      return ip.slice(0, ip.lastIndexOf(':'));
    }
    return ip;
  };

  const baseOptions = {
    ...limiterOptions,
    keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
    // Loopback clients are server-local tooling (smoke sweeps, probes, cron)
    // — never throttle them; they don't represent internet abuse.
    skip: (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIp(req)),
    validate: { ip: false },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({
        type: 'RATE_LIMIT_HIT',
        ip: req.ip,
        path: req.path,
        method: req.method,
        limiter: limiterName,
        timestamp: new Date().toISOString()
      }, 'Rate limit exceeded');

      res.status(429).json(options.message || {
        success: false,
        error: 'Too many requests, please try again later'
      });
    }
  };

  // L410: build both stores up front and dispatch per request — Redis coming
  // online after boot now gets adopted instead of staying in-memory forever.
  // Counters don't carry between stores; acceptable trade-off.
  const memoryLimiter = rateLimit(baseOptions);
  let redisLimiter = null;

  return (req, res, next) => {
    if (redisUp()) {
      if (!redisLimiter) {
        redisLimiter = rateLimit({
          ...baseOptions,
          store: new RedisStore({
            client: redisCache.client,
            prefix: `ratelimit:${limiterName}:`,
          }),
        });
        logger.info({ limiter: limiterName }, 'Rate limiter switched to Redis store');
      }
      return redisLimiter(req, res, next);
    }
    return memoryLimiter(req, res, next);
  };
};

// Log rate limiting mode on startup
logger.info({
  mode: redisUp() ? 'Redis' : 'In-Memory',
  redisConnected: redisUp()
}, 'Rate limiting initialized');

// Auth endpoints: stricter in production
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 1000,
  message: { success: false, error: 'Too many authentication attempts, please try again later' },

});

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: { success: false, error: 'Too many requests, please try again later' },

});

const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 50 : 500,
  message: { success: false, error: 'Too many requests, please try again later' },

});

const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: { success: false, error: 'API rate limit exceeded' },

});

const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many password reset attempts' },

});

const platformAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 50,
  message: { success: false, error: 'Too many platform login attempts, please try again later' }
});

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 100,
  message: { success: false, error: 'Too many uploads' },

});

// Get rate limit statistics
const getRateLimitStats = async () => {
  try {
    const stats = {
      mode: redisUp() ? 'Redis' : 'In-Memory',
      redisConnected: redisUp(),
      timestamp: new Date().toISOString()
    };

    if (redisUp() && redisCache.client) {
      // Get count of rate limit keys in Redis
      const keys = await redisCache.client.keys('ratelimit:*');
      stats.redisKeysCount = keys.length;
    }

    return stats;
  } catch (error) {
    logger.error('Error getting rate limit stats:', error);
    return {
      mode: 'In-Memory',
      redisConnected: false,
      error: error.message
    };
  }
};

module.exports = {
  authLimiter,
  generalLimiter,
  strictLimiter,
  apiLimiter,
  passwordResetLimiter,
  platformAuthLimiter,
  uploadLimiter,
  getRateLimitStats
};
