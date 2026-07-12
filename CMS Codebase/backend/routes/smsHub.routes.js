const express = require('express');
const router = express.Router();
const smsHubController = require('../controllers/smsHub.controller');
const { authenticateToken } = require('../middleware/auth');
const { hasRole } = require('../middleware/roleGuard');

// All SMS Hub routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/sms-hub/send
 * @desc    Send SMS with automatic provider selection
 * @access  Private
 */
router.post('/send', hasRole('admin', 'treasurer'), smsHubController.sendSMS);

/**
 * @route   GET /api/sms-hub/providers/:provider/status
 * @desc    Get SMS provider status
 * @access  Private
 */
router.get('/providers/:provider/status', hasRole('admin'), smsHubController.getProviderStatus);

/**
 * @route   GET /api/sms-hub/providers/status
 * @desc    Get all SMS provider statuses
 * @access  Private
 */
router.get('/providers/status', hasRole('admin'), smsHubController.getAllProviderStatuses);

/**
 * @route   POST /api/sms-hub/providers/reload
 * @desc    Reload SMS providers from database
 * @access  Private
 */
router.post('/providers/reload', hasRole('admin'), smsHubController.reloadProviders);

/**
 * @route   GET /api/sms-hub/integrations/:integration/health
 * @desc    Check API Hub integration health
 * @access  Private
 */
router.get('/integrations/:integration/health', hasRole('admin'), smsHubController.checkIntegrationHealth);

/**
 * @route   GET /api/sms-hub/integrations/status
 * @desc    Get all API Hub integration statuses
 * @access  Private
 */
router.get('/integrations/status', hasRole('admin'), smsHubController.getAllIntegrationStatuses);

module.exports = router;
