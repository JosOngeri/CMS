const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegram.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation rules
const channelValidation = [
  body('channelId').notEmpty().withMessage('Channel ID is required'),
  body('channelName').notEmpty().withMessage('Channel name is required'),
];

const postValidation = [
  body('text').notEmpty().withMessage('Message text is required'),
];

// All routes require authentication
router.use(authenticateToken);

// Channel management
router.get('/channels', telegramController.getChannels);
router.post('/channels', channelValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  telegramController.createChannel(req, res, next);
});
router.put('/channels/:id', telegramController.updateChannel);
router.delete('/channels/:id', requireRole(['Super Admin', 'Pastor', 'First Elder']), telegramController.deleteChannel);

// Post management
router.post('/channels/:id/post', postValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  telegramController.postToChannel(req, res, next);
});
router.get('/channels/:id/posts', telegramController.getPosts);
router.post('/channels/:id/sync', telegramController.syncChannelPosts);

// Photo upload
router.post('/upload-photo', telegramController.uploadPhoto);

// Settings
router.get('/settings', requireRole(['Super Admin', 'Pastor']), telegramController.getSettings);
router.put('/settings', requireRole(['Super Admin', 'Pastor']), telegramController.updateSettings);

// Auth status (for gallery integration)
router.get('/auth/status', telegramController.getAuthStatus);
router.get('/auth-methods', (req, res) => res.json({ methods: [] }));
router.post('/auth/start', telegramController.startAuth);
router.post('/auth/start-fallback', telegramController.startAuthFallback);
router.post('/auth/verify', telegramController.verifyAuth);

// Cache management
router.get('/cache/health', requireRole(['Super Admin', 'Pastor']), telegramController.getCacheHealth);
router.post('/cache/refresh', requireRole(['Super Admin', 'Pastor']), telegramController.refreshCache);

// Gallery integration
router.get('/channels/:id/gallery-photos', telegramController.getGalleryPhotos);
router.get('/channels/:id/photos/album', telegramController.filterPhotosByAlbum);
router.get('/channels/:id/photos/tags', telegramController.filterPhotosByTags);

// MTProto authentication for 2FA channels
router.post('/channels/:id/mtproto/init', requireRole(['Super Admin', 'Pastor']), telegramController.initMTProtoAuth);
router.post('/channels/:id/mtproto/verify', requireRole(['Super Admin', 'Pastor']), telegramController.verifyMTProtoAuth);
router.get('/channels/:id/mtproto/status', requireRole(['Super Admin', 'Pastor']), telegramController.getMTProtoAuthStatus);

// Webhook (public endpoint for Telegram)
router.post('/webhook', telegramController.handleWebhook);

module.exports = router;