const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisCache = require('../services/redisCache');
const logger = require('../config/logging');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true';

// Check if Redis is available
const isRedisAvailable = redisCache.isConnected;

// Create Redis store if available, otherwise use in-memory
const createRateLimiter = (options) => {
  // Disable rate limiting in test environment
  if (isTest) {
    return (req, res, next) => next();
  }

  const limiterName = options.prefix || 'default';

  // Remove prefix from options as it's not supported in v7
  const { prefix, ...limiterOptions } = options;

  const finalOptions = {
    ...limiterOptions,
    store: isRedisAvailable ? new RedisStore({
      client: redisCache.client,
      prefix: `ratelimit:${limiterName}:`,
    }) : undefined,
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

  return rateLimit(finalOptions);
};

// Log rate limiting mode on startup
logger.info({
  mode: isRedisAvailable ? 'Redis' : 'In-Memory',
  redisConnected: isRedisAvailable
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

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 100,
  message: { success: false, error: 'Too many uploads' },

});

// Get rate limit statistics
const getRateLimitStats = async () => {
  try {
    const stats = {
      mode: isRedisAvailable ? 'Redis' : 'In-Memory',
      redisConnected: isRedisAvailable,
      timestamp: new Date().toISOString()
    };

    if (isRedisAvailable && redisCache.client) {
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
  uploadLimiter,
  getRateLimitStats
};
