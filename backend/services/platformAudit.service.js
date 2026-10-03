const { pool } = require('../config/database');

// req.ip can arrive as "1.2.3.4:5678" behind a reverse proxy or as an
// IPv6-mapped "::ffff:1.2.3.4" — neither is valid for the inet column.
// Normalize to a bare address; anything unparseable stores NULL.
function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return null;
  let v = ip.trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  const v4port = v.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4port) v = v4port[1];
  const v6port = v.match(/^\[([0-9a-fA-F:]+)\]:\d+$/);
  if (v6port) v = v6port[1];
  return v || null;
}

const logPlatformAudit = async ({ actorId, action, resourceType, resourceId = null, details = {}, ipAddress = null, userAgent = null }) => {
  await pool.query(
    `INSERT INTO platform_audit_logs
      (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, action, resourceType, resourceId, JSON.stringify(details), normalizeIp(ipAddress), userAgent]
  );
};

module.exports = { logPlatformAudit };
