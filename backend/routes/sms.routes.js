const express = require('express');
const router = express.Router();
const smsController = require('../controllers/sms.controller');
const smsGatewayController = require('../controllers/smsGateway.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// SMS reads expose member phone numbers, message content and spend data —
// restricted to communications/admin roles, not every authenticated member.
const SMS_READERS = ['Super Admin', 'Pastor', 'First Elder', 'Department Head', 'Treasurer'];

// Providers
router.get('/providers', requireRole(SMS_READERS), smsController.getProviders);
router.post('/providers', requireRole(['Super Admin', 'Pastor']), smsController.createProvider);

// Templates
router.get('/templates', requireRole(SMS_READERS), smsController.getTemplates);
router.post('/templates', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.createTemplate);
router.delete('/templates/:id', requireRole(['Super Admin', 'Pastor']), smsController.deleteTemplate);
router.post('/send-template', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.sendTemplate);

// Send SMS
router.post('/send', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.sendSMS);
router.post('/send-blessed', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.sendSMS); // Alias for frontend compatibility

// Delivery Status
router.post('/poll-delivery-status', requireRole(['Super Admin', 'Pastor']), smsController.pollDeliveryStatus);

// Logs
router.get('/logs', requireRole(SMS_READERS), smsController.getSMSLogs);
router.get('/history', requireRole(SMS_READERS), smsController.getSMSLogs); // Alias for frontend compatibility

// Balance
router.get('/balance', requireRole(SMS_READERS), smsController.getSMSBalance);

// Campaigns
router.get('/campaigns', requireRole(SMS_READERS), smsController.getCampaigns);
router.post('/campaigns', requireRole(['Super Admin', 'Pastor']), smsController.createCampaign);
router.post('/campaigns/:campaignId/send', requireRole(['Super Admin', 'Pastor']), smsController.sendCampaign);
router.put('/campaigns/:id/status', requireRole(['Super Admin', 'Pastor']), smsController.updateCampaignStatus);

// Stats
router.get('/stats', requireRole(SMS_READERS), smsController.getSMSStats);
router.get('/analytics', requireRole(SMS_READERS), smsController.getAnalytics);


// Rate Limiting
router.get('/rate-limit', requireRole(SMS_READERS), smsController.getRateLimit);
router.get('/recent', requireRole(SMS_READERS), smsController.getRecentMessages);

// JOSms gateway — device-facing writes need any authenticated identity
// (the relay uses an SMS-scoped token); reads stay role-gated.
router.get('/gateway-status', requireRole(SMS_READERS), smsGatewayController.getGatewayStatus);
router.post('/gateway-heartbeat', smsGatewayController.heartbeat);
router.post('/delivery-report', smsGatewayController.deliveryReport);
router.get('/deliveries', requireRole(SMS_READERS), smsGatewayController.listDeliveries);

// Template Advanced Features
router.get('/templates/:id/analytics', requireRole(SMS_READERS), smsController.getTemplateAnalytics);
router.get('/templates/:id/versions', requireRole(SMS_READERS), smsController.getTemplateVersions);
router.put('/templates/:id/approve', requireRole(['Super Admin', 'Pastor']), smsController.approveTemplate);
router.put('/templates/:id/reject', requireRole(['Super Admin', 'Pastor']), smsController.rejectTemplate);
router.get('/templates/:id/ab-tests', requireRole(SMS_READERS), smsController.getABTestResults);

// Campaign Advanced Features
router.post('/campaigns/:id/optimize', requireRole(['Super Admin', 'Pastor']), smsController.optimizeCampaign);

// Advanced Analytics
router.get('/analytics/predictive', requireRole(SMS_READERS), smsController.getPredictiveAnalytics);
router.get('/analytics/benchmarks', requireRole(SMS_READERS), smsController.getBenchmarks);
router.get('/analytics/collaboration', requireRole(SMS_READERS), smsController.getCollaborationInsights);
module.exports = router;

