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

// Platform-level announcements — the SaaS operator broadcasting to all
// churches (maintenance windows, releases). Authenticated church users only.
router.get('/platform', authenticateToken, async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const result = await pool.query(
      `SELECT id, title, body, severity, created_at, expires_at
       FROM platform_announcements
       WHERE is_active = true
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         AND target IN ('all', 'admins')
       ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    // The table may not exist yet on older databases — degrade to empty
    // rather than breaking the church app's announcements feed.
    if (error.code === '42P01') return res.json({ success: true, data: [] });
    res.status(500).json({ success: false, error: 'Failed to fetch platform announcements' });
  }
});

// Get single announcement
router.get('/:id', authenticateToken, (req, res) => announcementController.getById(req, res));

// Create announcement (authenticated users)
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Department Head']),
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
