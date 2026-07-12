const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seo.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// SEO settings
router.get('/settings', requireRole(['Super Admin', 'Content Manager']), seoController.getSettings);
router.put('/settings', requireRole(['Super Admin', 'Content Manager']), seoController.updateSettings);

// SEO analysis
router.post('/analyze', requireRole(['Super Admin', 'Content Manager']), seoController.analyzeSEO);

module.exports = router;
