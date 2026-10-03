/**
 * Tenant resolver — maps request → church via Host subdomain, x-tenant-slug header, ?tenant query, or DEFAULT_CHURCH_SLUG; 10-min cache.
 * @exports tenantResolver middleware
 * @deps config/database, config/logging
 * @tenant sets req.church_id + req.church_slug (snake_case)
 * @known Subdomain extraction only runs on configured TENANT_BASE_DOMAINS and
 *        skips reserved prefixes (cms/www/api/...) so Host-header spoofing can't
 *        pick a tenant. x-tenant-slug is still client-controlled — it selects
 *        PUBLIC tenant context only; all authenticated ops use req.user.church_id,
 *        and identityGuard 403s when the resolved tenant differs from the user's.
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');

/**
 * Tenant Resolver Middleware (Phase 6 - Enhanced)
 * Extracts the church tenant from subdomain, headers, or query parameters
 * Supports multi-tenancy via subdomain routing (e.g., kiserian-main-sda.msabato.org)
 *
 * SECURITY: In production, query parameter overrides are only allowed for whitelisted admin tools
 * to prevent "tenant-jumping" attacks
 */

// Tenant cache with 10-minute TTL to avoid DB hits on every request
const tenantCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Subdomains that never identify a tenant (platform/app surfaces).
const RESERVED_SUBDOMAINS = new Set(['www', 'cms', 'api', 'app', 'platform', 'admin', 'mail', 'relay']);

// Base domains whose subdomains may resolve to church slugs. Anything else
// (IP, localhost, arbitrary Host header) is ignored for subdomain tenancy.
const BASE_DOMAINS = (process.env.TENANT_BASE_DOMAINS || 'josongeri.co.ke,msabato.co.ke,msabato.org')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);

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

function slugFromHost(host) {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  // Only treat a subdomain as a tenant slug when the host ends with a known
  // base domain — `Host: victim-church.evil.com` must not resolve a tenant.
  const base = BASE_DOMAINS.find(d => hostname === d || hostname.endsWith(`.${d}`));
  if (!base || hostname === base) return null;

  const potentialSlug = hostname.slice(0, hostname.length - base.length - 1);
  // Reject nested subdomains and non-slug/reserved prefixes.
  if (!potentialSlug || potentialSlug.includes('.')) return null;
  if (!SLUG_RE.test(potentialSlug) || RESERVED_SUBDOMAINS.has(potentialSlug)) return null;
  return potentialSlug;
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
  //    a. Subdomain on a known base domain (production tenants)
  //    b. x-tenant-slug header for API/Mobile (public tenant selection only —
  //       authenticated operations always use req.user.church_id instead)
  //    c. ?tenant query (whitelisted paths only in production)
  //    d. DEFAULT_CHURCH_SLUG for single-tenant deployments
  let slug = slugFromHost(req.headers.host);

  if (!slug) {
    const headerSlug = req.headers['x-tenant-slug'];
    if (typeof headerSlug === 'string' && SLUG_RE.test(headerSlug)) {
      slug = headerSlug;
    }
  }

  if (!slug && (!isProduction || isWhitelistedPath)) {
    const q = req.query.tenant;
    if (typeof q === 'string' && SLUG_RE.test(q)) slug = q;
  }

  // Single-tenant deployment shortcut: use the configured default church.
  if (!slug && process.env.DEFAULT_CHURCH_SLUG) {
    slug = process.env.DEFAULT_CHURCH_SLUG;
  }

  if (!slug) {
    // For health checks or public routes that don't need tenancy
    if (req.path.includes('/health') || req.path === '/') return next();

    // No resolvable tenant — proceed without a church context. Authenticated
    // handlers scope by req.user.church_id; tenantless public reads get the
    // global/default behavior.
    return next();
  }

  try {
    // Check cache first — re-checks is_active so suspended churches stop
    // resolving on cache hit too.
    const cached = getCachedTenant(slug);
    if (cached) {
      if (cached.isActive === false) {
        return res.status(403).json({ success: false, error: 'Church account is suspended' });
      }
      req.church_id = cached.id;
      req.church_slug = slug;
      return next();
    }

    // Try direct slug match first
    let result = await pool.query('SELECT id, is_active FROM churches WHERE slug = $1', [slug]);

    // Fallback: try trimming or case-insensitive match
    if (result.rows.length === 0) {
      const fallbackResult = await pool.query(
        'SELECT id, is_active FROM churches WHERE LOWER(TRIM(slug)) = LOWER(TRIM($1))',
        [slug]
      );
      if (fallbackResult.rows.length > 0) {
        result = fallbackResult;
      }
    }

    // Single-tenant last resort: resolve the CONFIGURED default church by its
    // own slug — never an arbitrary "first active church".
    let resolvedSlug = slug;
    if (result.rows.length === 0 && process.env.DEFAULT_CHURCH_SLUG) {
      const defaultResult = await pool.query(
        'SELECT id, is_active FROM churches WHERE slug = $1',
        [process.env.DEFAULT_CHURCH_SLUG]
      );
      if (defaultResult.rows.length > 0) {
        result = defaultResult;
        resolvedSlug = process.env.DEFAULT_CHURCH_SLUG;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Church tenant not found' });
    }

    const church = result.rows[0];

    if (church.is_active === false) {
      // Cache the suspension briefly so hits stay cheap.
      setCachedTenant(slug, { id: church.id, isActive: false });
      return res.status(403).json({ success: false, error: 'Church account is suspended' });
    }

    // Cache the result (is_active cached too — re-checked on hit).
    setCachedTenant(slug, { id: church.id, isActive: true });

    req.church_id = church.id;
    req.church_slug = resolvedSlug;

    next();
  } catch (error) {
    logger.error('Tenant resolution error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = tenantResolver;
