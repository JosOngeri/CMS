const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middleware/auth');

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

// Admin: Create notification
router.post('/', notificationsController.createNotification);

// Push notifications
router.post('/push', notificationsController.sendPushNotification);
router.post('/bulk', notificationsController.sendBulkNotifications);

// Notification templates
router.get('/templates', notificationsController.getNotificationTemplates);
router.post('/templates', notificationsController.createNotificationTemplate);
router.put('/templates/:templateId', notificationsController.updateNotificationTemplate);
router.delete('/templates/:templateId', notificationsController.deleteNotificationTemplate);

// Notification logs
router.get('/logs', notificationsController.getNotificationLogs);

module.exports = router;
