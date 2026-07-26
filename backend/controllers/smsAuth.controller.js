const UserRepository = require('../repositories/UserRepository');
const ChurchRepository = require('../repositories/ChurchRepository');
const BaseController = require('./BaseController');
const IdentityService = require('../services/IdentityService');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const { ADMIN_ROLES } = require('../helpers/permissionChecker');
const {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyMFAToken
} = require('../helpers/security');
const crypto = require('crypto');

class SmsAuthController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SmsAuthController');
  }

  async smsLogin(req, res) {
    try {
      const { identifier, password, mfaToken } = req.body;

      // Validate required fields
      if (!identifier || !password) {
        return ResponseHandler.error(res, 'Identifier and password are required', 400);
      }

      // Use findByIdentifier to handle email, username, or phone
      const user = await UserRepository.findByIdentifier(identifier);

      if (!user || !user.is_active) {
        return ResponseHandler.unauthorized(res, 'Invalid credentials');
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000); // minutes
        return ResponseHandler.error(res, `Account locked. Try again in ${remainingTime} minutes.`, 429);
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        if (failedAttempts >= 5) {
          // Lock the account
          const lockoutTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          await UserRepository.update(user.id, {
            failed_login_attempts: failedAttempts,
            locked_until: lockoutTime
          }, user.church_id);
          return ResponseHandler.error(res, 'Too many failed attempts. Account locked for 15 minutes.', 429);
        } else {
          // Update failed attempts
          await UserRepository.update(user.id, {
            failed_login_attempts: failedAttempts
          }, user.church_id);
        }
        return ResponseHandler.unauthorized(res, 'Invalid credentials');
      }

      // Reset failed login attempts on successful login
      await UserRepository.update(user.id, {
        failed_login_attempts: 0,
        locked_until: null
      }, user.church_id);

      // Get user identity to check roles and MFA status
      const identity = await IdentityService.getIdentity(user.id);

      // Check if user has admin role and MFA is enabled
      const hasAdminRole = IdentityService.hasAnyRole(identity, ADMIN_ROLES);

      if (hasAdminRole && identity.mfaEnabled) {
        // MFA token is required for admin users with MFA enabled
        if (!mfaToken) {
          return ResponseHandler.error(res, 'MFA token required', 403);
        }

        // Verify MFA token
        const isMFAValid = await IdentityService.validateMFA(identity, mfaToken);
        if (!isMFAValid) {
          return ResponseHandler.error(res, 'Invalid MFA token', 403);
        }

        // Mark MFA as verified for this session
        identity.mfaVerified = true;
      }

      // Generate SMS-scoped token
      const smsToken = generateAccessToken(user.id, identity.roles, identity.mfaVerified, 'sms');
      const refreshToken = generateRefreshToken(user.id);

      // Get church details
      const church = await ChurchRepository.findById(user.church_id);

      if (!church || !church.is_active) {
        return ResponseHandler.error(res, 'Church is not active', 403);
      }

      // Generate encrypted database connection key
      const databaseConnectionKey = this.generateDatabaseConnectionKey(user.church_id, church.slug);

      // Prepare sync configuration
      const syncConfig = {
        sync_endpoint_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/sms/sync`,
        snapshot_interval: 86400, // 24 hours in seconds
        rolling_update_interval: 300, // 5 minutes in seconds
        max_snapshot_size: 104857600, // 100MB in bytes
        compression_type: 'gzip'
      };

      return ResponseHandler.success(res, {
        accessToken: smsToken,
        refreshToken,
        church: {
          id: church.id,
          slug: church.slug,
          name: church.name,
          api_key: church.api_key,
          is_active: church.is_active,
          database_connection_key: databaseConnectionKey
        },
        sync_config: syncConfig,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          phone: user.phone,
          roles: identity.roles,
          mfaEnabled: identity.mfaEnabled,
          mfaVerified: identity.mfaVerified
        }
      }, 'SMS login successful');
    } catch (error) {
      this.logger.error('smsLogin', error);
      return ResponseHandler.error(res, 'SMS login failed');
    }
  }

  async getOrganization(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId;

      if (!churchId) {
        return ResponseHandler.error(res, 'No church associated with user', 400);
      }

      // Verify token has SMS scope
      if (!req.user.scope || !req.user.scope.includes('sms')) {
        return ResponseHandler.error(res, 'Invalid token scope. SMS scope required.', 403);
      }

      // Get church details
      const church = await ChurchRepository.findById(churchId);

      if (!church) {
        return ResponseHandler.error(res, 'Church not found', 404);
      }

      if (!church.is_active) {
        return ResponseHandler.error(res, 'Church is not active', 403);
      }

      // Prepare SMS-specific configuration
      const smsConfig = {
        sync_enabled: true,
        snapshot_schedule: '0 0 * * *', // Daily at midnight UTC
        rolling_update_interval: 300, // 5 minutes
        max_concurrent_syncs: 5,
        retry_attempts: 3,
        retry_delay: 60000 // 1 minute
      };

      return ResponseHandler.success(res, {
        church: {
          id: church.id,
          slug: church.slug,
          name: church.name,
          api_key: church.api_key,
          is_active: church.is_active
        },
        sms_config: smsConfig
      }, 'Organization configuration retrieved successfully');
    } catch (error) {
      this.logger.error('getOrganization', error);
      return ResponseHandler.error(res, 'Failed to retrieve organization configuration');
    }
  }

  generateDatabaseConnectionKey(churchId, churchSlug) {
    // Generate an encrypted database connection key
    // In production, this should use proper encryption with a key from environment variables
    const keyData = {
      church_id: churchId,
      church_slug: churchSlug,
      timestamp: Date.now(),
      version: '1.0'
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    // In production, use proper encryption like AES-256
    return `enc_${hash.substring(0, 32)}`;
  }
}

module.exports = new SmsAuthController();
