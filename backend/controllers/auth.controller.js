const UserRepository = require('../repositories/UserRepository');
const AuthRepository = require('../repositories/AuthRepository');
const ChurchRepository = require('../repositories/ChurchRepository');
const SecurityRepository = require('../repositories/SecurityRepository');
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
  verifyRefreshToken,
  validatePasswordStrength,
  verifyMFAToken,
  generateRandomToken,
  generateMFASecret,
  generateMFAQRCode
} = require('../helpers/security');
const { pool } = require('../config/database');
const { logAction } = require('../helpers/auditLog');
const churchSettings = require('../helpers/churchSettings');
const emailService = require('../utils/emailService');

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
        // Lockout policy comes from the church's security_settings row
        // (L627 — previously hardcoded 5 attempts / 15 min regardless of settings).
        const secSettings = await SecurityRepository.getSecuritySettings(user.church_id).catch(() => ({}));
        const maxAttempts = Number.isFinite(parseInt(secSettings.maxLoginAttempts ?? secSettings.max_login_attempts))
          ? parseInt(secSettings.maxLoginAttempts ?? secSettings.max_login_attempts) : 5;
        const lockoutMinutes = Number.isFinite(parseInt(secSettings.lockoutDuration ?? secSettings.lockout_duration))
          ? parseInt(secSettings.lockoutDuration ?? secSettings.lockout_duration) : 15;
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        if (failedAttempts >= maxAttempts) {
          // Lock the account
          const lockoutTime = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          await UserRepository.update(user.id, {
            failed_login_attempts: failedAttempts,
            locked_until: lockoutTime
          }, user.church_id);
          return ResponseHandler.error(res, `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.`, 429);
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
        locked_until: null,
        last_login: new Date()
      }, user.church_id);

      // Get user identity to check roles and MFA status
      const identity = await IdentityService.getIdentity(user.id);

      // Church-configured policies (settings table — platform manageable)
      const [sessionMinutes, require2fa, features, passwordMinLength] = await Promise.all([
        churchSettings.getInt(user.church_id, 'session_timeout', 60),
        churchSettings.getBool(user.church_id, 'require_2fa', false),
        churchSettings.getFeatures(user.church_id),
        churchSettings.getInt(user.church_id, 'password_min_length', 8),
      ]);

      // Check if user has admin role and MFA is enabled
      const hasAdminRole = IdentityService.hasAnyRole(identity, ADMIN_ROLES);

      // security/require_2fa: when the church mandates 2FA for admins and
      // this admin hasn't enrolled yet, tell the SPA to force the MFA
      // setup flow before granting dashboard access.
      const mfaSetupRequired = require2fa && hasAdminRole && !identity.mfaEnabled;

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

      const accessToken = generateAccessToken(user.id, identity.roles, identity.mfaVerified, null, sessionMinutes);
      // MFA state rides in the signed refresh token so /refresh can reissue
      // it without trusting client input.
      const refreshToken = generateRefreshToken(user.id, { mfaVerified: identity.mfaVerified });

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
          phone: user.phone,
          avatarUrl: user.avatar_url || null,
          churchId: user.church_id,
          churchSlug: identity.churchSlug,
          roles: identity.roles,
          // Permission strings — without them the SPA renders with
          // permissions:[] and every permission-gated nav item hides until a
          // manual refresh re-fetches /auth/profile.
          permissions: identity.permissions,
          mfaEnabled: identity.mfaEnabled,
          mfaVerified: identity.mfaVerified,
          mfaSetupRequired,
          // Resolved features/enable_* map — Sidebar hides disabled modules
          features,
          passwordPolicy: { minLength: passwordMinLength }
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

      // Church resolution order matters for tenant isolation:
      // - Public (unauthenticated) registration always lands in the church the
      //   tenantResolver resolved for this request (subdomain/default) — the
      //   body's church_id/church_slug is ignored so a registrant cannot
      //   self-select into another tenant.
      // - Admins may target a specific church via the body; it falls back to
      //   their own church, then the resolved tenant.
      let churchId;
      let churchSlug;
      const isAdmin = req.user && IdentityService.hasAnyRole(req.user, ADMIN_ROLES);
      if (isAdmin) {
        churchId = church_id || req.user.church_id || req.church_id;
        churchSlug = church_slug || req.user.church_slug || req.church_slug;
      } else {
        churchId = req.church_id;
        churchSlug = req.church_slug;
      }
      let userActive = is_active;

      // Only admins can create inactive accounts; public registration is always active
      if (!isAdmin) {
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

      // Validate username uniqueness globally (across all churches)
      if (username) {
        const existingUsername = await UserRepository.findByUsernameGlobal(username);
        if (existingUsername) {
          return ResponseHandler.error(res, 'Username already taken. Please choose a different username.', 409);
        }
      }

      // Validate password strength — min length from the church's
      // security/password_min_length setting (platform manageable)
      const minLen = await churchSettings.getInt(churchId, 'password_min_length', 8);
      const passwordValidation = validatePasswordStrength(password, minLen);
      if (!passwordValidation.isValid) {
        return ResponseHandler.error(res, passwordValidation.message, 400);
      }

      const passwordHash = await hashPassword(password);

      // Normalize phone field names (frontend sends phone_number)
      const phoneNumber = phone || req.body.phone_number;

      // Only admins can assign non-Member roles; public registration always
      // becomes Member. Super Admin may only be granted by an existing one —
      // a First Elder admin-registering a user cannot mint a second top admin.
      let roleNames = ['Member'];
      if (req.user && IdentityService.hasAnyRole(req.user, ADMIN_ROLES)) {
        roleNames = roles.length > 0 ? roles : ['Member'];
        if (!IdentityService.hasAnyRole(req.user, ['Super Admin'])) {
          roleNames = roleNames.filter(r => r !== 'Super Admin');
        }
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
      const mfaSessionMin = await churchSettings.getInt(identity.churchId || identity.church_id, 'session_timeout', 60);
      const newAccessToken = generateAccessToken(userId, identity.roles, true, null, mfaSessionMin);

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

      // MFA verification state is carried in the signed refresh-token claim —
      // never accept it from request input.
      let mfaVerified = false;
      try {
        mfaVerified = verifyRefreshToken(refreshToken)?.mfaVerified === true;
      } catch {
        // Malformed JWT — the DB record above already proved validity, so a
        // decode failure just means an old-format token; treat as unverified.
      }

      // Get user roles
      const roles = await AuthRepository.getUserRoles(user_id);

      // Generate new tokens — MFA claim propagates to the new access token
      // and the rotated refresh token. Session length honors the church's
      // security/session_timeout setting.
      const refreshChurchId = tokenData.church_id
        || (await pool.query('SELECT church_id FROM users WHERE id = $1', [user_id])).rows[0]?.church_id;
      const refreshSessionMin = await churchSettings.getInt(refreshChurchId, 'session_timeout', 60);
      const newAccessToken = generateAccessToken(user_id, roles, mfaVerified, null, refreshSessionMin);
      const newRefreshToken = generateRefreshToken(user_id, { mfaVerified });

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

      // Resolved church feature flags — the SPA hides disabled modules
      // (features/enable_* in the settings catalog, platform manageable).
      const features = await churchSettings.getFeatures(req.user.church_id);

      res.json({
        success: true,
        // impersonation is set by auth middleware when the session is a
        // platform support session — the SPA shows the banner off this flag
        data: { ...profile, features, impersonation: req.impersonation || null },
      });
    } catch (error) {
      this.logger.error('getProfile', error);
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      // Accept both camelCase (web) and snake_case (mobile) field names
      const firstName = req.body.firstName ?? req.body.first_name;
      const lastName = req.body.lastName ?? req.body.last_name;
      const phone = req.body.phone ?? req.body.phone_number;

      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (phone !== undefined) updates.phone = phone;
      // Extended profile fields the web form collects (migration 065)
      for (const key of ['bio', 'address', 'city', 'country', 'date_of_birth']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No profile fields provided to update' });
      }

      const result = await UserRepository.updateProfile(userId, updates);

      if (!result) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Semantic audit entry — a profile update is not a login attempt
      await logAction(pool, {
        actorId: userId,
        churchId: req.user?.church_id || null,
        action: 'auth.profile_updated',
        tableName: 'users',
        recordId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

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

  async uploadProfilePhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No photo uploaded' });
      }

      const userId = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const result = await UserRepository.updateProfile(userId, { avatar_url: avatarUrl });

      if (!result) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: { avatarUrl },
      });
    } catch (error) {
      this.logger.error('uploadProfilePhoto', error);
      res.status(500).json({ success: false, error: 'Failed to upload profile photo' });
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

      // PUT /auth/password mounts no route-level validation — enforce the
      // strength policy here so this path can't accept weak passwords.
      const strengthCheck = validatePasswordStrength(
        newPassword,
        await churchSettings.getInt(user.church_id, 'password_min_length', 8)
      );
      if (!strengthCheck.isValid) {
        return res.status(400).json({ success: false, error: strengthCheck.message });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await UserRepository.updatePassword(userId, newPasswordHash);

      // Semantic audit entry — a password change is not a login attempt
      await logAction(pool, {
        actorId: userId,
        churchId: req.user?.church_id || null,
        action: 'auth.password_changed',
        tableName: 'users',
        recordId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

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
        return ResponseHandler.success(res, null, 'If the email exists, a reset link has been sent');
      }

      // Generate reset token
      const resetToken = generateRandomToken();

      // Store reset token (hashed at rest inside the repository)
      await AuthRepository.createPasswordResetToken(user.id, resetToken);

      // Semantic audit entry — not a login attempt
      await logAction(pool, {
        actorId: user.id,
        churchId: user.church_id || null,
        action: 'auth.password_reset_requested',
        tableName: 'users',
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Deliver the reset link by email — failures are logged, never exposed
      // to the caller (account-enumeration safe either way).
      emailService
        .sendPasswordReset(email, resetToken, user.first_name)
        .catch(err => this.logger.error('forgotPassword email', err));

      return ResponseHandler.success(res, null, 'If the email exists, a reset link has been sent');
    } catch (error) {
      this.logger.error('forgotPassword', error);
      return ResponseHandler.error(res, 'Failed to process password reset', 500);
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Same policy as registration/change — a reset link must not allow a
      // weaker password than the normal flows enforce.
      if (!newPassword) {
        return res.status(400).json({ success: false, error: 'New password is required' });
      }
      // Check if token is valid
      const tokenData = await AuthRepository.getPasswordResetToken(token);

      if (!tokenData) {
        return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      }

      // Reset token carries the user — resolve their church's policy.
      const resetChurchId = tokenData.church_id
        || (await pool.query('SELECT church_id FROM users WHERE id = $1', [tokenData.user_id])).rows[0]?.church_id;
      const strength = validatePasswordStrength(
        newPassword,
        await churchSettings.getInt(resetChurchId, 'password_min_length', 8)
      );
      if (!strength.isValid) {
        return res.status(400).json({ success: false, error: strength.message });
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
      if (!token) {
        return res.status(400).json({ success: false, error: 'Verification token is required' });
      }

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

  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.params;
      
      if (!username || username.length < 3) {
        return res.json({
          success: false,
          available: false,
          message: 'Username must be at least 3 characters'
        });
      }
      // Check username availability globally (across all churches)
      const isAvailable = await UserRepository.isUsernameAvailable(username);
      res.json({
        success: true,
        available: isAvailable,
        message: isAvailable ? 'Username is available' : 'Username is already taken'
      });
    } catch (error) {
      this.logger.error('checkUsernameAvailability', error);
      res.status(500).json({ success: false, error: 'Failed to check username availability' });
    }
  }

  async enableMFA(req, res) {
    try {
      const userId = req.user.id;
      
      // Generate MFA secret
      const secret = generateMFASecret(req.user.email);
      const qrCode = await generateMFAQRCode(secret);
      
      // Store MFA secret (not yet verified)
      await AuthRepository.updateMFASecret(userId, secret.base32);
      
      res.json({
        success: true,
        data: { secret: secret.base32, qrCode }
      });
    } catch (error) {
      this.logger.error('enableMFA', error);
      res.status(500).json({ success: false, error: 'Failed to enable MFA' });
    }
  }

  async verifyMFASetup(req, res) {
    try {
      const { token } = req.body;
      const userId = req.user.id;
      
      // Get stored MFA secret
      const mfaData = await AuthRepository.getMFASecret(userId);
      
      if (!mfaData) {
        return res.status(400).json({ success: false, error: 'MFA not enabled' });
      }
      
      // Verify token
      const isValid = verifyMFAToken(mfaData, token);
      
      if (isValid) {
        // Mark MFA as verified
        await AuthRepository.enableMFA(userId);
        res.json({ success: true, message: 'MFA verified successfully' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid MFA token' });
      }
    } catch (error) {
      this.logger.error('verifyMFASetup', error);
      res.status(500).json({ success: false, error: 'Failed to verify MFA setup' });
    }
  }

  async disableMFA(req, res) {
    try {
      const userId = req.user.id;
      
      // Remove MFA secret
      await AuthRepository.disableMFA(userId);
      
      res.json({ success: true, message: 'MFA disabled successfully' });
    } catch (error) {
      this.logger.error('disableMFA', error);
      res.status(500).json({ success: false, error: 'Failed to disable MFA' });
    }
  }

  async getAuditLog(req, res) {
    try {
      const userId = req.user.id;
      
      // Get audit log for user
      const auditLog = await AuthRepository.getAuthAuditLog(userId, 50, 0);
      
      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      this.logger.error('getAuditLog', error);
      res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
    }
  }
}

module.exports = new AuthController();
