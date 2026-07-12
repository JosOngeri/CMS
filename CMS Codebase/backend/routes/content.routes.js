const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation rules
const contentValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
];

// Public routes
router.get('/public/:slug', contentController.getContentBySlug);
router.get('/website-settings', contentController.getWebsiteSettings);

// Protected routes
router.use(authenticateToken);

// Categories and Tags (must come before /:id)
router.get('/categories-list', contentController.getCategories);
router.get('/tags-list', contentController.getTags);

// Content CRUD
router.get('/', contentController.getAllContent);
router.post('/', requireRole(['Super Admin', 'Pastor', 'First Elder']), contentValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  contentController.createContent(req, res, next);
});

router.get('/:id', contentController.getContentBySlug);
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'First Elder']), contentValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  contentController.updateContent(req, res, next);
});

router.delete('/:id', requireRole(['Super Admin', 'Pastor']), contentController.deleteContent);
router.post('/:id/publish', requireRole(['Super Admin', 'Pastor', 'First Elder']), contentController.publishContent);

// Revisions
router.get('/:id/revisions', contentController.getRevisions);
router.post('/:id/rollback/:revisionId', requireRole(['Super Admin', 'Pastor']), contentController.rollbackToRevision);

// Collaboration
router.get('/:id/collaborators', contentController.getContentCollaborators);
router.post('/:id/collaborators', contentController.addContentCollaborator);
router.delete('/:id/collaborators/:userId', contentController.removeContentCollaborator);

// Comments
router.get('/:id/comments', contentController.getContentComments);
router.post('/:id/comments', contentController.addContentComment);

// Locking
router.post('/:id/lock', contentController.lockContent);
router.delete('/:id/lock', contentController.unlockContent);
router.get('/:id/lock-status', contentController.getContentLockStatus);

// Scheduled Publishing
router.post('/:id/schedule', contentController.schedulePublish);
router.post('/:id/unpublish', contentController.unpublishContent);
router.get('/scheduled', contentController.getScheduledContent);

// Website Settings
router.put('/website-settings', requireRole(['Super Admin', 'Pastor']), contentController.updateWebsiteSettings);

// Auto-save and Analytics
router.post('/:id/auto-save', contentController.autoSaveContent);
router.get('/check-duplicate', contentController.checkDuplicateContent);
router.get('/export', requireRole(['Super Admin', 'Pastor']), contentController.exportContent);
router.post('/import', requireRole(['Super Admin', 'Pastor']), contentController.importContent);
router.get('/analytics', contentController.getContentAnalytics);

module.exports = router;