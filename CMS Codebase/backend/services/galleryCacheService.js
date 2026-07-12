const redisCache = require('./redisCache');
const logger = require('../config/logging');

/**
 * Gallery Cache Service (Phase 11)
 * Redis-based caching for gallery photos and albums
 * Improves performance and reduces database load
 */
class GalleryCacheService {
  constructor() {
    this.cachePrefix = 'gallery:';
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Cache gallery album
   * @param {string} albumId - Album ID
   * @param {object} albumData - Album data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cacheAlbum(albumId, albumData, ttl = this.defaultTTL) {
    try {
      const key = `${this.cachePrefix}album:${albumId}`;
      return await redisCache.set(key, albumData, ttl);
    } catch (error) {
      logger.error('Failed to cache album:', error);
      return false;
    }
  }

  /**
   * Get cached album
   * @param {string} albumId - Album ID
   * @returns {Promise<object|null>} Cached album data
   */
  async getCachedAlbum(albumId) {
    try {
      const key = `${this.cachePrefix}album:${albumId}`;
      return await redisCache.get(key);
    } catch (error) {
      logger.error('Failed to get cached album:', error);
      return null;
    }
  }

  /**
   * Cache gallery photo
   * @param {string} photoId - Photo ID
   * @param {object} photoData - Photo data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cachePhoto(photoId, photoData, ttl = this.defaultTTL) {
    try {
      const key = `${this.cachePrefix}photo:${photoId}`;
      return await redisCache.set(key, photoData, ttl);
    } catch (error) {
      logger.error('Failed to cache photo:', error);
      return false;
    }
  }

  /**
   * Get cached photo
   * @param {string} photoId - Photo ID
   * @returns {Promise<object|null>} Cached photo data
   */
  async getCachedPhoto(photoId) {
    try {
      const key = `${this.cachePrefix}photo:${photoId}`;
      return await redisCache.get(key);
    } catch (error) {
      logger.error('Failed to get cached photo:', error);
      return null;
    }
  }

  /**
   * Cache album photos list
   * @param {string} albumId - Album ID
   * @param {array} photos - Photos array
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async cacheAlbumPhotos(albumId, photos, ttl = this.defaultTTL) {
    try {
      const key = `${this.cachePrefix}album:${albumId}:photos`;
      return await redisCache.set(key, photos, ttl);
    } catch (error) {
      logger.error('Failed to cache album photos:', error);
      return false;
    }
  }

  /**
   * Get cached album photos
   * @param {string} albumId - Album ID
   * @returns {Promise<array>} Cached photos array
   */
  async getCachedAlbumPhotos(albumId) {
    try {
      const key = `${this.cachePrefix}album:${albumId}:photos`;
      const data = await redisCache.get(key);
      return data || [];
    } catch (error) {
      logger.error('Failed to get cached album photos:', error);
      return [];
    }
  }

  /**
   * Invalidate album cache
   * @param {string} albumId - Album ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAlbum(albumId) {
    try {
      const keys = [
        `${this.cachePrefix}album:${albumId}`,
        `${this.cachePrefix}album:${albumId}:photos`
      ];
      const pattern = `${this.cachePrefix}album:${albumId}*`;
      return await redisCache.invalidate(pattern);
    } catch (error) {
      logger.error('Failed to invalidate album cache:', error);
      return false;
    }
  }

  /**
   * Invalidate photo cache
   * @param {string} photoId - Photo ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidatePhoto(photoId) {
    try {
      const key = `${this.cachePrefix}photo:${photoId}`;
      return await redisCache.del(key);
    } catch (error) {
      logger.error('Failed to invalidate photo cache:', error);
      return false;
    }
  }

  /**
   * Invalidate all gallery cache for a church
   * @param {string} churchId - Church ID
   * @returns {Promise<number>} Number of keys invalidated
   */
  async invalidateChurchGallery(churchId) {
    try {
      const pattern = `${this.cachePrefix}church:${churchId}*`;
      return await redisCache.invalidate(pattern);
    } catch (error) {
      logger.error('Failed to invalidate church gallery cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await redisCache.getStats();
      if (!stats || !stats.connected) {
        return { connected: false };
      }

      // Get gallery-specific cache info
      const galleryKeys = await redisCache.client.keys(`${this.cachePrefix}*`);
      
      return {
        connected: true,
        totalGalleryKeys: galleryKeys.length,
        albums: galleryKeys.filter(k => k.includes(':album:')).length,
        photos: galleryKeys.filter(k => k.includes(':photo:')).length,
        redisStats: stats
      };
    } catch (error) {
      logger.error('Failed to get gallery cache stats:', error);
      return { connected: false };
    }
  }

  /**
   * Warm cache for popular albums
   * @param {array} albumIds - Album IDs to warm
   * @param {function} fetchFn - Function to fetch album data
   * @returns {Promise<number>} Number of albums warmed
   */
  async warmCache(albumIds, fetchFn) {
    let warmed = 0;
    
    for (const albumId of albumIds) {
      try {
        const albumData = await fetchFn(albumId);
        if (albumData) {
          await this.cacheAlbum(albumId, albumData, 7200); // 2 hours TTL
          warmed++;
        }
      } catch (error) {
        logger.error(`Failed to warm cache for album ${albumId}:`, error);
      }
    }

    logger.info(`Warmed cache for ${warmed} albums`);
    return warmed;
  }
}

module.exports = new GalleryCacheService();
