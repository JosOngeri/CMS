/**
 * maintenanceMode — reads platform_settings.maintenance_mode (cached 30s)
 * and 503s TENANT-facing API calls while the flag is on (13.6).
 *
 * Exempt paths (platform operations must keep working during a window):
 *   /api/platform/**  — the console itself
 *   /api/health       — deploy verification + uptime probes
 *   /api/csrf-token   — token fetch so the platform SPA still boots
 *
 * Enable/disable from the platform console Configuration page. The
 * response carries `maintenance: true` + the operator's message so the
 * church SPA can render a proper notice rather than a generic error.
 */
const { pool } = require('../config/database');

const CACHE_TTL_MS = 30 * 1000;
let cache = { at: 0, state: null };

const loadState = async () => {
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS && cache.state !== null) return cache.state;
  try {
    const r = await pool.query(
      'SELECT value FROM platform_settings WHERE key = $1',
      ['maintenance_mode']
    );
    cache = { at: now, state: r.rows[0]?.value || { enabled: false } };
  } catch {
    // Missing table/settings on an old DB — fail open, never block traffic.
    cache = { at: now, state: { enabled: false } };
  }
  return cache.state;
};

const EXEMPT_PREFIXES = ['/api/platform', '/api/health', '/api/csrf-token'];

const maintenanceMode = async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next(); // mocked pools in api tests
  const state = await loadState();
  if (!state?.enabled) return next();
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  return res.status(503).json({
    success: false,
    maintenance: true,
    error: state.message || 'Scheduled maintenance in progress',
    ends_at: state.ends_at || null,
  });
};

// Test hook + immediate refresh after an operator toggles the flag.
maintenanceMode._resetCache = () => { cache = { at: 0, state: null }; };

module.exports = maintenanceMode;
