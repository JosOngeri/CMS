const express = require('express');
const router = express.Router();
const galleryAlbumsController = require('../controllers/galleryAlbums.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all albums
router.get('/', galleryAlbumsController.getAllAlbums);

// Get album by ID
router.get('/:id', galleryAlbumsController.getAlbumById);

// Create album
router.post('/', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryAlbumsController.createAlbum);

// Update album
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryAlbumsController.updateAlbum);

// Delete album
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), galleryAlbumsController.deleteAlbum);

// Add photos to album
router.post('/:id/photos', galleryAlbumsController.addPhotosToAlbum);

// Remove photo from album
router.delete('/:id/photos/:photoId', galleryAlbumsController.removePhotoFromAlbum);

// Update photo order
router.put('/:id/photos/order', galleryAlbumsController.updatePhotoOrder);

// Set cover photo
router.put('/:id/cover', galleryAlbumsController.setCoverPhoto);

module.exports = router;
