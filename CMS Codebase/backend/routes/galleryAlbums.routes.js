const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all albums with advanced filtering
router.get('/details', galleryController.getAllAlbumsWithDetails);

// Get album by ID with photos
router.get('/:id/photos', galleryController.getAlbumWithPhotos);

// Create album with advanced options
router.post('/advanced', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.createAlbumAdvanced);

// Update album with advanced options
router.put('/:id/advanced', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.updateAlbumAdvanced);

// Delete album with sub-album check
router.delete('/:id/advanced', requireRole(['Super Admin', 'Pastor']), galleryController.deleteAlbumAdvanced);

// Add photos to album
router.post('/:id/photos', galleryController.addPhotosToAlbum);

// Remove photo from album
router.delete('/:id/photos/:photoId', galleryController.removePhotoFromAlbum);

// Update photo order
router.put('/:id/photos/order', galleryController.updatePhotoOrder);

// Set cover photo
router.put('/:id/cover', galleryController.setCoverPhoto);

module.exports = router;
