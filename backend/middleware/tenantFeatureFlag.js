/**
 * Per-tenant feature-flag enforcement.
 * Mounted ahead of a module router; requests carrying a church JWT are
 * rejected with 403 MODULE_DISABLED when that church's flag is off.
 * @exports {requireTenantFlag}
 * @deps config/database, helpers/security, config/logging
 * @known Only Bearer-JWT requests are checked — API-key/auth-less routes
 *        (callbacks, public reads) pass through to their own auth. Flag
 *        changes take up to TTL_MS to reach already-connected clients.
 */
const { pool } = require('../config/database');
const { verifyAccessToken } = require('../helpers/security');
const logger = require('../config/logging');

const TTL_MS = 30 * 1000;
const cache = new Map(); // `${userId}:${flag}` -> { enabled, expires }

const resolveEnabled = async (userId, flag) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(
        (SELECT f.enabled FROM tenant_feature_flags f
          WHERE f.church_id = u.church_id AND f.flag = $2),
        true
      ) AS enabled
     FROM users u WHERE u.id = $1`,
    [userId, flag]
  );
  // No user row → let the downstream auth middleware produce the real 401.
  return rows[0]?.enabled !== false;
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
      entry = {
        enabled: await resolveEnabled(decoded.userId, flag),
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

module.exports = { requireTenantFlag };
