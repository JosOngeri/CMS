const express = require('express');
const router = express.Router();
const testingController = require('../controllers/testing.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Test results
router.get('/results', requireRole(['Super Admin', 'Developer']), testingController.getResults);

// Run tests
router.post('/run/:type', requireRole(['Super Admin', 'Developer']), testingController.runTests);

module.exports = router;
