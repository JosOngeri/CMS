const { verifyAccessToken } = require('../helpers/security');
const IdentityService = require('../services/IdentityService');
const ResponseHandler = require('../utils/ResponseHandler');

/**
 * IdentityGuard Middleware (Phase 5 - REQ-SEC-01)
 * Standardizes req.user and enforces secure session practices
 * Uses IdentityService for centralized identity management
 */
const identityGuard = async (req, res, next) => {
  try {
    // 1. Extract token from HttpOnly Cookie (preferred) or Authorization Header
    const token = req.cookies?.jwt || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

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

    // 6. Standardize Session Object per upgrade plan spec
    req.user = {
      id: identity.id,
      email: identity.email,
      username: identity.username,
      firstName: identity.firstName,
      first_name: identity.firstName,
      lastName: identity.lastName,
      last_name: identity.lastName,
      phoneNumber: identity.phoneNumber,
      phone_number: identity.phoneNumber,
      churchId: identity.churchId,
      church_id: identity.churchId,
      churchSlug: identity.churchSlug,
      churchName: identity.churchName,
      roles: identity.roles,
      permissions: identity.permissions,
      mfaVerified: identity.mfaVerified
    };

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
