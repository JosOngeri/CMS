/**
 * Platform impersonation service (F4).
 *
 * Lets a platform owner act inside a church tenant AS one of its users,
 * for support/debugging. Safety model:
 *   - Only `tenant:impersonate` permission can start a session
 *     (owner-only today — see constants/platformPermissions.js).
 *   - Sessions are short-lived (default 30 min) and recorded in
 *     platform_impersonations with the reason the operator gave.
 *   - The minted token is a normal church access token (same secret,
 *     same iss/aud) PLUS an `impersonation` claim — middleware/auth.js
 *     surfaces it as req.impersonation and blocks writes when the
 *     session is mode=readonly.
 *   - The token rides in the same HttpOnly `jwt` cookie the church app
 *     uses, so the SPA works without any client-side plumbing; the
 *     banner reads `user.impersonation` from the profile payload.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { logPlatformAudit } = require('./platformAudit.service');

const TOKEN_ISSUER = 'msabato';
const TOKEN_AUDIENCE = 'church';
const DEFAULT_TTL_MINUTES = 30;
const MAX_TTL_MINUTES = 60;

/**
 * Mint an impersonation token for a tenant user.
 * @param {object} opts
 * @param {number} opts.platformUserId  - platform staff starting the session
 * @param {string} opts.churchId        - tenant
 * @param {string} opts.tenantUserId    - church user to become
 * @param {string[]} opts.roles         - target user's roles (for the claim)
 * @param {'readonly'|'full'} opts.mode
 * @param {string} opts.reason          - required; stored in the audit trail
 * @param {number} [opts.ttlMinutes]
 */
const startImpersonation = async ({ platformUserId, churchId, tenantUserId, roles = [], mode = 'readonly', reason, ttlMinutes = DEFAULT_TTL_MINUTES }) => {
  const ttl = Math.min(Math.max(ttlMinutes || DEFAULT_TTL_MINUTES, 1), MAX_TTL_MINUTES);
  const tokenId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO platform_impersonations
       (platform_user_id, church_id, tenant_user_id, mode, reason, token_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [platformUserId, churchId, tenantUserId, mode, reason || null, tokenId, expiresAt]
  );
  const sessionId = result.rows[0].id;

  const token = jwt.sign(
    {
      userId: tenantUserId,
      roles,
      mfaVerified: true, // platform actor already authenticated; MFA applies to the real user, not the operator
      type: 'access',
      impersonation: { sessionId, platformUserId, mode }
    },
    process.env.JWT_SECRET,
    { expiresIn: `${ttl}m`, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  );

  return { sessionId, token, expiresAt, mode };
};

const endImpersonation = async ({ sessionId, endedBy, reason = 'ended' }) => {
  await pool.query(
    `UPDATE platform_impersonations
     SET ended_at = CURRENT_TIMESTAMP, end_reason = $1
     WHERE id = $2 AND ended_at IS NULL`,
    [reason, sessionId]
  );
  await logPlatformAudit({
    actorId: endedBy,
    action: 'tenant.impersonation_ended',
    resourceType: 'impersonation',
    resourceId: sessionId,
    details: { reason }
  });
};

const listImpersonations = async ({ churchId = null, activeOnly = false, limit = 50 } = {}) => {
  const clauses = [];
  const params = [];
  if (churchId) {
    params.push(churchId);
    clauses.push(`i.church_id = $${params.length}`);
  }
  if (activeOnly) {
    clauses.push('i.ended_at IS NULL AND i.expires_at > CURRENT_TIMESTAMP');
  }
  params.push(limit);
  const result = await pool.query(
    `SELECT i.*, c.name AS church_name, pu.email AS operator_email,
            u.email AS tenant_user_email
     FROM platform_impersonations i
     JOIN churches c ON c.id = i.church_id
     JOIN platform_users pu ON pu.id = i.platform_user_id
     LEFT JOIN users u ON u.id = i.tenant_user_id
     ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
     ORDER BY i.started_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
};

module.exports = { startImpersonation, endImpersonation, listImpersonations };
