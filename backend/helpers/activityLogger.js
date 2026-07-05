const { pool } = require('../config/database');
const { getActivityWebSocket } = require('./websocket');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('activityLogger');

class ActivityLogger {
  async logActivity(activity) {
    try {
      const { type, userId, entityType, entityId, metadata, departmentId } = activity;
      
      const result = await pool.query(
        `INSERT INTO activity_log (type, user_id, entity_type, entity_id, metadata, department_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [type, userId, entityType, entityId, JSON.stringify(metadata), departmentId]
      );
      
      // Broadcast activity via WebSocket
      const ws = getActivityWebSocket();
      if (ws) {
        ws.broadcastActivity({
          type: 'new_activity',
          data: result.rows[0],
          timestamp: new Date().toISOString()
        });
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('logActivity', 'Error logging activity:', error);
      throw error;
    }
  }

  async logApprovalRequest(approvalId, userId, action, comment) {
    return this.logActivity({
      type: 'approval_' + action,
      userId,
      entityType: 'approval',
      entityId: approvalId,
      metadata: { action, comment }
    });
  }

  async logComment(commentId, userId, entityType, entityId) {
    return this.logActivity({
      type: 'comment_added',
      userId,
      entityType,
      entityId,
      metadata: { commentId }
    });
  }

  async logPayment(paymentId, userId, amount) {
    return this.logActivity({
      type: 'payment_received',
      userId,
      entityType: 'payment',
      entityId: paymentId,
      metadata: { amount }
    });
  }

  async logMemberJoin(userId, departmentId) {
    return this.logActivity({
      type: 'member_joined',
      userId,
      entityType: 'member',
      entityId: userId,
      departmentId,
      metadata: {}
    });
  }
}

module.exports = new ActivityLogger();
