const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcements.controller');
const { authenticateToken, requireRole, requireDepartmentAccess } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

const announcementController = new AnnouncementController();

// Get public announcements (no authentication required)
router.get('/public', (req, res) => announcementController.getPublic(req, res));
router.get('/public/:id', (req, res) => announcementController.getPublicById(req, res));

// Get all announcements (public and user's department announcements)
router.get('/', authenticateToken, (req, res) => announcementController.getAll(req, res));

// Get single announcement
router.get('/:id', authenticateToken, (req, res) => announcementController.getById(req, res));

// Create announcement (authenticated users)
router.post('/',
  authenticateToken,
  validationRules.announcement.create,
  validate,
  (req, res) => announcementController.create(req, res)
);

// Update announcement (author or admin)
router.put('/:id',
  authenticateToken,
  validationRules.idParam,
  validate,
  validationRules.announcement.update,
  validate,
  (req, res) => announcementController.update(req, res)
);

// Delete announcement (author or admin)
router.delete('/:id', authenticateToken, (req, res) => announcementController.delete(req, res));

module.exports = router;
