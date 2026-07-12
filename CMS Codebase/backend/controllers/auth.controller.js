const UserRepository = require('../repositories/UserRepository');
const AuthRepository = require('../repositories/AuthRepository');
const ChurchRepository = require('../repositories/ChurchRepository');
const BaseController = require('./BaseController');
const IdentityService = require('../services/IdentityService');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const { ADMIN_ROLES } = require('../helpers/permissionChecker');
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  validatePasswordStrength,
  verifyMFAToken,
  generateRandomToken,
  generateMFASecret,
  generateMFAQRCode
} = require('../helpers/security');

class AuthController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('AuthController');
  }

  async login(req, res) {
    try {
      const { email, password, mfaToken } = req.body;

      // Validate required fields
      if (!email || !password) {
        return ResponseHandler.error(res, 'Email and password are required', 400);
      }

      // Use findByIdentifier to handle email, username, or phone
      const user = await UserRepository.findByIdentifier(email);

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

      const accessToken = generateAccessToken(user.id, identity.roles, identity.mfaVerified);
      const refreshToken = generateRefreshToken(user.id);

      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      return ResponseHandler.success(res, {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          churchId: user.church_id,
          roles: identity.roles,
          mfaEnabled: identity.mfaEnabled,
          mfaVerified: identity.mfaVerified
        },
      }, 'Login successful');
    } catch (error) {
      this.logger.error('login', error);
      return ResponseHandler.error(res, 'Login failed');
    }
  }

  async register(req, res) {
    try {
      const {
        email,
        password,
        first_name,
        last_name,
        username,
        phone,
        church_id,
        church_slug,
        roles = [],
        is_active = true
      } = req.body;

      let churchId = church_id || req.user?.church_id;
      let churchSlug = church_slug || req.user?.church_slug;
      let userActive = is_active;

      // Only admins can create inactive accounts; public registration is always active
      if (!req.user || !IdentityService.hasAnyRole(req.user, ADMIN_ROLES)) {
        userActive = true;
      }

      // Default to the first active church if not provided (public registration)
      if (!churchId && !churchSlug) {
        const defaultChurch = await ChurchRepository.getDefaultChurch();
        if (!defaultChurch) {
          return ResponseHandler.error(res, 'No active church found. Contact an administrator.', 400);
        }
        churchId = defaultChurch.id;
        churchSlug = defaultChurch.slug;
      }

      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        return ResponseHandler.error(res, 'Email already registered', 409);
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return ResponseHandler.error(res, passwordValidation.message, 400);
      }

      const passwordHash = await hashPassword(password);

      // Normalize phone field names (frontend sends phone_number)
      const phoneNumber = phone || req.body.phone_number;

      // Only admins can assign non-Member roles; public registration always becomes Member
      let roleNames = ['Member'];
      if (req.user && IdentityService.hasAnyRole(req.user, ADMIN_ROLES)) {
        roleNames = roles.length > 0 ? roles : ['Member'];
      }

      const newUser = await UserRepository.create({
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        username: username || email,
        phone: phoneNumber,
        phone_number: phoneNumber,
        is_active: userActive,
        email_verified: true,
        church_slug: churchSlug
      }, churchId);

      // Assign roles using repository method
      const assignedRoles = await UserRepository.assignRolesByNames(newUser.id, roleNames, churchId);

      return ResponseHandler.success(res, {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          username: newUser.username,
          phone: newUser.phone,
          isActive: newUser.is_active,
          roles: assignedRoles.map(r => r.name)
        }
      }, 'User created successfully');
    } catch (error) {
      this.logger.error('register', error);
      return ResponseHandler.error(res, error.message || 'Registration failed');
    }
  }

  async verifyMFA(req, res) {
    try {
      const { mfaToken } = req.body;
      const userId = req.user.id;

      // Get user identity
      const identity = await IdentityService.getIdentity(userId);

      if (!identity.mfaEnabled) {
        return ResponseHandler.error(res, 'MFA is not enabled for this account', 400);
      }

      // Verify MFA token
      const isValid = await IdentityService.validateMFA(identity, mfaToken);
      if (!isValid) {
        return ResponseHandler.error(res, 'Invalid MFA token', 403);
      }

      // Generate new access token with MFA verified flag
      const verifiedIdentity = IdentityService.setMFAVerified(identity);
      const newAccessToken = generateAccessToken(userId, identity.roles, true);

      res.cookie('jwt', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      return ResponseHandler.success(res, {
        accessToken: newAccessToken,
        mfaVerified: true
      }, 'MFA verification successful');
    } catch (error) {
      this.logger.error('verifyMFA', error);
      return ResponseHandler.error(res, 'MFA verification failed');
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      // Check if refresh token exists and is valid
      const tokenData = await AuthRepository.getRefreshToken(refreshToken);

      if (!tokenData) {
        return res.status(401).json({ success: false, error: 'Invalid refresh token' });
      }

      const { user_id } = tokenData;

      // Get user roles
      const roles = await AuthRepository.getUserRoles(user_id);

      // Generate new tokens
      const newAccessToken = generateAccessToken(user_id, roles);
      const newRefreshToken = generateRefreshToken(user_id);

      // Mark old token as used
      await AuthRepository.markRefreshTokenAsUsed(refreshToken);

      // Store new refresh token
      await AuthRepository.createRefreshToken(user_id, newRefreshToken);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      this.logger.error('refreshToken', error);
      res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      // Clear JWT Cookie
      res.clearCookie('jwt');

      // Mark refresh token as used (if column exists)
      try {
        await AuthRepository.markRefreshTokenAsUsed(refreshToken);
      } catch (updateError) {
        // If 'used' column doesn't exist, just delete the token instead
        if (updateError.message.includes('column "used" does not exist')) {
          await AuthRepository.deleteRefreshToken(refreshToken);
        } else {
          throw updateError;
        }
      }

      res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      this.logger.error('logout', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const profile = await UserRepository.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      this.logger.error('getProfile', error);
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phone } = req.body;

      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (phone !== undefined) updates.phone = phone;

      const result = await UserRepository.updateProfile(userId, updates);

      if (!result) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Log profile update
      await AuthRepository.logLoginAttempt(result.email, req.ip, true);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error('updateProfile', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user
      const user = await UserRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await UserRepository.updatePassword(userId, newPasswordHash);

      // Log password change
      await AuthRepository.logLoginAttempt(user.email, req.ip, true);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      this.logger.error('changePassword', error);
      res.status(500).json({ success: false, error: 'Failed to change password' });
    }
  }

  async verifyPassword(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid password' });
      }

      res.json({ success: true, message: 'Password verified' });
    } catch (error) {
      this.logger.error('verifyPassword', error);
      res.status(500).json({ success: false, error: 'Failed to verify password' });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await UserRepository.findByEmail(email);

      if (!user || !user.is_active) {
        // Don't reveal if email exists for security
        return res.json({
          success: true,
          message: 'If the email exists, a reset link has been sent',
        });
      }

      // Generate reset token
      const resetToken = generateRandomToken();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      await AuthRepository.createPasswordResetToken(user.id, resetToken);

      // Log password reset request
      await AuthRepository.logLoginAttempt(email, req.ip, true);

      // TODO: Send email with reset link
      // For now, return the token (in production, send via email)
      res.json({
        success: true,
        message: 'Password reset link sent to email',
        // In production, remove this token from response
        data: { resetToken },
      });
    } catch (error) {
      this.logger.error('forgotPassword', error);
      res.status(500).json({ success: false, error: 'Failed to process password reset' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Check if token is valid
      const tokenData = await AuthRepository.getPasswordResetToken(token);

      if (!tokenData) {
        return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      }

      const { user_id } = tokenData;

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await UserRepository.updatePassword(user_id, newPasswordHash);

      // Mark token as used
      await AuthRepository.markPasswordResetTokenAsUsed(token);

      // Invalidate all refresh tokens for this user
      await AuthRepository.invalidateUserRefreshTokens(user_id);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      this.logger.error('resetPassword', error);
      res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      // Check if token is valid (using password_reset_tokens table for simplicity)
      const tokenData = await AuthRepository.getPasswordResetToken(token);

      if (!tokenData) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
      }

      const { user_id } = tokenData;

      // Mark email as verified
      await AuthRepository.verifyEmail(user_id);

      // Mark token as used
      await AuthRepository.markPasswordResetTokenAsUsed(token);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      this.logger.error('verifyEmail', error);
      res.status(500).json({ success: false, error: 'Failed to verify email' });
    }
  }

  async getSessions(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await AuthRepository.getUserSessions(userId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      this.logger.error('getSessions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
    }
  }

  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      await AuthRepository.revokeSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      this.logger.error('revokeSession', error);
      res.status(500).json({ success: false, error: 'Failed to revoke session' });
    }
  }

  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;

      await AuthRepository.invalidateUserRefreshTokens(userId);

      res.json({
        success: true,
        message: 'All sessions revoked successfully',
      });
    } catch (error) {
      this.logger.error('revokeAllSessions', error);
      res.status(500).json({ success: false, error: 'Failed to revoke all sessions' });
    }
  }

  async enableMFA(req, res) {
    try {
      const userId = req.user.id;

      // Get user email
      const email = await AuthRepository.getUserEmail(userId);

      if (!email) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Generate MFA secret
      const secret = generateMFASecret(email);

      // Store secret temporarily (not enabled yet)
      await AuthRepository.updateMFASecret(userId, secret.base32);

      // Log MFA setup initiation
      await AuthRepository.logAuthAudit(userId, 'MFA_SETUP_INITIATED', JSON.stringify({ email }), req.ip, req.headers['user-agent']);

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: generateMFAQRCode(secret),
        },
      });
    } catch (error) {
      this.logger.error('enableMFA', error);
      res.status(500).json({ success: false, error: 'Failed to enable MFA' });
    }
  }

  async verifyMFASetup(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      // Get user's MFA secret
      const mfaSecret = await AuthRepository.getMFASecret(userId);

      if (!mfaSecret) {
        return res.status(400).json({ success: false, error: 'MFA not set up' });
      }

      // Verify token
      const isValid = verifyMFAToken(mfaSecret, token);

      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid MFA token' });
      }

      // Enable MFA
      await AuthRepository.enableMFA(userId);

      // Log MFA enablement
      await AuthRepository.logAuthAudit(userId, 'MFA_ENABLED', JSON.stringify({}), req.ip, req.headers['user-agent']);

      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      this.logger.error('verifyMFASetup', error);
      res.status(500).json({ success: false, error: 'Failed to verify MFA setup' });
    }
  }

  async disableMFA(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Verify password
      const user = await UserRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid password' });
      }

      // Disable MFA
      await AuthRepository.disableMFA(userId);

      // Log MFA disablement
      await AuthRepository.logAuthAudit(userId, 'MFA_DISABLED', JSON.stringify({}), req.ip, req.headers['user-agent']);

      res.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      this.logger.error('disableMFA', error);
      res.status(500).json({ success: false, error: 'Failed to disable MFA' });
    }
  }

  async getAuditLog(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const auditLog = await AuthRepository.getAuthAuditLog(userId, limit, offset);

      res.json({
        success: true,
        data: auditLog,
      });
    } catch (error) {
      this.logger.error('getAuditLog', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
    }
  }
}

module.exports = new AuthController();
