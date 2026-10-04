const { pool } = require('../config/database');
const logger = require('../config/logging');

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

/**
 * One-call-site audit pattern for platform routes:
 *
 *   await auditPlatformAction(req, {
 *     action: 'tenant.suspended',
 *     tenantId: id,                 // → details.tenant_id + resourceType 'tenant'
 *     details: { reason }
 *   });
 *
 * Actor, IP, and user-agent come from the request so controllers can't
 * forget them. `actorId` may be overridden for unauthenticated flows
 * (e.g. login attempts where req.platformUser isn't populated yet).
 * Never throws — audit failure is logged, not fatal to the request.
 */
const auditPlatformAction = async (req, { actorId = null, action, resourceType = null, resourceId = null, tenantId = null, details = {} }) => {
  const hasTenant = tenantId !== null && tenantId !== undefined;
  const payload = hasTenant ? { ...details, tenant_id: tenantId } : details;
  try {
    await logPlatformAudit({
      actorId: actorId ?? req.platformUser?.id ?? null,
      action,
      resourceType: resourceType ?? (hasTenant ? 'tenant' : null),
      resourceId: resourceId ?? (hasTenant ? String(tenantId) : null),
      details: payload,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    // Audit must never break the action it records — but it must be loud.
    logger.error('platform audit write failed', { action, error: error.message });
  }
};

module.exports = { logPlatformAudit, auditPlatformAction, normalizeIp };
