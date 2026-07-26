const { pool } = require('../config/database');

const logPlatformAudit = async ({ actorId, action, resourceType, resourceId = null, details = {}, ipAddress = null, userAgent = null }) => {
  await pool.query(
    `INSERT INTO platform_audit_logs
      (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]
  );
};

module.exports = { logPlatformAudit };
