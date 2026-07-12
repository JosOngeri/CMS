/**
 * Notification Helper
 * Sends in-app notifications to users
 */
const { createLogger } = require('./controllerLogger');

const logger = createLogger('notify');

/**
 * Send a notification to a user
 * @param {Object} pool - Database connection pool
 * @param {Object} params - Notification parameters
 * @param {UUID} params.recipientId - ID of the user to notify
 * @param {string} params.type - Notification type (approval_request, membership_approved, etc.)
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body/message
 * @param {string} [params.link] - URL to navigate to when clicked
 * @param {string} [params.relatedEntityType] - Type of related entity (department, user, approval_request)
 * @param {UUID} [params.relatedEntityId] - ID of related entity
 */
async function sendNotification(pool, {
  recipientId,
  type,
  title,
  body,
  link = null,
  relatedEntityType = null,
  relatedEntityId = null
}) {
  try {
    const query = `
      INSERT INTO notifications (
        recipient_id,
        type,
        title,
        body,
        link,
        related_entity_type,
        related_entity_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const result = await pool.query(query, [
      recipientId,
      type,
      title,
      body,
      link,
      relatedEntityType,
      relatedEntityId
    ]);

    logger.info('sendNotification', `[Notification] Sent to user ${recipientId}: ${title}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('sendNotification', '[Notification] Failed to send notification:', error);
    // Don't throw - notification failures shouldn't break the main operation
    return null;
  }
}

/**
 * Send notification to multiple recipients
 * @param {Object} pool - Database connection pool
 * @param {UUID[]} recipientIds - Array of user IDs to notify
 * @param {Object} notification - Notification object (same params as sendNotification)
 */
async function sendBulkNotification(pool, recipientIds, notification) {
  const promises = recipientIds.map(recipientId =>
    sendNotification(pool, { ...notification, recipientId })
  );
  await Promise.all(promises);
}

/**
 * Send notification to department head and admins
 * @param {Object} pool - Database connection pool
 * @param {UUID} departmentId - Department ID
 * @param {Object} notification - Notification object (same params as sendNotification)
 */
async function notifyDepartmentAdmins(pool, departmentId, notification) {
  try {
    // Get department head
    const deptQuery = 'SELECT head_id FROM departments WHERE id = $1';
    const deptResult = await pool.query(deptQuery, [departmentId]);

    // Get department admins
    const adminsQuery = `
      SELECT DISTINCT user_id
      FROM department_members
      WHERE department_id = $1 AND role = 'Admin' AND is_active = true
    `;
    const adminsResult = await pool.query(adminsQuery, [departmentId]);

    const recipientIds = new Set();
    if (deptResult.rows.length > 0 && deptResult.rows[0].head_id) {
      recipientIds.add(deptResult.rows[0].head_id);
    }
    adminsResult.rows.forEach(row => recipientIds.add(row.user_id));

    if (recipientIds.size > 0) {
      await sendBulkNotification(pool, Array.from(recipientIds), notification);
    }
  } catch (error) {
    logger.error('notifyDepartmentAdmins', '[Notification] Failed to notify department admins:', error);
  }
}

module.exports = {
  sendNotification,
  sendBulkNotification,
  notifyDepartmentAdmins
};
