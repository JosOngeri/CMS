const express = require('express');
const router = express.Router();
const smsSyncController = require('../controllers/smsSync.controller');
const { authenticateToken } = require('../middleware/auth');

// All SMS sync routes require authentication
router.use(authenticateToken);

// Snapshot download endpoint
router.get('/snapshot', smsSyncController.downloadSnapshot);

// Rolling updates endpoint
router.get('/updates', smsSyncController.getRollingUpdates);

module.exports = router;
