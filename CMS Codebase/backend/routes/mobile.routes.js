const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobile.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Mobile dashboard
router.get('/dashboard', mobileController.getMobileDashboard);

// Mobile content
router.get('/content', mobileController.getMobileContent);

// Mobile announcements
router.get('/announcements', mobileController.getMobileAnnouncements);

// Mobile departments
router.get('/departments', mobileController.getMobileDepartments);

// Mobile events
router.get('/events', mobileController.getMobileEvents);

// Mobile data sync
router.post('/sync', mobileController.syncMobileData);

// ==================== SMS INTEGRATION ENDPOINTS ====================

// Contact sync endpoints
router.get('/contacts/sync', mobileController.syncContacts);
router.post('/contacts/upload', mobileController.uploadContactChanges);
router.get('/contacts/delta', mobileController.getDeltaContacts);

// Template sync endpoints
router.get('/templates/sync', mobileController.syncTemplates);
router.post('/templates/analytics', mobileController.uploadTemplateAnalytics);
router.get('/templates/official', mobileController.getOfficialTemplates);

// SMS log sync
router.post('/sms/logs/upload', mobileController.uploadSmsLogs);
router.get('/sms/logs/sync', mobileController.syncSmsLogs);
router.get('/sms/logs/pending', mobileController.getPendingSmsLogs);

// Campaign management
router.post('/campaigns/mobile', requireRole(['Super Admin', 'Pastor', 'Department Head']), mobileController.createMobileCampaign);
router.get('/campaigns/:id/progress', mobileController.getCampaignProgress);
router.get('/campaigns/mobile', mobileController.getMobileCampaigns);

// Unified analytics
router.get('/analytics/unified', mobileController.getUnifiedAnalytics);
router.get('/analytics/sms', mobileController.getSmsAnalytics);

// Authentication for mobile
router.post('/auth/login', mobileController.mobileLogin);
router.post('/auth/refresh', mobileController.refreshAuthToken);
router.post('/auth/logout', mobileController.mobileLogout);

// Sync status management
router.get('/sync/status', mobileController.getSyncStatus);
router.post('/sync/status', mobileController.updateSyncStatus);
router.post('/sync/reset', requireRole(['Super Admin']), mobileController.resetSync);

// Mobile device management
router.get('/devices', mobileController.getMobileDevices);
router.post('/devices/register', mobileController.registerMobileDevice);
router.delete('/devices/:id', mobileController.unregisterMobileDevice);

module.exports = router;