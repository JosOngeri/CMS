const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * Notification Service (Phase 10)
 * Real-time notification delivery via WebSocket
 * Handles notification templates, delivery tracking, and aggregation
 */
class NotificationService {
  constructor() {
    this.io = null; // Set via server.js
    this.notificationQueue = new Map();
    this.batchInterval = 5000; // 5 seconds batch interval
    this.startBatchProcessor();
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Send real-time notification via WebSocket
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   */
  async sendRealTimeNotification(userId, notification) {
    if (!this.io) {
      logger.warn('Socket.io not initialized, cannot send real-time notification');
      return false;
    }

    try {
      // Emit to user's personal namespace
      this.io.to(`user:${userId}`).emit('notification', notification);
      logger.info(`Real-time notification sent to user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send real-time notification to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Create notification from template
   * @param {string} templateId - Template ID
   * @param {object} variables - Template variables
   * @param {string} userId - User ID
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Created notification
   */
  async createFromTemplate(templateId, variables, userId, churchId) {
    try {
      // Get template
      const template = await this.getTemplate(templateId, churchId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Replace variables in template
      const { title, message } = this.replaceVariables(template, variables);

      // Create notification
      const notification = await this.createNotification({
        user_id: userId,
        type_id: template.type_id,
        title,
        message,
        action_url: this.replaceVariables(template.action_url || null, variables),
        metadata: { templateId, variables }
      }, churchId);

      // Send real-time notification
      await this.sendRealTimeNotification(userId, notification);

      // Track delivery
      await this.trackDelivery(notification.id, 'delivered');

      return notification;
    } catch (error) {
      logger.error('Failed to create notification from template:', error);
      throw error;
    }
  }

  /**
   * Replace variables in template string
   * @param {string} template - Template string
   * @param {object} variables - Variables to replace
   * @returns {string} Processed string
   */
  replaceVariables(template, variables) {
    if (!template) return null;
    
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Get notification template
   * @param {string} templateId - Template ID
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Template
   */
  async getTemplate(templateId, churchId) {
    const query = `
      SELECT id, name, type_id, title, message, action_url, variables, church_id
      FROM notification_templates
      WHERE id = $1 AND (church_id = $2 OR church_id IS NULL)
    `;
    const result = await pool.query(query, [templateId, churchId]);
    return result.rows[0] || null;
  }

  /**
   * Create notification in database
   * @param {object} data - Notification data
   * @param {string} churchId - Church ID
   * @returns {Promise<object>} Created notification
   */
  async createNotification(data, churchId) {
    const query = `
      INSERT INTO notifications (user_id, type_id, title, message, action_url, metadata, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.user_id,
      data.type_id,
      data.title,
      data.message,
      data.action_url,
      JSON.stringify(data.metadata || {}),
      churchId
    ]);
    return result.rows[0];
  }

  /**
   * Track notification delivery
   * @param {string} notificationId - Notification ID
   * @param {string} status - Delivery status
   * @param {object} metadata - Additional metadata
   */
  async trackDelivery(notificationId, status, metadata = {}) {
    try {
      const query = `
        INSERT INTO notification_delivery (notification_id, status, metadata, delivered_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (notification_id) DO UPDATE SET
          status = $2,
          metadata = $3,
          delivered_at = CURRENT_TIMESTAMP
      `;
      await pool.query(query, [notificationId, status, JSON.stringify(metadata)]);
    } catch (error) {
      logger.error('Failed to track notification delivery:', error);
    }
  }

  /**
   * Batch notifications for user (aggregation)
   * @param {string} userId - User ID
   * @param {array} notifications - Notifications to batch
   */
  async batchNotifications(userId, notifications) {
    const existingQueue = this.notificationQueue.get(userId) || [];
    this.notificationQueue.set(userId, [...existingQueue, ...notifications]);
  }

  /**
   * Start batch processor
   */
  startBatchProcessor() {
    setInterval(async () => {
      for (const [userId, notifications] of this.notificationQueue.entries()) {
        if (notifications.length > 0) {
          // Create aggregated notification
          const aggregated = await this.createAggregatedNotification(userId, notifications);
          
          // Send real-time
          await this.sendRealTimeNotification(userId, aggregated);
          
          // Clear queue
          this.notificationQueue.set(userId, []);
        }
      }
    }, this.batchInterval);
  }

  /**
   * Create aggregated notification
   * @param {string} userId - User ID
   * @param {array} notifications - Notifications to aggregate
   * @returns {Promise<object>} Aggregated notification
   */
  async createAggregatedNotification(userId, notifications) {
    const types = [...new Set(notifications.map(n => n.type_id))];
    const count = notifications.length;
    
    const aggregated = await this.createNotification({
      user_id: userId,
      type_id: 'aggregated',
      title: `${count} New Notifications`,
      message: `You have ${count} new notifications across ${types.length} categories.`,
      metadata: { aggregated: true, originalNotifications: notifications.map(n => n.id) }
    }, notifications[0].church_id);

    return aggregated;
  }

  /**
   * Get notification history for user
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<object[]>} Notification history
   */
  async getNotificationHistory(userId, filters = {}) {
    const conditions = ['user_id = $1'];
    const params = [userId];
    let paramCount = 2;

    if (filters.type_id) {
      conditions.push(`type_id = $${paramCount++}`);
      params.push(filters.type_id);
    }

    if (filters.start_date) {
      conditions.push(`created_at >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`created_at <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT n.*, nd.status, nd.delivered_at
      FROM notifications n
      LEFT JOIN notification_delivery nd ON n.id = nd.notification_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC
      LIMIT ${filters.limit || 100}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get notification delivery statistics
   * @param {string} churchId - Church ID
   * @param {object} filters - Date filters
   * @returns {Promise<object>} Delivery statistics
   */
  async getDeliveryStats(churchId, filters = {}) {
    const conditions = ['n.church_id = $1'];
    const params = [churchId];
    let paramCount = 2;

    if (filters.start_date) {
      conditions.push(`n.created_at >= $${paramCount++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`n.created_at <= $${paramCount++}`);
      params.push(filters.end_date);
    }

    const query = `
      SELECT
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE nd.status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE nd.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE nd.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE n.is_read = true) as read,
        COUNT(*) FILTER (WHERE n.is_read = false) as unread
      FROM notifications n
      LEFT JOIN notification_delivery nd ON n.id = nd.notification_id
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new NotificationService();
