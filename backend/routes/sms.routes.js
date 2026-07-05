const express = require('express');
const router = express.Router();
const smsController = require('../controllers/sms.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Providers
router.get('/providers', smsController.getProviders);
router.post('/providers', requireRole(['Super Admin', 'Pastor']), smsController.createProvider);

// Templates
router.get('/templates', smsController.getTemplates);
router.post('/templates', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.createTemplate);
router.delete('/templates/:id', requireRole(['Super Admin', 'Pastor']), smsController.deleteTemplate);

// Send SMS
router.post('/send', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.sendSMS);
router.post('/send-blessed', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsController.sendSMS); // Alias for frontend compatibility

// Logs
router.get('/logs', smsController.getSMSLogs);
router.get('/history', smsController.getSMSLogs); // Alias for frontend compatibility

// Balance
router.get('/balance', smsController.getSMSBalance);

// Campaigns
router.get('/campaigns', smsController.getCampaigns);
router.post('/campaigns', requireRole(['Super Admin', 'Pastor']), smsController.createCampaign);
router.post('/campaigns/:campaignId/send', requireRole(['Super Admin', 'Pastor']), smsController.sendCampaign);
router.put('/campaigns/:id/status', requireRole(['Super Admin', 'Pastor']), smsController.updateCampaignStatus);

// Stats
router.get('/stats', smsController.getSMSStats);
router.get('/analytics', smsController.getAnalytics);


// Rate Limiting
router.get('/rate-limit', smsController.getRateLimit);
router.get('/recent', smsController.getRecentMessages);

// Template Advanced Features
router.get('/templates/:id/analytics', smsController.getTemplateAnalytics);
router.get('/templates/:id/versions', smsController.getTemplateVersions);
router.put('/templates/:id/approve', requireRole(['Super Admin', 'Pastor']), smsController.approveTemplate);
router.put('/templates/:id/reject', requireRole(['Super Admin', 'Pastor']), smsController.rejectTemplate);
router.get('/templates/:id/ab-tests', smsController.getABTestResults);

// Campaign Advanced Features
router.post('/campaigns/:id/optimize', requireRole(['Super Admin', 'Pastor']), smsController.optimizeCampaign);

// Advanced Analytics
router.get('/analytics/predictive', smsController.getPredictiveAnalytics);
router.get('/analytics/benchmarks', smsController.getBenchmarks);
router.get('/analytics/collaboration', smsController.getCollaborationInsights);
module.exports = router;

