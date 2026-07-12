const NodeCache = require('node-cache');

// Create cache instances
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Default 10 min TTL
const shortCache = new NodeCache({ stdTTL: 60, checkperiod: 30 }); // 1 min TTL
const longCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 }); // 1 hour TTL

class CacheService {
  static get(key) {
    return cache.get(key);
  }

  static set(key, value, ttl) {
    return cache.set(key, value, ttl);
  }

  static setShort(key, value) {
    return shortCache.set(key, value);
  }

  static setLong(key, value) {
    return longCache.set(key, value);
  }

  static delete(key) {
    cache.del(key);
    shortCache.del(key);
    longCache.del(key);
  }

  static flush() {
    cache.flushAll();
    shortCache.flushAll();
    longCache.flushAll();
  }

  static getStats() {
    return {
      default: cache.getStats(),
      short: shortCache.getStats(),
      long: longCache.getStats()
    };
  }

  static middleware(duration) {
    return (req, res, next) => {
      const key = req.originalUrl || req.url;
      const cachedResponse = cache.get(key);

      if (cachedResponse) {
        res.json(cachedResponse);
        return;
      }

      const originalSend = res.json.bind(res);
      res.json = (data) => {
        cache.set(key, data, duration);
        originalSend(data);
      };

      next();
    };
  }
}

module.exports = CacheService;