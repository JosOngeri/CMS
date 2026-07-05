const { pool } = require('../config/database');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('IdentityService');

/**
 * IdentityService (Phase 5)
 * Centralizes user identity operations and standardizes req.user shape
 */
class IdentityService {
  /**
   * Get complete user identity profile
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Standardized user identity object
   */
  async getIdentity(userId) {
    try {
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.username, u.first_name, u.last_name, 
                u.phone, u.is_active, u.church_id,
                c.slug as church_slug, c.name as church_name,
                u.mfa_enabled, u.mfa_secret
         FROM users u
         LEFT JOIN churches c ON u.church_id = c.id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get user roles
      const rolesResult = await pool.query(
        `SELECT r.name FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      // Get user permissions
      const permissionsResult = await pool.query(
        `SELECT DISTINCT p.name 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      // Standardize session object per upgrade plan spec
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone,
        isActive: user.is_active,
        churchId: user.church_id,
        churchSlug: user.church_slug,
        churchName: user.church_name,
        roles: rolesResult.rows.map(r => r.name),
        permissions: permissionsResult.rows.map(p => p.name),
        mfaEnabled: user.mfa_enabled || false,
        mfaVerified: false, // Will be set during authentication flow
        mfaSecret: user.mfa_secret
      };
    } catch (error) {
      logger.error('getIdentity error:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific role
   * @param {Object} identity - User identity object
   * @param {string} role - Role to check
   * @returns {boolean}
   */
  hasRole(identity, role) {
    return identity.roles && identity.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   * @param {Object} identity - User identity object
   * @param {string[]} roles - Roles to check
   * @returns {boolean}
   */
  hasAnyRole(identity, roles) {
    return roles.some(role => this.hasRole(identity, role));
  }

  /**
   * Check if user has specific permission
   * @param {Object} identity - User identity object
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  hasPermission(identity, permission) {
    return identity.permissions && identity.permissions.includes(permission);
  }

  /**
   * Check if user is super admin
   * @param {Object} identity - User identity object
   * @returns {boolean}
   */
  isSuperAdmin(identity) {
    return this.hasRole(identity, 'Super Admin');
  }

  /**
   * Check if user can access specific church (multi-tenancy)
   * @param {Object} identity - User identity object
   * @param {string} churchId - Church ID to access
   * @returns {boolean}
   */
  canAccessChurch(identity, churchId) {
    // Super admins can access any church
    if (this.isSuperAdmin(identity)) {
      return true;
    }
    // Regular users can only access their own church
    return identity.churchId === churchId;
  }

  /**
   * Validate MFA if enabled for user
   * @param {Object} identity - User identity object
   * @param {string} token - MFA token provided by user
   * @returns {Promise<boolean>}
   */
  async validateMFA(identity, token) {
    if (!identity.mfaEnabled) {
      return true; // MFA not required
    }

    // TODO: Implement actual TOTP validation using speakeasy or similar
    // For now, this is a placeholder
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: identity.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
  }

  /**
   * Set MFA as verified for current session
   * @param {Object} identity - User identity object
   * @returns {Object} Updated identity
   */
  setMFAVerified(identity) {
    return {
      ...identity,
      mfaVerified: true
    };
  }

  /**
   * Get user's department-specific permissions
   * @param {string} userId - User UUID
   * @param {string} departmentId - Department UUID
   * @returns {Promise<Object>} Department permissions object
   */
  async getDepartmentPermissions(userId, departmentId) {
    try {
      const result = await pool.query(
        `SELECT dp.permissions 
         FROM department_permissions dp
         JOIN user_roles ur ON dp.role_id = ur.role_id
         WHERE dp.department_id = $1 AND ur.user_id = $2`,
        [departmentId, userId]
      );

      if (result.rows.length === 0) {
        return {};
      }

      return result.rows[0].permissions || {};
    } catch (error) {
      logger.error('getDepartmentPermissions error:', error);
      throw error;
    }
  }
}

module.exports = new IdentityService();
