/**
 * (DORMANT — commented out in app.js) Sets Postgres session vars for row-level security per request.
 * @exports {churchContext, strictChurchContext}
 * @deps config/database, config/logging
 * @known Uses a dedicated checked-out client (req.dbClient) so set_config applies
 *        to the same connection the request must use — pool.query() elsewhere
 *        will NOT see these vars. Enabling requires: mount AFTER authenticateToken
 *        AND route all request queries through req.dbClient. Session vars are
 *        reset before the client returns to the pool (no cross-request leak).
 *        Fails closed: a set_config error 500s instead of proceeding unscoped.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');

const CONTEXT_VARS = ['app.current_church_id', 'app.current_church_slug', 'app.current_user_id'];

/**
 * Church Context Middleware (Phase 6)
 * Checks out one dedicated client for the whole request, sets the RLS session
 * variables on THAT connection, attaches it as req.dbClient, and releases it
 * (with vars reset) when the response finishes.
 */
const churchContext = async (req, res, next) => {
  // Only proceed if we have a church context from tenantResolver
  if (!req.church_id) {
    return next();
  }

  let client;
  try {
    client = await pool.connect();

    // Session-level (is_local=false) so the vars survive for every query run
    // on this connection for the life of the request.
    await client.query(`SELECT set_config('app.current_church_id', $1, false)`, [String(req.church_id)]);
    if (req.church_slug) {
      await client.query(`SELECT set_config('app.current_church_slug', $1, false)`, [String(req.church_slug)]);
    }
    if (req.user && req.user.id) {
      await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [String(req.user.id)]);
    }

    req.dbClient = client;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      // Reset vars before returning the client to the pool so the next
      // request on this connection sees no stale tenant context.
      client.query(`SELECT set_config('app.current_church_id', '', false)`)
        .then(() => client.query(`SELECT set_config('app.current_church_slug', '', false)`))
        .then(() => client.query(`SELECT set_config('app.current_user_id', '', false)`))
        .catch(() => {})
        .finally(() => client.release());
    };
    res.on('finish', release);
    res.on('close', release);

    next();
  } catch (error) {
    if (client) client.release();
    logger.error('Church context error:', error.message);
    // Fail closed — proceeding without tenant context would silently widen scope.
    res.status(500).json({ success: false, error: 'Tenant context unavailable' });
  }
};

/**
 * Strict Church Context Wrapper
 * For routes where tenant isolation is mandatory (protected routes)
 * Returns 400 if church_id is missing instead of silently proceeding
 */
const strictChurchContext = (middleware) => {
  return async (req, res, next) => {
    if (!req.church_id) {
      return res.status(400).json({
        success: false,
        error: 'Church context required for this operation'
      });
    }
    return middleware(req, res, next);
  };
};

module.exports = { churchContext, strictChurchContext };
