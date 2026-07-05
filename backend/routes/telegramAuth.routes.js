const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const telegramAuthController = require('../controllers/telegramAuth.controller');

// Get all auth methods
router.get('/auth-methods', authenticateToken, telegramAuthController.getAuthMethods);

// Create auth method
router.post('/auth-methods', authenticateToken, requireRole(['Super Admin', 'Pastor']), telegramAuthController.createAuthMethod);

// Update auth method
router.put('/auth-methods/:id', authenticateToken, requireRole(['Super Admin', 'Pastor']), telegramAuthController.updateAuthMethod);

// Delete auth method
router.delete('/auth-methods/:id', authenticateToken, requireRole(['Super Admin', 'Pastor']), telegramAuthController.deleteAuthMethod);

// Set as default
router.put('/auth-methods/:id/set-default', authenticateToken, requireRole(['Super Admin', 'Pastor']), telegramAuthController.setDefault);

// Test connection
router.post('/auth-methods/:id/test', authenticateToken, telegramAuthController.testConnection);

// Start verification
router.post('/start-auth', authenticateToken, telegramAuthController.startVerification);

// Verify code
router.post('/verify-auth', authenticateToken, telegramAuthController.verifyCode);

module.exports = router;
