const { pool } = require('../config/database');

/**
 * Tenant Resolver Middleware (Phase 6 - Enhanced)
 * Extracts the church tenant from subdomain, headers, or query parameters
 * Supports multi-tenancy via subdomain routing (e.g., kiserian-main-sda.kmaincms.org)
 */
const tenantResolver = async (req, res, next) => {
  // 1. Resolve Slug from various sources in priority order:
  //    a. Subdomain (highest priority for production)
  //    b. Headers for API/Mobile
  //    c. Query parameters for deep links
  //    d. URL parameters
  let slug = null;

  // Extract from subdomain (e.g., kiserian-main-sda.kmaincms.org)
  const host = req.headers.host;
  if (host) {
    const hostname = host.split(':')[0]; // Remove port if present
    const parts = hostname.split('.');
    
    // Check if we have a subdomain structure (at least 3 parts: subdomain.domain.tld)
    if (parts.length >= 3) {
      const potentialSlug = parts[0];
      // Validate slug format (lowercase letters, numbers, hyphens)
      if (potentialSlug.match(/^[a-z0-9-]+$/) && potentialSlug !== 'www') {
        slug = potentialSlug;
      }
    }
  }

  // Fallback to header for API/Mobile clients
  if (!slug) {
    slug = req.headers['x-tenant-slug'];
  }

  // Fallback to query parameter for deep links
  if (!slug) {
    slug = req.query.tenant;
  }

  // Fallback to URL parameter
  if (!slug) {
    slug = req.params.tenant_slug;
  }

  if (!slug) {
    // For health checks or public routes that don't need tenancy
    if (req.path.includes('/health') || req.path === '/') return next();

    // In dev, we might default to a specific church if none provided
    if (process.env.NODE_ENV === 'development' && process.env.DEFAULT_CHURCH_SLUG) {
      const devResult = await pool.query('SELECT id FROM churches WHERE slug = $1', [process.env.DEFAULT_CHURCH_SLUG]);
      if (devResult.rows.length > 0) {
        req.church_id = devResult.rows[0].id;
        req.church_slug = process.env.DEFAULT_CHURCH_SLUG;
        await pool.query(`SET LOCAL app.current_church_id = '${req.church_id}'`);
        return next();
      }
    }

    // Fallback: If no slug, we can't isolate. Some public routes might allow this.
    return next();
  }

  try {
    const result = await pool.query('SELECT id FROM churches WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Church tenant not found' });
    }

    const churchId = result.rows[0].id;
    req.church_id = churchId;
    req.church_slug = slug;

    // Set the session variable for Postgres RLS
    await pool.query(`SET LOCAL app.current_church_id = '${churchId}'`);

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = tenantResolver;
