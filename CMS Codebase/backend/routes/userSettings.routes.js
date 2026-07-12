const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserPreferences,
  updateUserPreferences,
  changePassword,
  getActivityHistory
} = require('../controllers/userSettings.controller');

// All routes require authentication
router.use(authenticateToken);

// Get user preferences
router.get('/preferences', getUserPreferences);

// Update user preferences
router.put('/preferences', updateUserPreferences);

// Change password
router.post('/change-password', changePassword);

// Get activity history
router.get('/activity-history', getActivityHistory);

module.exports = router;
