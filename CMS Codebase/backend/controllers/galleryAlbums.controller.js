const BaseController = require('./BaseController');
const GalleryAlbumsRepository = require('../repositories/GalleryAlbumsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Gallery Albums Controller
 * Handles photo album management for the gallery
 */
class GalleryAlbumsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('GalleryAlbumsController');
  }

  /**
   * Get all gallery albums
   */
  async getAllAlbums(req, res) {
    try {
      const { category_id, is_public } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (category_id) filters.category_id = category_id;
      if (is_public !== undefined) filters.is_public = is_public;

      const albums = await GalleryAlbumsRepository.getAllWithDetails(filters, churchId);

      this.success(res, { data: albums });
    } catch (error) {
      this.logger.error('getAllAlbums', error);
      this.error(res, 'Failed to fetch albums');
    }
  }

  /**
   * Get album by ID with photos
   */
  async getAlbumById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const album = await GalleryAlbumsRepository.getAlbumWithPhotos(id, churchId);

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
   * Create new album
   */
  async createAlbum(req, res) {
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
      this.logger.error('createAlbum', error);
      this.error(res, 'Failed to create album');
    }
  }

  /**
   * Update album
   */
  async updateAlbum(req, res) {
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
      this.logger.error('updateAlbum', error);
      this.error(res, 'Failed to update album');
    }
  }

  /**
   * Delete album
   */
  async deleteAlbum(req, res) {
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
      this.logger.error('deleteAlbum', error);
      this.error(res, 'Failed to delete album');
    }
  }

  /**
   * Add photos to album
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

module.exports = new GalleryAlbumsController();
