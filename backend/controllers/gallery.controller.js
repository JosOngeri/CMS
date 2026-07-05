const galleryCache = require('../helpers/galleryCache');
const BaseController = require('./BaseController');
const GalleryRepository = require('../repositories/GalleryRepository');
const { createLogger } = require('../helpers/controllerLogger');
const CursorPagination = require('../utils/cursorPagination');

/**
 * Gallery Controller
 * Handles gallery albums, photos, tags, and comments
 */
class GalleryController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('GalleryController');
  }

  /**
   * Get all gallery albums
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllAlbums(req, res) {
    try {
      const churchId = req.user.church_id;
      const albums = await GalleryRepository.getAllAlbumsWithPhotoCount(churchId);

      res.json({ success: true, data: albums });
    } catch (error) {
      this.logger.error('getAllAlbums', error);
      res.status(500).json({ success: false, error: 'Failed to fetch albums' });
    }
  }

  /**
   * Get gallery categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCategories(req, res) {
    try {
      const categories = await GalleryRepository.getCategories();
      res.json({ success: true, categories });
    } catch (error) {
      this.logger.error('getCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  }

  /**
   * Get album by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAlbumById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const album = await GalleryRepository.getAlbumWithPhotos(id, churchId);

      if (!album) {
        return res.status(404).json({ success: false, error: 'Album not found' });
      }

      res.json({
        success: true,
        data: album
      });
    } catch (error) {
      this.logger.error('getAlbumById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch album' });
    }
  }

  /**
   * Create a new album
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Album title
   * @param {string} [req.body.description] - Album description
   * @param {string} [req.body.coverPhotoId] - Cover photo ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createAlbum(req, res) {
    try {
      const { title, description, coverPhotoId, is_public } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const churchSlug = req.user.church_slug;

      const album = await GalleryRepository.createAlbum(title, description, coverPhotoId, userId, churchId, churchSlug, is_public);

      res.status(201).json({
        success: true,
        message: 'Album created successfully',
        data: album
      });
    } catch (error) {
      this.logger.error('createAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to create album', details: error.message });
    }
  }

  /**
   * Update an album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.title] - Album title
   * @param {string} [req.body.description] - Album description
   * @param {string} [req.body.coverPhotoId] - Cover photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateAlbum(req, res) {
    try {
      const { id } = req.params;
      const { title, description, coverPhotoId, is_public } = req.body;

      const album = await GalleryRepository.updateAlbum(id, title, description, coverPhotoId, is_public);

      if (!album) {
        return res.status(404).json({ success: false, error: 'Album not found' });
      }

      res.json({
        success: true,
        message: 'Album updated successfully',
        data: album
      });
    } catch (error) {
      this.logger.error('updateAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to update album' });
    }
  }

  /**
   * Delete an album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAlbum(req, res) {
    try {
      const { id } = req.params;

      await GalleryRepository.deleteAlbum(id);

      res.json({
        success: true,
        message: 'Album deleted successfully'
      });
    } catch (error) {
      this.logger.error('deleteAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to delete album' });
    }
  }

  /**
   * Upload a photo to an album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.albumId - Album ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Photo title
   * @param {string} [req.body.description] - Photo description
   * @param {string} req.body.fileUrl - File URL
   * @param {string} req.body.thumbnailUrl - Thumbnail URL
   * @param {number} req.body.fileSize - File size
   * @param {string} req.body.fileType - File type
   * @param {number} req.body.width - Image width
   * @param {number} req.body.height - Image height
   * @param {string} [req.body.telegramFileId] - Telegram file ID
   * @param {string} [req.body.telegramFileUniqueId] - Telegram file unique ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async uploadPhoto(req, res) {
    try {
      const { albumId } = req.params;
      const { title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId } = req.body;
      const userId = req.user.id;

      const photo = await GalleryRepository.uploadPhoto(albumId, title, description, fileUrl, thumbnailUrl, fileSize, fileType, width, height, telegramFileId, telegramFileUniqueId, userId);

      // Cache the photo if it's from Telegram
      if (telegramFileId && telegramFileUniqueId) {
        await galleryCache.cachePhoto(albumId, telegramFileId, telegramFileUniqueId, fileUrl, thumbnailUrl);
      }

      res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: photo
      });
    } catch (error) {
      this.logger.error('uploadPhoto', error);
      res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }
  }

  /**
   * Update a photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Photo ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.title] - Photo title
   * @param {string} [req.body.description] - Photo description
   * @param {boolean} [req.body.isFeatured] - Featured status
   * @param {number} [req.body.orderIndex] - Order index
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePhoto(req, res) {
    try {
      const { id } = req.params;
      const { title, description, isFeatured, orderIndex } = req.body;

      const photo = await GalleryRepository.updatePhoto(id, title, description, isFeatured, orderIndex);

      if (!photo) {
        return res.status(404).json({ success: false, error: 'Photo not found' });
      }

      res.json({
        success: true,
        message: 'Photo updated successfully',
        data: photo
      });
    } catch (error) {
      this.logger.error('updatePhoto', error);
      res.status(500).json({ success: false, error: 'Failed to update photo' });
    }
  }

  /**
   * Delete a photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deletePhoto(req, res) {
    try {
      const { id } = req.params;

      await GalleryRepository.deletePhoto(id);

      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      this.logger.error('deletePhoto', error);
      res.status(500).json({ success: false, error: 'Failed to delete photo' });
    }
  }

  /**
   * Get all gallery tags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTags(req, res) {
    try {
      const churchId = req.user.church_id;
      const tags = await GalleryRepository.getTags(churchId);

      res.json({ success: true, data: tags });
    } catch (error) {
      this.logger.error('getTags', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tags' });
    }
  }

  /**
   * Add a tag to a photo
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.photoId - Photo ID
   * @param {string} req.body.tagId - Tag ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addTagToPhoto(req, res) {
    try {
      const { photoId, tagId } = req.body;

      await GalleryRepository.addTagToPhoto(photoId, tagId);

      res.json({
        success: true,
        message: 'Tag added successfully'
      });
    } catch (error) {
      this.logger.error('addTagToPhoto', error);
      res.status(500).json({ success: false, error: 'Failed to add tag' });
    }
  }

  /**
   * Remove a tag from a photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {string} req.params.tagId - Tag ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeTagFromPhoto(req, res) {
    try {
      const { photoId, tagId } = req.params;

      await GalleryRepository.removeTagFromPhoto(photoId, tagId);

      res.json({
        success: true,
        message: 'Tag removed successfully'
      });
    } catch (error) {
      this.logger.error('removeTagFromPhoto', error);
      res.status(500).json({ success: false, error: 'Failed to remove tag' });
    }
  }

  /**
   * Get comments for a photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getComments(req, res) {
    try {
      const { photoId } = req.params;

      const comments = await GalleryRepository.getComments(photoId);

      res.json({ success: true, data: comments });
    } catch (error) {
      this.logger.error('getComments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
  }

  /**
   * Add a comment to a photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.comment - Comment text
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addComment(req, res) {
    try {
      const { photoId } = req.params;
      const { comment } = req.body;
      const userId = req.user.id;

      const newComment = await GalleryRepository.addComment(photoId, userId, comment);

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: newComment
      });
    } catch (error) {
      this.logger.error('addComment', error);
      res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
  }

  /**
   * Get public photos
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=6] - Limit results (max 50)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPublicPhotos(req, res) {
    try {
      const churchId = req.user?.church_id || req.query.church_id || null;
      const limit = Math.min(parseInt(req.query.limit) || 6, 50);
      const photos = await GalleryRepository.getRecent(churchId, limit);
      res.json({ success: true, photos });
    } catch (error) {
      this.logger.error('getPublicPhotos', error);
      res.status(500).json({ success: false, error: 'Failed to fetch photos' });
    }
  }

  /**
   * Get public photos with cursor-based pagination (Phase 11)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.cursor] - Pagination cursor
   * @param {number} [req.query.limit=20] - Items per page
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPublicPhotosPaginated(req, res) {
    try {
      const churchId = req.user?.church_id || req.query.church_id || null;
      const { cursor, limit = 20 } = req.query;
      
      const { query, params } = CursorPagination.buildSQLQuery('gallery_photos', {
        cursor,
        limit: Math.min(parseInt(limit), 50),
        orderBy: 'uploaded_at',
        orderDirection: 'DESC',
        timestampColumn: 'uploaded_at',
        additionalWhere: 'church_id = $2',
        additionalParams: [churchId]
      });

      const rows = await GalleryRepository.executePaginatedQuery(query, params);
      const { data, pagination } = CursorPagination.processResults(rows, parseInt(limit), 0);

      res.json({ 
        success: true, 
        data,
        pagination 
      });
    } catch (error) {
      this.logger.error('getPublicPhotosPaginated', error);
      res.status(500).json({ success: false, error: 'Failed to fetch photos', details: error.message });
    }
  }

  /**
   * Search photos by title, description, or tags
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.search - Search term
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async searchPhotos(req, res) {
    try {
      const { search, limit = 20, offset = 0 } = req.query;

      if (!search) {
        return res.status(400).json({ success: false, error: 'Search term is required' });
      }

      const searchPattern = `%${search}%`;
      const photos = await GalleryRepository.searchPhotos(searchPattern, limit, offset);

      res.json({ success: true, data: photos });
    } catch (error) {
      this.logger.error('searchPhotos', error);
      res.status(500).json({ success: false, error: 'Failed to search photos' });
    }
  }

  /**
   * Filter photos by tags
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.tags - Comma-separated tag IDs
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async filterPhotosByTags(req, res) {
    try {
      const { tags, limit = 20, offset = 0 } = req.query;

      if (!tags) {
        return res.status(400).json({ success: false, error: 'Tags parameter is required' });
      }

      const tagIds = tags.split(',').map(tag => tag.trim());
      const photos = await GalleryRepository.filterPhotosByTags(tagIds, limit, offset);

      res.json({ success: true, data: photos });
    } catch (error) {
      this.logger.error('filterPhotosByTags', error);
      res.status(500).json({ success: false, error: 'Failed to filter photos by tags' });
    }
  }

  /**
   * Filter photos by date range
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.start_date] - Start date (YYYY-MM-DD)
   * @param {string} [req.query.end_date] - End date (YYYY-MM-DD)
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async filterPhotosByDate(req, res) {
    try {
      const { start_date, end_date, limit = 20, offset = 0 } = req.query;

      const photos = await GalleryRepository.filterPhotosByDate(start_date, end_date, limit, offset);

      res.json({ success: true, data: photos });
    } catch (error) {
      this.logger.error('filterPhotosByDate', error);
      res.status(500).json({ success: false, error: 'Failed to filter photos by date' });
    }
  }

  /**
   * Update photo metadata
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.camera] - Camera model
   * @param {string} [req.body.location] - Photo location
   * @param {string} [req.body.iso] - ISO setting
   * @param {string} [req.body.aperture] - Aperture setting
   * @param {string} [req.body.shutter_speed] - Shutter speed
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePhotoMetadata(req, res) {
    try {
      const { photoId } = req.params;
      const { camera, location, iso, aperture, shutter_speed } = req.body;

      const photo = await GalleryRepository.updatePhotoMetadata(photoId, camera, location, iso, aperture, shutter_speed);

      if (!photo) {
        return res.status(404).json({ success: false, error: 'Photo not found' });
      }

      res.json({ success: true, data: photo });
    } catch (error) {
      this.logger.error('updatePhotoMetadata', error);
      res.status(500).json({ success: false, error: 'Failed to update photo metadata' });
    }
  }

  /**
   * Update photo privacy settings
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} req.body - Request body
   * @param {boolean} req.body.is_private - Privacy setting
   * @param {string} [req.body.allowed_roles] - Comma-separated allowed roles
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePhotoPrivacy(req, res) {
    try {
      const { photoId } = req.params;
      const { is_private, allowed_roles } = req.body;

      const photo = await GalleryRepository.updatePhotoPrivacy(photoId, is_private, allowed_roles);

      if (!photo) {
        return res.status(404).json({ success: false, error: 'Photo not found' });
      }

      res.json({ success: true, data: photo });
    } catch (error) {
      this.logger.error('updatePhotoPrivacy', error);
      res.status(500).json({ success: false, error: 'Failed to update photo privacy' });
    }
  }

  /**
   * Get photo analytics
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPhotoAnalytics(req, res) {
    try {
      const { photoId } = req.params;

      const analytics = await GalleryRepository.getPhotoAnalytics(photoId);

      res.json({ 
        success: true, 
        data: analytics
      });
    } catch (error) {
      this.logger.error('getPhotoAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch photo analytics' });
    }
  }

  /**
   * Record photo download
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async recordPhotoDownload(req, res) {
    try {
      const { photoId } = req.params;
      const userId = req.user ? req.user.id : null;

      await GalleryRepository.recordPhotoDownload(photoId, userId);

      res.json({ success: true, message: 'Download recorded' });
    } catch (error) {
      this.logger.error('recordPhotoDownload', error);
      res.status(500).json({ success: false, error: 'Failed to record download' });
    }
  }

  /**
   * Share photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.platform - Platform (facebook, twitter, email, etc.)
   * @param {string} [req.body.recipient] - Recipient (for email)
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async sharePhoto(req, res) {
    try {
      const { photoId } = req.params;
      const { platform, recipient } = req.body;
      const userId = req.user ? req.user.id : null;

      await GalleryRepository.sharePhoto(photoId, userId, platform, recipient);

      res.json({ success: true, message: 'Photo shared successfully' });
    } catch (error) {
      this.logger.error('sharePhoto', error);
      res.status(500).json({ success: false, error: 'Failed to share photo' });
    }
  }

  /**
   * Get gallery analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGalleryAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const analytics = await GalleryRepository.getGalleryAnalytics(startDate, endDate);

      res.json({ 
        success: true, 
        data: analytics
      });
    } catch (error) {
      this.logger.error('getGalleryAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch gallery analytics' });
    }
  }
}

module.exports = new GalleryController();

