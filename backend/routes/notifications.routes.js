const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Roles allowed to compose/target notifications to other users
const NOTIFY_ADMINS = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Department Head'];

// All routes require authentication
router.use(authenticateToken);

// Notifications
router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.post('/:notificationId/read', notificationsController.markAsRead);
router.post('/mark-all-read', notificationsController.markAllAsRead);
router.post('/read-all', notificationsController.markAllAsRead); // Alias for frontend compatibility
router.delete('/:notificationId', notificationsController.deleteNotification);

// Notification types
router.get('/types', notificationsController.getNotificationTypes);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreferences);

// Admin: Create notification — arbitrary userId targets would otherwise let
// any member spoof/spam other users (ledger L142)
router.post('/', requireRole(NOTIFY_ADMINS), notificationsController.createNotification);

// Push notifications
router.post('/push', requireRole(NOTIFY_ADMINS), notificationsController.sendPushNotification);
router.post('/bulk', requireRole(NOTIFY_ADMINS), notificationsController.sendBulkNotifications);

// Notification templates
router.get('/templates', requireRole(NOTIFY_ADMINS), notificationsController.getNotificationTemplates);
router.post('/templates', requireRole(NOTIFY_ADMINS), notificationsController.createNotificationTemplate);
router.put('/templates/:templateId', requireRole(NOTIFY_ADMINS), notificationsController.updateNotificationTemplate);
router.delete('/templates/:templateId', requireRole(NOTIFY_ADMINS), notificationsController.deleteNotificationTemplate);

// Notification logs
router.get('/logs', requireRole(NOTIFY_ADMINS), notificationsController.getNotificationLogs);

module.exports = router;
