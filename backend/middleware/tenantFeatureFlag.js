/**
 * Per-tenant feature-flag enforcement.
 * Mounted ahead of a module router; requests carrying a church JWT are
 * rejected with 403 MODULE_DISABLED when that church's flag is off.
 * @exports {requireTenantFlag, invalidateChurchFlags}
 * @deps config/database, helpers/security, config/logging
 * @known Only Bearer-JWT requests are checked — API-key/auth-less routes
 *        (callbacks, public reads) pass through to their own auth. Flag
 *        writes call invalidateChurchFlags() for instant cutover; TTL_MS is
 *        the fallback for out-of-band edits or multi-instance deploys.
 */
const { pool } = require('../config/database');
const { verifyAccessToken } = require('../helpers/security');
const logger = require('../config/logging');

const TTL_MS = 30 * 1000;
const cache = new Map(); // `${userId}:${flag}` -> { churchId, enabled, expires }

const resolveEnabled = async (userId, flag) => {
  const { rows } = await pool.query(
    `SELECT u.church_id,
            COALESCE(
        (SELECT f.enabled FROM tenant_feature_flags f
          WHERE f.church_id = u.church_id AND f.flag = $2),
        true
      ) AS enabled
     FROM users u WHERE u.id = $1`,
    [userId, flag]
  );
  // No user row → let the downstream auth middleware produce the real 401.
  return { churchId: rows[0]?.church_id ?? null, enabled: rows[0]?.enabled !== false };
};

// Drop every cached verdict for a church — called after a flag write so the
// toggle takes effect on the next request rather than after TTL_MS.
const invalidateChurchFlags = (churchId) => {
  if (!churchId) return;
  const id = String(churchId);
  for (const [key, entry] of cache) {
    if (entry.churchId === id) cache.delete(key);
  }
};

const requireTenantFlag = (flag) => async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();

  let decoded;
  try {
    decoded = verifyAccessToken(auth.slice(7));
  } catch {
    return next(); // malformed/expired token — auth middleware will 401 it
  }
  if (!decoded?.userId) return next();

  try {
    const key = `${decoded.userId}:${flag}`;
    let entry = cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      const resolved = await resolveEnabled(decoded.userId, flag);
      entry = {
        churchId: resolved.churchId ? String(resolved.churchId) : null,
        enabled: resolved.enabled,
        expires: Date.now() + TTL_MS
      };
      cache.set(key, entry);
    }
    if (!entry.enabled) {
      return res.status(403).json({
        success: false,
        error: `The '${flag.replace(/_/g, ' ')}' module is disabled for your church`,
        code: 'MODULE_DISABLED'
      });
    }
    return next();
  } catch (error) {
    // Flag lookup failing must never take a module down.
    logger.error('tenantFeatureFlag', error);
    return next();
  }
};

module.exports = { requireTenantFlag, invalidateChurchFlags };
