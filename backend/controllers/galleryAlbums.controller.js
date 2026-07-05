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

      res.json({ success: true, data: albums });
    } catch (error) {
      this.logger.error('getAllAlbums', error);
      res.status(500).json({ success: false, error: 'Failed to fetch albums' });
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

      res.json({ success: true, data: album });
    } catch (error) {
      this.logger.error('createAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to create album' });
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
        return res.status(404).json({ success: false, error: 'Album not found' });
      }

      res.json({ success: true, data: album });
    } catch (error) {
      this.logger.error('updateAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to update album' });
    }
  }

  /**
   * Delete album
   */
  async deleteAlbum(req, res) {
    try {
      const { id } = req.params;

      // Check if album has sub-albums
      const subAlbumCount = await GalleryAlbumsRepository.countSubAlbums(id);

      if (subAlbumCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete album with sub-albums. Delete sub-albums first.'
        });
      }

      const album = await GalleryAlbumsRepository.delete(id);

      if (!album) {
        return res.status(404).json({ success: false, error: 'Album not found' });
      }

      res.json({ success: true, message: 'Album deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to delete album' });
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
        return res.status(400).json({ success: false, error: 'photo_ids must be a non-empty array' });
      }

      let addedCount = 0;
      for (const photoId of photo_ids) {
        try {
          await GalleryAlbumsRepository.addPhotoToAlbum(id, photoId);
          addedCount++;
        } catch (error) {
          // Skip duplicates
          continue;
        }
      }

      res.json({
        success: true,
        message: `${addedCount} photos added to album successfully`
      });
    } catch (error) {
      this.logger.error('addPhotosToAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to add photos to album' });
    }
  }

  /**
   * Remove photo from album
   */
  async removePhotoFromAlbum(req, res) {
    try {
      const { id, photoId } = req.params;

      await GalleryAlbumsRepository.removePhotoFromAlbum(id, photoId);

      res.json({ success: true, message: 'Photo removed from album successfully' });
    } catch (error) {
      this.logger.error('removePhotoFromAlbum', error);
      res.status(500).json({ success: false, error: 'Failed to remove photo from album' });
    }
  }

  /**
   * Update photo order in album
   */
  async updatePhotoOrder(req, res) {
    try {
      const { id } = req.params;
      const { photo_orders } = req.body; // Array of {photo_id, sort_order}

      if (!Array.isArray(photo_orders) || photo_orders.length === 0) {
        return res.status(400).json({ success: false, error: 'photo_orders must be a non-empty array' });
      }

      for (const item of photo_orders) {
        await GalleryAlbumsRepository.updatePhotoOrder(id, item.photo_id, item.sort_order);
      }

      res.json({ success: true, message: 'Photo order updated successfully' });
    } catch (error) {
      this.logger.error('updatePhotoOrder', error);
      res.status(500).json({ success: false, error: 'Failed to update photo order' });
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
        return res.status(404).json({ success: false, error: 'Album not found' });
      }

      res.json({ success: true, data: album });
    } catch (error) {
      this.logger.error('setCoverPhoto', error);
      res.status(500).json({ success: false, error: 'Failed to set cover photo' });
    }
  }
}

module.exports = new GalleryAlbumsController();
