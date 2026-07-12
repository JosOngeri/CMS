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
    const adminRoles = ['Super Admin', 'Admin', 'Pastor'];
    const hasAdminRole = IdentityService.hasAnyRole(identity, adminRoles);

    if (hasAdminRole && identity.mfaEnabled && !identity.mfaVerified) {
      return ResponseHandler.error(res, 'MFA verification required', 403);
    }

    // 6. Standardize Session Object using shared helper
    req.user = buildUserIdentity(identity);

    // 7. Ensure tenant consistency (multi-tenancy support)
    if (req.churchId && req.churchId !== req.user.churchId) {
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
