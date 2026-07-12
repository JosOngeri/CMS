const { pool } = require('../config/database');

/**
 * Church Context Middleware (Phase 6)
 * Binds the database session with the current church context for RLS policies
 * Works in conjunction with tenantResolver to set PostgreSQL session variables
 */
const churchContext = async (req, res, next) => {
  try {
    // Only proceed if we have a church context from tenantResolver
    if (!req.church_id) {
      // For public routes or health checks that don't require tenancy
      return next();
    }

    // Set PostgreSQL session variable for RLS policies
    // This enables row-level security to filter by church_id automatically
    await pool.query(`SET LOCAL app.current_church_id = '${req.church_id}'`);

    // Also set church_slug for zero-join queries
    if (req.church_slug) {
      await pool.query(`SET LOCAL app.current_church_slug = '${req.church_slug}'`);
    }

    // Set user context if available (for audit logging)
    if (req.user && req.user.id) {
      await pool.query(`SET LOCAL app.current_user_id = '${req.user.id}'`);
    }

    next();
  } catch (error) {
    console.error('Church context error:', error);
    // Don't block the request if context setting fails
    // Log the error but continue
    next();
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
