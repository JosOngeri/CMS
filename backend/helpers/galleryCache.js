const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('galleryCache');

// Cache expiration time in seconds (24 hours)
const CACHE_EXPIRY = 86400;

/**
 * Cache a Telegram photo URL
 */
async function cachePhoto(channelId, fileId, fileUniqueId, photoUrl, thumbUrl, width, height, fileSize, caption) {
  const expiresAt = new Date(Date.now() + CACHE_EXPIRY * 1000);

  try {
    await pool.query(
      `INSERT INTO telegram_photos_cache
      (channel_id, telegram_file_id, telegram_file_unique_id, cached_url, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (telegram_file_unique_id)
      DO UPDATE SET
      cached_url = EXCLUDED.cached_url,
      expires_at = EXCLUDED.expires_at,
      is_valid = TRUE`,
      [channelId, fileId, fileUniqueId, photoUrl, expiresAt]
    );
    return true;
  } catch (error) {
    logger.error('cachePhoto', 'Error caching photo:', error);
    return false;
  }
}

/**
 * Get cached photo URL
 */
async function getCachedPhoto(fileUniqueId) {
  try {
    const result = await pool.query(
      'SELECT * FROM telegram_photos_cache WHERE telegram_file_unique_id = $1 AND is_valid = TRUE AND expires_at > NOW()',
      [fileUniqueId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    logger.error('getCachedPhoto', 'Error getting cached photo:', error);
    return null;
  }
}

/**
 * Get cached photos by channel with filtering
 */
async function getCachedPhotosByChannel(channelId, filters = {}) {
  try {
    let query = 'SELECT * FROM telegram_photos_cache WHERE channel_id = $1 AND is_valid = TRUE';
    const params = [channelId];
    let paramCount = 1;

    if (filters.albumId) {
      paramCount++;
      query += ` AND album_id = $${paramCount}`;
      params.push(filters.albumId);
    }

    if (filters.startDate) {
      paramCount++;
      query += ` AND cached_at >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND cached_at <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      params.push(filters.tags);
    }

    query += ' ORDER BY cached_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('getCachedPhotosByChannel', 'Error getting cached photos by channel:', error);
    return [];
  }
}

/**
 * Invalidate cached photo
 */
async function invalidateCache(fileUniqueId) {
  try {
    await pool.query(
      'UPDATE telegram_photos_cache SET is_valid = FALSE WHERE telegram_file_unique_id = $1',
      [fileUniqueId]
    );
    return true;
  } catch (error) {
    logger.error('invalidateCache', 'Error invalidating cache:', error);
    return false;
  }
}

/**
 * Clean up expired cache entries
 */
async function cleanupExpiredCache() {
  try {
    const result = await pool.query(
      'DELETE FROM telegram_photos_cache WHERE expires_at < NOW() OR is_valid = FALSE'
    );
    logger.info('cleanupExpiredCache', `Cleaned up ${result.rowCount} expired cache entries`);
    return result.rowCount;
  } catch (error) {
    logger.error('cleanupExpiredCache', 'Error cleaning up cache:', error);
    return 0;
  }
}

/**
 * Refresh cache for a photo (mark as invalid to force refresh)
 */
async function refreshCache(fileUniqueId) {
  return await invalidateCache(fileUniqueId);
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_entries,
        SUM(CASE WHEN is_valid = TRUE THEN 1 ELSE 0 END) as valid_entries,
        SUM(CASE WHEN is_valid = FALSE THEN 1 ELSE 0 END) as invalid_entries,
        SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_entries
      FROM telegram_photos_cache
    `);
    return result.rows[0];
  } catch (error) {
    logger.error('getCacheStats', 'Error getting cache stats:', error);
    return null;
  }
}

/**
 * Get cache health status
 */
async function getCacheHealth() {
  try {
    const stats = await getCacheStats();
    if (!stats) return null;

    const total = parseInt(stats.total_entries) || 0;
    const expired = parseInt(stats.invalid_entries) || 0;
    const healthPercentage = total > 0 ? ((total - expired) / total) * 100 : 100;

    return {
      totalEntries: total,
      validEntries: parseInt(stats.valid_entries) || 0,
      expiredEntries: expired,
      healthPercentage: Math.round(healthPercentage),
      status: healthPercentage > 80 ? 'healthy' : healthPercentage > 50 ? 'warning' : 'critical',
      avgFileSize: 0, // Not available in current schema
    };
  } catch (error) {
    logger.error('getCacheHealth', 'Error getting cache health:', error);
    return null;
  }
}

/**
 * Batch refresh expired cache entries
 */
async function refreshExpiredEntries() {
  try {
    const expiredResult = await pool.query(
      'SELECT * FROM telegram_photos_cache WHERE is_valid = FALSE OR expires_at < NOW() LIMIT 100'
    );

    const refreshed = [];
    for (const entry of expiredResult.rows) {
      // This would call Telegram API to refresh the file reference
      // For now, just mark as needing refresh
      logger.info('refreshExpiredEntries', `Need to refresh cache entry: ${entry.telegram_file_id}`);
      refreshed.push(entry.telegram_file_id);
    }

    return { count: refreshed.length, entries: refreshed };
  } catch (error) {
    logger.error('refreshExpiredEntries', 'Error refreshing expired entries:', error);
    return { count: 0, entries: [] };
  }
}

module.exports = {
  cachePhoto,
  getCachedPhoto,
  getCachedPhotosByChannel,
  invalidateCache,
  cleanupExpiredCache,
  refreshCache,
  getCacheStats,
  getCacheHealth,
  refreshExpiredEntries,
  CACHE_EXPIRY
};
