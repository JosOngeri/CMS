/**
 * Audit Service
 * Handles audit logging for all critical operations across the system
 */
const { pool } = require('../config/database');

class AuditService {
  /**
   * Log an audit event
   * @param {string} churchId - Church UUID
   * @param {string} userId - User UUID who performed the action
   * @param {string} action - Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
   * @param {string} tableName - Name of the table affected
   * @param {string} recordId - UUID of the record affected
   * @param {Object} oldValue - Previous value (for updates/deletes)
   * @param {Object} newValue - New value (for creates/updates)
   * @param {string} ipAddress - IP address of the requester
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} Result of the insert operation
   */
  async log(churchId, userId, action, tableName, recordId, oldValue = null, newValue = null, ipAddress = null, userAgent = null) {
    try {
      const query = `
        INSERT INTO audit_log (
          church_id,
          user_id,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          ip_address,
          user_agent,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;

      const values = [
        churchId,
        userId,
        action,
        tableName,
        recordId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent
      ];

      const result = await pool.query(query, values);
      return { success: true, auditId: result.rows[0].id };
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw error - audit logging should not break the main operation
      return { success: false, error: error.message };
    }
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Filter criteria
   * @param {string} filters.churchId - Filter by church
   * @param {string} filters.userId - Filter by user
   * @param {string} filters.tableName - Filter by table name
   * @param {string} filters.recordId - Filter by record ID
   * @param {string} filters.action - Filter by action type
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Number of records to skip
   * @returns {Promise<Object>} Audit logs and metadata
   */
  async query(filters = {}, limit = 100, offset = 0) {
    try {
      const conditions = [];
      const values = [];
      let paramCount = 1;

      if (filters.churchId) {
        conditions.push(`church_id = $${paramCount++}`);
        values.push(filters.churchId);
      }

      if (filters.userId) {
        conditions.push(`user_id = $${paramCount++}`);
        values.push(filters.userId);
      }

      if (filters.tableName) {
        conditions.push(`table_name = $${paramCount++}`);
        values.push(filters.tableName);
      }

      if (filters.recordId) {
        conditions.push(`record_id = $${paramCount++}`);
        values.push(filters.recordId);
      }

      if (filters.action) {
        conditions.push(`action = $${paramCount++}`);
        values.push(filters.action);
      }

      if (filters.startDate) {
        conditions.push(`created_at >= $${paramCount++}`);
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`created_at <= $${paramCount++}`);
        values.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*) as total
        FROM audit_log
        ${whereClause}
      `;

      const dataQuery = `
        SELECT *
        FROM audit_log
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;

      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, values.slice(0, paramCount - 2)),
        pool.query(dataQuery, values)
      ]);

      return {
        success: true,
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      console.error('Audit query error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AuditService();
