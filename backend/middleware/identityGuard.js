/**
 * Alternative auth middleware adding is_active + MFA checks — mounted only by routes/departmentFeatures.routes.js.
 * @exports identityGuard middleware
 * @deps helpers/security, services/IdentityService, middleware/auth (shared helpers)
 * @known Tenant check reads req.church_id (tenantResolver) with churchId fallback; MFA gate uses the JWT mfaVerified claim (identity.mfaVerified is always false).
 */
const { verifyAccessToken } = require('../helpers/security');
const IdentityService = require('../services/IdentityService');
const ResponseHandler = require('../utils/ResponseHandler');
const { extractToken, buildUserIdentity } = require('./auth');

/**
 * IdentityGuard Middleware (Phase 5 - REQ-SEC-01)
 * Standardizes req.user and enforces secure session practices
 * Uses IdentityService for centralized identity management
 * Uses shared helpers from auth.js to avoid duplication
 */
const identityGuard = async (req, res, next) => {
  try {
    // 1. Extract token using shared helper
    const token = extractToken(req);

    if (!token) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    // 2. Verify Token
    const decoded = verifyAccessToken(token);

    // 3. Fetch complete identity profile using IdentityService
    const identity = await IdentityService.getIdentity(decoded.userId);

    // 4. Check if user is active
    if (!identity.isActive) {
      return ResponseHandler.unauthorized(res, 'User account is inactive');
    }

    // 5. Enforce MFA for admin roles if enabled
    // MFA verification lives in the JWT claim (set at login/verifyMFA); the
    // identity object's mfaVerified is always false — trusting it locked out
    // every MFA-enabled admin.
    const adminRoles = ['Super Admin', 'Admin', 'Pastor'];
    const hasAdminRole = IdentityService.hasAnyRole(identity, adminRoles);

    if (hasAdminRole && identity.mfaEnabled && decoded.mfaVerified !== true) {
      return ResponseHandler.error(res, 'MFA verification required', 403);
    }

    // 6. Standardize Session Object using shared helper
    req.user = buildUserIdentity(identity);
    req.user.mfaVerified = decoded.mfaVerified === true;

    // 7. Ensure tenant consistency (multi-tenancy support)
    // tenantResolver writes req.church_id; check it (and req.churchId for any
    // other resolver) against the JWT's church.
    const tenantId = req.church_id || req.churchId;
    if (tenantId && tenantId !== req.user.churchId) {
      if (!IdentityService.isSuperAdmin(req.user)) {
        return ResponseHandler.forbidden(res, 'Unauthorized church context');
      }
    }

    next();
  } catch (error) {
    return ResponseHandler.unauthorized(res, 'Invalid or expired session');
  }
};

module.exports = identityGuard;
