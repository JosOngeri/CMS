const { pool } = require('../config/database');

/**
 * Tenant Resolver Middleware (Phase 6 - Enhanced)
 * Extracts the church tenant from subdomain, headers, or query parameters
 * Supports multi-tenancy via subdomain routing (e.g., kiserian-main-sda.kmaincms.org)
 *
 * SECURITY: In production, query parameter overrides are only allowed for whitelisted admin tools
 * to prevent "tenant-jumping" attacks
 */

// Tenant cache with 10-minute TTL to avoid DB hits on every request
const tenantCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedTenant(slug) {
  const cached = tenantCache.get(slug);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    tenantCache.delete(slug);
    return null;
  }
  return cached.data;
}

function setCachedTenant(slug, data) {
  tenantCache.set(slug, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  });
}

const tenantResolver = async (req, res, next) => {
  // Whitelisted admin tools that can use query parameter overrides
  const QUERY_OVERRIDE_WHITELIST = [
    '/api/admin/tenants',
    '/api/admin/debug'
  ];

  const isProduction = process.env.NODE_ENV === 'production';
  const isWhitelistedPath = QUERY_OVERRIDE_WHITELIST.some(path => req.path.startsWith(path));

  // 1. Resolve Slug from various sources in priority order:
  //    a. Subdomain (highest priority for production)
  //    b. Headers for API/Mobile
  //    c. Query parameters (only for whitelisted paths in production)
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
      if (potentialSlug.match(/^[a-z0-9]+(-[a-z0-9]+)*$/) && potentialSlug !== 'www') {
        slug = potentialSlug;
      }
    }
  }

  // Fallback to header for API/Mobile clients
  if (!slug) {
    slug = req.headers['x-tenant-slug'];
  }

  // Fallback to query parameter (only allowed for whitelisted paths in production)
  if (!slug && (!isProduction || isWhitelistedPath)) {
    slug = req.query.tenant;
  }

  // Fallback to URL parameter
  if (!slug) {
    slug = req.params.tenant_slug;
  }

  // Single-tenant deployment shortcut: use default church if configured
  if (!slug && process.env.DEFAULT_CHURCH_SLUG) {
    slug = process.env.DEFAULT_CHURCH_SLUG;
  }

  if (!slug) {
    // For health checks or public routes that don't need tenancy
    if (req.path.includes('/health') || req.path === '/') return next();

    // Fallback: If no slug, we can't isolate. Some public routes might allow this.
    return next();
  }

  try {
    // Check cache first
    const cached = getCachedTenant(slug);
    if (cached) {
      req.church_id = cached.id;
      req.church_slug = slug;
      return next();
    }

    const result = await pool.query('SELECT id, is_active FROM churches WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Church tenant not found' });
    }

    if (result.rows[0].is_active === false) {
      return res.status(403).json({ success: false, error: 'Church account is suspended' });
    }

    const churchId = result.rows[0].id;

    // Cache the result
    setCachedTenant(slug, { id: churchId });

    req.church_id = churchId;
    req.church_slug = slug;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = tenantResolver;
