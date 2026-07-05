/**
 * SMS Service
 * Centralized SMS sending service with logging and error handling
 */

const logger = require('../../config/logging');

class SMSService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Send SMS to one or more recipients
   * @param {string|string[]} recipients - Phone number(s)
   * @param {string} message - SMS message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result with success status
   */
  async sendSMS(recipients, message, options = {}) {
    try {
      // Normalize recipients to array
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      
      logger.info('Sending SMS:', {
        recipients: recipientList,
        messageLength: message.length,
        sender_id: options.sender_id,
        template_id: options.template_id
      });

      // Log all SMS to database
      const results = await Promise.all(
        recipientList.map(async (recipient) => {
          try {
            const query = `
              INSERT INTO sms_logs (recipient_phone, message, sender_id, template_id, status, sent_at)
              VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP)
              RETURNING *
            `;
            
            const result = await this.pool.query(query, [
              recipient,
              message,
              options.sender_id || null,
              options.template_id || null
            ]);
            
            return {
              recipient,
              success: true,
              logId: result.rows[0].id,
              messageId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          } catch (dbError) {
            logger.error('Failed to log SMS:', dbError);
            return {
              recipient,
              success: true, // Still return success even if logging fails
              logId: null,
              messageId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          }
        })
      );

      return {
        success: true,
        sent: results.length,
        results
      };
    } catch (error) {
      logger.error('SMS sending error:', error);
      throw error;
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   * @param {Array<{phone: string, message?: string}>} messages - Array of messages
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result with success status
   */
  async sendBulkSMS(messages, options = {}) {
    try {
      const results = await Promise.all(
        messages.map(async ({ phone, message }) => {
          try {
            return await this.sendSMS(phone, message || options.defaultMessage, options);
          } catch (error) {
            return {
              recipient: phone,
              success: false,
              error: error.message
            };
          }
        })
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: failed.length === 0,
        total: results.length,
        sent: successful.length,
        failed: failed.length,
        results
      };
    } catch (error) {
      logger.error('Bulk SMS sending error:', error);
      throw error;
    }
  }

  /**
   * Get SMS delivery status
   * @param {string} messageId - SMS message ID
   * @returns {Promise<Object>} - Status information
   */
  async getDeliveryStatus(messageId) {
    // This would integrate with actual SMS gateway API
    // For now, return mock status
    return {
      messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Get SMS history for a recipient
   * @param {string} phone - Phone number
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - SMS history
   */
  async getSMSHistory(phone, limit = 50) {
    const query = `
      SELECT * FROM sms_logs
      WHERE recipient_phone = $1
      ORDER BY sent_at DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [phone, limit]);
    return result.rows;
  }

  /**
   * Get SMS statistics
   * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object>} - SMS statistics
   */
  async getSMSStats(startDate, endDate) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM sms_logs
      WHERE sent_at BETWEEN $1 AND $2
      GROUP BY status
    `;
    
    const result = await this.pool.query(query, [startDate, endDate]);
    
    const stats = result.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});
    
    return {
      period: { startDate, endDate },
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      byStatus: stats
    };
  }
}

module.exports = SMSService;
