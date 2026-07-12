const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoring.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Monitoring metrics
router.get('/metrics', requireRole(['Super Admin']), monitoringController.getMetrics);

// Logs
router.get('/logs', requireRole(['Super Admin']), monitoringController.getLogs);

module.exports = router;
