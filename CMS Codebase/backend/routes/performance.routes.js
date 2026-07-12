const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Performance metrics
router.get('/metrics', requireRole(['Super Admin']), performanceController.getMetrics);

// Cache stats
router.get('/cache-stats', requireRole(['Super Admin']), performanceController.getCacheStats);

module.exports = router;
