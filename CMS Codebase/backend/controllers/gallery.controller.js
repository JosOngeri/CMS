const galleryCache = require('../helpers/galleryCache');
const BaseController = require('./BaseController');
const GalleryRepository = require('../repositories/GalleryRepository');
const GalleryAlbumsRepository = require('../repositories/GalleryAlbumsRepository');
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

      this.success(res, { data: albums });
    } catch (error) {
      this.logger.error('getAllAlbums', error);
      this.error(res, 'Failed to fetch albums');
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
      this.success(res, { categories });
    } catch (error) {
      this.logger.error('getCategories', error);
      this.error(res, 'Failed to fetch categories');
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
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { data: album });
    } catch (error) {
      this.logger.error('getAlbumById', error);
      this.error(res, 'Failed to fetch album');
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

      this.created(res, { data: album });
    } catch (error) {
      this.logger.error('createAlbum', error);
      this.error(res, 'Failed to create album');
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
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { message: 'Album updated successfully', data: album });
    } catch (error) {
      this.logger.error('updateAlbum', error);
      this.error(res, 'Failed to update album');
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

      this.success(res, { message: 'Album deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAlbum', error);
      this.error(res, 'Failed to delete album');
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

      if (telegramFileId && telegramFileUniqueId) {
        await galleryCache.cachePhoto(albumId, telegramFileId, telegramFileUniqueId, fileUrl, thumbnailUrl);
      }

      this.created(res, { data: photo });
    } catch (error) {
      this.logger.error('uploadPhoto', error);
      this.error(res, 'Failed to upload photo');
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
        return this.notFound(res, 'Photo not found');
      }

      this.success(res, { message: 'Photo updated successfully', data: photo });
    } catch (error) {
      this.logger.error('updatePhoto', error);
      this.error(res, 'Failed to update photo');
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

      this.success(res, { message: 'Photo deleted successfully' });
    } catch (error) {
      this.logger.error('deletePhoto', error);
      this.error(res, 'Failed to delete photo');
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

      this.success(res, { data: tags });
    } catch (error) {
      this.logger.error('getTags', error);
      this.error(res, 'Failed to fetch tags');
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

      this.success(res, { message: 'Tag added successfully' });
    } catch (error) {
      this.logger.error('addTagToPhoto', error);
      this.error(res, 'Failed to add tag');
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

      this.success(res, { message: 'Tag removed successfully' });
    } catch (error) {
      this.logger.error('removeTagFromPhoto', error);
      this.error(res, 'Failed to remove tag');
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

      this.success(res, { data: comments });
    } catch (error) {
      this.logger.error('getComments', error);
      this.error(res, 'Failed to fetch comments');
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

      this.created(res, { message: 'Comment added successfully', data: newComment });
    } catch (error) {
      this.logger.error('addComment', error);
      this.error(res, 'Failed to add comment');
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
      this.success(res, { photos });
    } catch (error) {
      this.logger.error('getPublicPhotos', error);
      this.error(res, 'Failed to fetch photos');
    }
  }

  /**
   * Serve a gallery image by redirecting to the stored file URL
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getImage(req, res) {
    try {
      const { id } = req.params;
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(id)) {
        return this.notFound(res, 'Image not found');
      }

      const churchId = req.user?.church_id || req.query.church_id || null;
      const photo = await GalleryRepository.getById(id, churchId);

      if (!photo) {
        return this.notFound(res, 'Image not found');
      }

      const imageUrl = photo.file_url || photo.thumbnail_url;
      if (!imageUrl) {
        return this.notFound(res, 'Image URL not found');
      }

      return res.redirect(imageUrl);
    } catch (error) {
      this.logger.error('getImage', error);
      return this.error(res, 'Failed to fetch image');
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

      this.success(res, { data, pagination });
    } catch (error) {
      this.logger.error('getPublicPhotosPaginated', error);
      this.error(res, 'Failed to fetch photos');
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
        return this.badRequest(res, 'Search term is required');
      }

      const searchPattern = `%${search}%`;
      const photos = await GalleryRepository.searchPhotos(searchPattern, limit, offset);

      this.success(res, { photos });
    } catch (error) {
      this.logger.error('searchPhotos', error);
      this.error(res, 'Failed to search photos');
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
        return this.badRequest(res, 'Tags parameter is required');
      }

      const tagIds = tags.split(',').map(tag => tag.trim());
      const photos = await GalleryRepository.filterPhotosByTags(tagIds, limit, offset);

      this.success(res, { data: photos });
    } catch (error) {
      this.logger.error('filterPhotosByTags', error);
      this.error(res, 'Failed to filter photos by tags');
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

      this.success(res, { data: photos });
    } catch (error) {
      this.logger.error('filterPhotosByDate', error);
      this.error(res, 'Failed to filter photos by date');
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
        return this.notFound(res, 'Photo not found');
      }

      this.success(res, { data: photo });
    } catch (error) {
      this.logger.error('updatePhotoMetadata', error);
      this.error(res, 'Failed to update photo metadata');
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
        return this.notFound(res, 'Photo not found');
      }

      this.success(res, { data: photo });
    } catch (error) {
      this.logger.error('updatePhotoPrivacy', error);
      this.error(res, 'Failed to update photo privacy');
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

      this.success(res, { data: analytics });
    } catch (error) {
      this.logger.error('getPhotoAnalytics', error);
      this.error(res, 'Failed to fetch photo analytics');
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

      this.success(res, { message: 'Download recorded' });
    } catch (error) {
      this.logger.error('recordPhotoDownload', error);
      this.error(res, 'Failed to record download');
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

      this.success(res, { message: 'Photo shared successfully' });
    } catch (error) {
      this.logger.error('sharePhoto', error);
      this.error(res, 'Failed to share photo');
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

      this.success(res, { data: analytics });
    } catch (error) {
      this.logger.error('getGalleryAnalytics', error);
      this.error(res, 'Failed to fetch gallery analytics');
    }
  }

  /**
   * Get all gallery albums with advanced filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category_id] - Filter by category
   * @param {string} [req.query.is_public] - Filter by public status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllAlbumsWithDetails(req, res) {
    try {
      const { category_id, is_public } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (category_id) filters.category_id = category_id;
      if (is_public !== undefined) filters.is_public = is_public;

      const albums = await GalleryAlbumsRepository.getAllWithDetails(filters, churchId);

      this.success(res, { data: albums });
    } catch (error) {
      this.logger.error('getAllAlbumsWithDetails', error);
      this.error(res, 'Failed to fetch albums');
    }
  }

  /**
   * Get album by ID with photos (advanced version)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAlbumWithPhotos(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const album = await GalleryAlbumsRepository.getAlbumWithPhotos(id, churchId);

      if (!album) {
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { data: album });
    } catch (error) {
      this.logger.error('getAlbumWithPhotos', error);
      this.error(res, 'Failed to fetch album');
    }
  }

  /**
   * Create new album with advanced options
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Album title
   * @param {string} [req.body.description] - Album description
   * @param {string} [req.body.category_id] - Category ID
   * @param {string} [req.body.parent_id] - Parent album ID
   * @param {boolean} [req.body.is_public] - Public status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createAlbumAdvanced(req, res) {
    try {
      const { title, description, category_id, parent_id, is_public } = req.body;

      const album = await GalleryAlbumsRepository.createAlbum({
        title,
        description,
        category_id,
        parent_id,
        is_public,
        created_by: req.user.id
      });

      this.created(res, { data: album });
    } catch (error) {
      this.logger.error('createAlbumAdvanced', error);
      this.error(res, 'Failed to create album');
    }
  }

  /**
   * Update album with advanced options
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.title] - Album title
   * @param {string} [req.body.description] - Album description
   * @param {string} [req.body.category_id] - Category ID
   * @param {string} [req.body.parent_id] - Parent album ID
   * @param {string} [req.body.cover_photo_id] - Cover photo ID
   * @param {boolean} [req.body.is_public] - Public status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateAlbumAdvanced(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category_id, parent_id, cover_photo_id, is_public } = req.body;

      const album = await GalleryAlbumsRepository.updateAlbum(id, {
        title,
        description,
        category_id,
        parent_id,
        cover_photo_id,
        is_public
      });

      if (!album) {
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { data: album });
    } catch (error) {
      this.logger.error('updateAlbumAdvanced', error);
      this.error(res, 'Failed to update album');
    }
  }

  /**
   * Delete album with sub-album check
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAlbumAdvanced(req, res) {
    try {
      const { id } = req.params;

      const subAlbumCount = await GalleryAlbumsRepository.countSubAlbums(id);

      if (subAlbumCount > 0) {
        return this.badRequest(res, 'Cannot delete album with sub-albums. Delete sub-albums first.');
      }

      const album = await GalleryAlbumsRepository.delete(id);

      if (!album) {
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { message: 'Album deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAlbumAdvanced', error);
      this.error(res, 'Failed to delete album');
    }
  }

  /**
   * Add photos to album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} req.body - Request body
   * @param {Array} req.body.photo_ids - Photo IDs to add
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addPhotosToAlbum(req, res) {
    try {
      const { id } = req.params;
      const { photo_ids } = req.body;

      if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
        return this.badRequest(res, 'photo_ids must be a non-empty array');
      }

      let addedCount = 0;
      for (const photoId of photo_ids) {
        try {
          await GalleryAlbumsRepository.addPhotoToAlbum(id, photoId);
          addedCount++;
        } catch (error) {
          continue;
        }
      }

      this.success(res, { message: `${addedCount} photos added to album successfully` });
    } catch (error) {
      this.logger.error('addPhotosToAlbum', error);
      this.error(res, 'Failed to add photos to album');
    }
  }

  /**
   * Remove photo from album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {string} req.params.photoId - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removePhotoFromAlbum(req, res) {
    try {
      const { id, photoId } = req.params;

      await GalleryAlbumsRepository.removePhotoFromAlbum(id, photoId);

      this.success(res, { message: 'Photo removed from album successfully' });
    } catch (error) {
      this.logger.error('removePhotoFromAlbum', error);
      this.error(res, 'Failed to remove photo from album');
    }
  }

  /**
   * Update photo order in album
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} req.body - Request body
   * @param {Array} req.body.photo_orders - Array of {photo_id, sort_order}
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePhotoOrder(req, res) {
    try {
      const { id } = req.params;
      const { photo_orders } = req.body;

      if (!Array.isArray(photo_orders) || photo_orders.length === 0) {
        return this.badRequest(res, 'photo_orders must be a non-empty array');
      }

      for (const item of photo_orders) {
        await GalleryAlbumsRepository.updatePhotoOrder(id, item.photo_id, item.sort_order);
      }

      this.success(res, { message: 'Photo order updated successfully' });
    } catch (error) {
      this.logger.error('updatePhotoOrder', error);
      this.error(res, 'Failed to update photo order');
    }
  }

  /**
   * Set album cover photo
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Album ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.photo_id - Photo ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setCoverPhoto(req, res) {
    try {
      const { id } = req.params;
      const { photo_id } = req.body;

      const album = await GalleryAlbumsRepository.setCoverPhoto(id, photo_id);

      if (!album) {
        return this.notFound(res, 'Album not found');
      }

      this.success(res, { data: album });
    } catch (error) {
      this.logger.error('setCoverPhoto', error);
      this.error(res, 'Failed to set cover photo');
    }
  }
}

module.exports = new GalleryController();

