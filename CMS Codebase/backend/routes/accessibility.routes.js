const express = require('express');
const router = express.Router();
const accessibilityController = require('../controllers/accessibility.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Accessibility settings
router.get('/settings', accessibilityController.getSettings);
router.put('/settings', requireRole(['Super Admin']), accessibilityController.updateSettings);

// Accessibility audit
router.post('/audit', requireRole(['Super Admin']), accessibilityController.audit);

module.exports = router;
