/**
 * Audit Log Helper
 * Records critical actions to the audit_log table for compliance and tracking
 */
const { createLogger } = require('./controllerLogger');

const logger = createLogger('auditLog');

/**
 * Log an action to the audit_log table
 * @param {Object} pool - Database connection pool
 * @param {Object} params - Audit log parameters
 * @param {UUID} params.actorId - ID of the user performing the action
 * @param {string} params.action - Action performed (e.g., 'grant_admin', 'approve_membership')
 * @param {string} params.tableName - Table affected (e.g., 'department_members', 'departments')
 * @param {UUID} params.recordId - ID of the record affected
 * @param {UUID} [params.departmentId] - Department ID (if applicable)
 * @param {Object} [params.before] - Before state (JSON)
 * @param {Object} [params.after] - After state (JSON)
 * @param {string} [params.ipAddress] - IP address of the actor
 * @param {string} [params.userAgent] - User agent string
 */
async function logAction(pool, {
  actorId,
  action,
  tableName,
  recordId,
  departmentId = null,
  before = null,
  after = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    const newValues = { ...after };
    if (departmentId) {
      newValues.department_id = departmentId;
    }

    const query = `
      INSERT INTO audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const result = await pool.query(query, [
      actorId,
      action,
      tableName,
      recordId,
      before ? JSON.stringify(before) : null,
      JSON.stringify(newValues),
      ipAddress,
      userAgent
    ]);

    logger.info('logAction', `[Audit Log] Action logged: ${action} by user ${actorId} on ${tableName}:${recordId}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('logAction', '[Audit Log] Failed to log action:', error);
    // Don't throw - audit log failures shouldn't break the main operation
    return null;
  }
}

module.exports = { logAction };
