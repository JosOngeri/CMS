const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Security logs
router.get('/logs', requireRole(['Super Admin']), securityController.getSecurityLogs);

// Failed login attempts
router.get('/failed-attempts', requireRole(['Super Admin']), securityController.getFailedLoginAttempts);

// IP blocking
router.get('/blocked-ips', requireRole(['Super Admin']), securityController.getBlockedIPs);
router.post('/block-ip', requireRole(['Super Admin']), securityController.blockIP);
router.delete('/unblock-ip/:ipAddress', requireRole(['Super Admin']), securityController.unblockIP);

// Session management
router.get('/sessions/:userId', requireRole(['Super Admin']), securityController.getActiveSessions);
router.delete('/sessions/:userId', requireRole(['Super Admin']), securityController.revokeAllUserSessions);

// Security settings
router.get('/settings', requireRole(['Super Admin']), securityController.getSecuritySettings);
router.put('/settings', requireRole(['Super Admin']), securityController.updateSecuritySettings);

// Security analytics
router.get('/analytics', requireRole(['Super Admin']), securityController.getAnalytics);

module.exports = router;