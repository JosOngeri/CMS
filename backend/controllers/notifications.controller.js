const BaseController = require('./BaseController');
const NotificationsRepository = require('../repositories/NotificationsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Notifications Controller
 * Handles user notifications, preferences, and notification types
 */
class NotificationsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('NotificationsController');
  }

  /**
   * Get user notifications
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.unreadOnly] - Filter unread only
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const { unreadOnly, limit = 50, offset = 0 } = req.query;

      const notifications = await NotificationsRepository.getUserNotifications(
        userId,
        churchId,
        unreadOnly === 'true',
        limit,
        offset
      );

      res.json({ success: true, data: notifications });
    } catch (error) {
      this.logger.error('getNotifications', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Mark a notification as read
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.notificationId - Notification ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await NotificationsRepository.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      this.logger.error('markAsRead', error);
      res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all notifications as read
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      await NotificationsRepository.markAllAsRead(userId, churchId);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      this.logger.error('markAllAsRead', error);
      res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
    }
  }

  /**
   * Delete a notification
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.notificationId - Notification ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      await NotificationsRepository.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      this.logger.error('deleteNotification', error);
      res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
  }

  /**
   * Get unread notification count
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const count = await NotificationsRepository.getUnreadCount(userId, churchId);

      res.json({ success: true, data: { count } });
    } catch (error) {
      this.logger.error('getUnreadCount', error);
      res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }
  }

  /**
   * Get notification types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getNotificationTypes(req, res) {
    try {
      const churchId = req.user.church_id;

      const types = await NotificationsRepository.getNotificationTypes(churchId);

      res.json({ success: true, data: types });
    } catch (error) {
      this.logger.error('getNotificationTypes', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notification types' });
    }
  }

  /**
   * Get user notification preferences
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const preferences = await NotificationsRepository.getUserPreferences(userId, churchId);

      res.json({ success: true, data: preferences });
    } catch (error) {
      this.logger.error('getPreferences', error);
      res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
    }
  }

  /**
   * Update notification preferences
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.body - Request body
   * @param {Object} req.body.preferences - Preference object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const { preferences } = req.body;

      const updated = await NotificationsRepository.updatePreferences(userId, preferences, churchId);

      res.json({ success: true, data: updated });
    } catch (error) {
      this.logger.error('updatePreferences', error);
      res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }
  }

  /**
   * Create a notification
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} req.body.typeId - Notification type ID
   * @param {string} req.body.title - Notification title
   * @param {string} req.body.message - Notification message
   * @param {string} [req.body.actionUrl] - Action URL
   * @param {Object} [req.body.metadata] - Additional metadata
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createNotification(req, res) {
    try {
      const { userId, typeId, title, message, actionUrl, metadata } = req.body;
      const churchId = req.user.church_id;

      const notification = await NotificationsRepository.createNotification({
        user_id: userId,
        type_id: typeId,
        title,
        message,
        action_url: actionUrl,
        metadata
      }, churchId);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification
      });
    } catch (error) {
      this.logger.error('createNotification', error);
      res.status(500).json({ success: false, error: 'Failed to create notification' });
    }
  }

  /**
   * Send push notification
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} req.body.title - Notification title
   * @param {string} req.body.body - Notification body
   * @param {string} [req.body.data] - Additional data
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async sendPushNotification(req, res) {
    try {
      const { userId, title, body, data } = req.body;

      // In a real implementation, this would integrate with FCM, APNS, or Web Push
      // For now, we'll simulate it and log the notification
      this.logger.info('sendPushNotification', { userId, title, body, data });

      // Create notification record
      await NotificationsRepository.createPushNotification(userId, title, body, data);

      res.json({ success: true, message: 'Push notification sent' });
    } catch (error) {
      this.logger.error('sendPushNotification', error);
      res.status(500).json({ success: false, error: 'Failed to send push notification' });
    }
  }

  /**
   * Send bulk notifications
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array} req.body.userIds - Array of user IDs
   * @param {string} req.body.title - Notification title
   * @param {string} req.body.message - Notification message
   * @param {string} [req.body.typeId] - Notification type ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async sendBulkNotifications(req, res) {
    try {
      const { userIds, title, message, typeId } = req.body;

      const results = await NotificationsRepository.createBulkNotifications(userIds, typeId, title, message);

      res.json({
        success: true,
        message: `Sent ${results.length} notifications`,
        data: results
      });
    } catch (error) {
      this.logger.error('sendBulkNotifications', error);
      res.status(500).json({ success: false, error: 'Failed to send bulk notifications' });
    }
  }

  /**
   * Get notification templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getNotificationTemplates(req, res) {
    try {
      const templates = await NotificationsRepository.getNotificationTemplates();

      res.json({ success: true, data: templates });
    } catch (error) {
      this.logger.error('getNotificationTemplates', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notification templates' });
    }
  }

  /**
   * Create notification template
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Template name
   * @param {string} req.body.subject - Template subject
   * @param {string} req.body.body - Template body
   * @param {string} req.body.channel - Channel (email, sms, push, in_app)
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createNotificationTemplate(req, res) {
    try {
      const { name, subject, body, channel } = req.body;
      const userId = req.user.id;

      const template = await NotificationsRepository.createTemplate({
        name,
        subject,
        body,
        channel,
        created_by: userId
      });

      res.json({ success: true, data: template });
    } catch (error) {
      this.logger.error('createNotificationTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to create notification template' });
    }
  }

  /**
   * Update notification template
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.templateId - Template ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.subject] - Template subject
   * @param {string} [req.body.body] - Template body
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateNotificationTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { subject, body } = req.body;

      const template = await NotificationsRepository.updateTemplate(templateId, {
        subject,
        body
      });

      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ success: true, data: template });
    } catch (error) {
      this.logger.error('updateNotificationTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to update notification template' });
    }
  }

  /**
   * Delete notification template
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.templateId - Template ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteNotificationTemplate(req, res) {
    try {
      const { templateId } = req.params;

      const template = await NotificationsRepository.deleteTemplate(templateId);

      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      this.logger.error('deleteNotificationTemplate', error);
      res.status(500).json({ success: false, error: 'Failed to delete notification template' });
    }
  }

  /**
   * Get notification logs
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getNotificationLogs(req, res) {
    try {
      const { startDate, endDate, userId, typeId } = req.query;

      const logs = await NotificationsRepository.getNotificationLog({
        userId,
        typeId,
        startDate,
        endDate,
        limit: 100
      });

      res.json({ success: true, data: logs });
    } catch (error) {
      this.logger.error('getNotificationLogs', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notification logs' });
    }
  }
}

module.exports = new NotificationsController();
