const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public route - no authentication required
router.get('/photos', galleryController.getPublicPhotos);
router.get('/photos/paginated', galleryController.getPublicPhotosPaginated);

// Search and filtering routes (public access for search, auth for advanced filtering)
router.get('/photos/search', galleryController.searchPhotos);
router.get('/photos/filter/tags', authenticateToken, galleryController.filterPhotosByTags);
router.get('/photos/filter/date', authenticateToken, galleryController.filterPhotosByDate);

// All routes require authentication
router.use(authenticateToken);

// Categories route
router.get('/categories', galleryController.getCategories);

// Albums routes
router.get('/albums', galleryController.getAllAlbums);
router.get('/albums/:id', galleryController.getAlbumById);
router.post('/albums', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.createAlbum);
router.put('/albums/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.updateAlbum);
router.delete('/albums/:id', requireRole(['Super Admin', 'Pastor']), galleryController.deleteAlbum);

// Photos routes
router.post('/albums/:albumId/photos', authenticateToken, galleryController.uploadPhoto);
router.put('/photos/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.updatePhoto);
router.delete('/photos/:id', requireRole(['Super Admin', 'Pastor']), galleryController.deletePhoto);

// Gallery sync (frontend requests this from GalleryManagement)
router.post('/sync', requireRole(['Super Admin', 'Pastor', 'Department Head']), (req, res) => {
  res.json({ success: true, synced: 0, message: 'No Telegram channel configured for sync' });
});

// Tags routes
router.get('/tags', galleryController.getTags);
router.post('/photos/tags', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.addTagToPhoto);
router.delete('/photos/:photoId/tags/:tagId', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.removeTagFromPhoto);

// Comments routes
router.get('/photos/:photoId/comments', galleryController.getComments);
router.post('/photos/:photoId/comments', galleryController.addComment);

// Metadata and privacy routes
router.put('/photos/:photoId/metadata', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.updatePhotoMetadata);
router.put('/photos/:photoId/privacy', requireRole(['Super Admin', 'Pastor', 'Department Head']), galleryController.updatePhotoPrivacy);

// Analytics and tracking routes
router.get('/photos/:photoId/analytics', galleryController.getPhotoAnalytics);
router.post('/photos/:photoId/download', galleryController.recordPhotoDownload);
router.post('/photos/:photoId/share', galleryController.sharePhoto);
router.get('/analytics', galleryController.getGalleryAnalytics);

module.exports = router;

