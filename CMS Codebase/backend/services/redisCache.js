/**
 * RedisCache Service (Phase 11) - Modified for Hybrid In-Memory/Redis support
 * High-performance caching for public-facing church data
 */
const redis = require('redis');
const NodeCache = require('node-cache');
const logger = require('../config/logging');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Fallback in-memory cache
    this.memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
    logger.info('In-memory cache initialized as fallback');
  }

  /**
   * Initialize Redis connection (if REDIS_URL exists)
   */
  async connect() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.info('REDIS_URL not provided, using In-Memory cache mode');
      return;
    }

    try {
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error('Redis reconnection failed after maximum attempts');
              return new Error('Redis reconnection failed');
            }
            this.reconnectAttempts = retries;
            logger.warn(`Redis reconnection attempt ${retries}/${this.maxReconnectAttempts}`);
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis Client Connection Ended');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (this.isConnected && this.client) {
      try {
        const value = await this.client.get(key);
        if (!value) return null;
        try { return JSON.parse(value); } catch { return value; }
      } catch (error) {
        logger.error(`Redis GET error for key ${key}:`, error);
      }
    }

    // Fallback to memory
    return this.memoryCache.get(key);
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 3600) {
    let success = false;

    if (this.isConnected && this.client) {
      try {
        const serializedValue = typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
        await this.client.setEx(key, ttl, serializedValue);
        success = true;
      } catch (error) {
        logger.error(`Redis SET error for key ${key}:`, error);
      }
    }

    // Always keep memory cache in sync if we're in fallback mode or if Redis failed
    this.memoryCache.set(key, value, ttl);
    return success || true;
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        logger.error(`Redis DEL error for key ${key}:`, error);
      }
    }
    this.memoryCache.del(key);
    return true;
  }

  /**
   * Invalidate keys matching pattern
   */
  async invalidate(pattern) {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) await this.client.del(keys);
      } catch (error) {
        logger.error(`Redis invalidation error for pattern ${pattern}:`, error);
      }
    }

    // Simple memory invalidation (wildcard support limited in node-cache)
    if (pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1);
      const keys = this.memoryCache.keys().filter(k => k.startsWith(basePattern));
      this.memoryCache.del(keys);
    } else {
      this.memoryCache.del(pattern);
    }
    return 1;
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.exists(key);
        if (result === 1) return true;
      } catch (error) {
        logger.error(`Redis EXISTS error for key ${key}:`, error);
      }
    }
    return this.memoryCache.has(key);
  }

  /**
   * Set multiple values at once
   */
  async mset(keyValuePairs, ttl = 3600) {
    if (this.isConnected && this.client) {
      try {
        const multi = this.client.multi();
        for (const [key, value] of Object.entries(keyValuePairs)) {
          const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          multi.setEx(key, ttl, serializedValue);
        }
        await multi.exec();
      } catch (error) {
        logger.error('Redis MSET error:', error);
      }
    }

    for (const [key, value] of Object.entries(keyValuePairs)) {
      this.memoryCache.set(key, value, ttl);
    }
    return true;
  }

  /**
   * Get multiple values at once
   */
  async mget(keys) {
    if (this.isConnected && this.client && keys.length > 0) {
      try {
        const values = await this.client.mGet(keys);
        const result = {};
        keys.forEach((key, index) => {
          if (values[index]) {
            try { result[key] = JSON.parse(values[index]); } catch { result[key] = values[index]; }
          }
        });
        if (Object.keys(result).length > 0) return result;
      } catch (error) {
        logger.error('Redis MGET error:', error);
      }
    }

    return this.memoryCache.mget(keys);
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    if (this.isConnected && this.client) {
      try { await this.client.flushAll(); } catch (error) { logger.error('Redis FLUSHALL error:', error); }
    }
    this.memoryCache.flushAll();
    return true;
  }

  /**
   * Close Redis connection gracefully
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }
    this.isConnected = false;
  }

  /**
   * Ping Redis/Cache server
   */
  async ping() {
    if (this.isConnected && this.client) {
      return await this.client.ping();
    }
    return 'PONG (In-Memory)';
  }

  async getStats() {
    return {
      mode: this.isConnected ? 'Redis' : 'In-Memory',
      memoryKeys: this.memoryCache.keys().length
    };
  }
}

module.exports = new RedisCache();
