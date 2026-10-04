/**
 * @purpose Per-tenant API rate-limit overrides (platform tracker 6.8).
 * @exports tenantRateLimiter
 * @known Keys on req.church_id (tenantResolver, mounted earlier in app.js);
 *        authenticated users without a resolved slug still get the global
 *        apiLimiter ceiling — overrides apply to resolved-tenant traffic.
 *        In-memory sliding window per church; override map cached 60s;
 *        skipped entirely under NODE_ENV=test.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');

const isTest = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true';

// church_id -> { max_requests, window_seconds }
let overrideCache = { at: 0, map: new Map() };
const CACHE_TTL_MS = 60 * 1000;

// church_id -> array of request timestamps (ms), pruned to the window
const buckets = new Map();
const MAX_BUCKETS = 5000; // bound memory on large fleets

const loadOverrides = async () => {
  if (Date.now() - overrideCache.at < CACHE_TTL_MS) return overrideCache.map;
  try {
    const { rows } = await pool.query('SELECT church_id, max_requests, window_seconds FROM tenant_rate_limits');
    overrideCache = {
      at: Date.now(),
      map: new Map(rows.map((r) => [r.church_id, { maxRequests: r.max_requests, windowMs: r.window_seconds * 1000 }])),
    };
  } catch (error) {
    // Fail open: a broken overrides table must never take the API down.
    logger.warn({ err: error.message }, 'tenantRateLimiter: override load failed, passing through');
    overrideCache = { at: Date.now(), map: new Map() };
  }
  return overrideCache.map;
};

/** Drop churches we have not seen for over an hour so the map stays small. */
const sweepBuckets = (now) => {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, hits] of buckets) {
    if (!hits.length || now - hits[hits.length - 1] > 60 * 60 * 1000) buckets.delete(key);
  }
};

const tenantRateLimiter = async (req, res, next) => {
  if (isTest) return next();
  const churchId = req.church_id || req.user?.church_id;
  if (!churchId) return next();

  let override;
  try {
    override = (await loadOverrides()).get(churchId);
  } catch {
    return next(); // fail open on unexpected lookup errors
  }
  if (!override) return next(); // global apiLimiter governs

  const now = Date.now();
  sweepBuckets(now);
  const hits = buckets.get(churchId) || [];
  const floor = now - override.windowMs;
  while (hits.length && hits[0] <= floor) hits.shift();

  if (hits.length >= override.maxRequests) {
    res.set('Retry-After', Math.ceil(override.windowMs / 1000));
    return res.status(429).json({
      success: false,
      error: 'Tenant rate limit exceeded',
      limit: override.maxRequests,
      windowSeconds: override.windowMs / 1000,
    });
  }

  hits.push(now);
  buckets.set(churchId, hits);
  res.set('X-RateLimit-Limit', String(override.maxRequests));
  res.set('X-RateLimit-Remaining', String(Math.max(0, override.maxRequests - hits.length)));
  return next();
};

// Exported for tests.
tenantRateLimiter._clearCache = () => { overrideCache = { at: 0, map: new Map() }; buckets.clear(); };

module.exports = { tenantRateLimiter };
