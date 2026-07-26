const BaseController = require('./BaseController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { getPlatformJwtSecret } = require('../config/platformJwt');
const { logPlatformAudit } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/**
 * Platform Auth Controller
 * Handles authentication for platform admin users
 */
class PlatformAuthController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PlatformAuthController');
  }

  /**
   * Platform user login
   */
  async login(req, res) {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!email || typeof password !== 'string' || password.length === 0) {
      return this.unauthorized(res, 'Invalid credentials');
    }

    try {
      const userResult = await pool.query(
        `SELECT id, email, name, role, permissions, password_hash, failed_login_attempts, locked_until
         FROM platform_users
         WHERE email = $1 AND is_active = true`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return this.unauthorized(res, 'Invalid credentials');
      }

      const platformUser = userResult.rows[0];
      if (!platformUser.password_hash) {
        this.logger.error('login', new Error(`Platform user ${platformUser.id} has no password hash`));
        return this.error(res, new Error('Platform account is not configured')); 
      }

      if (platformUser.locked_until && new Date(platformUser.locked_until) > new Date()) {
        return this.error(res, new Error('Account temporarily locked. Please try again later.'), 429);
      }

      const passwordMatches = await bcrypt.compare(password, platformUser.password_hash);
      if (!passwordMatches) {
        const failedAttempts = (platformUser.failed_login_attempts || 0) + 1;
        const shouldLock = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
        await pool.query(
          `UPDATE platform_users
           SET failed_login_attempts = $1,
               locked_until = CASE WHEN $2 THEN CURRENT_TIMESTAMP + INTERVAL '${LOCKOUT_MINUTES} minutes' ELSE NULL END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [shouldLock ? 0 : failedAttempts, shouldLock, platformUser.id]
        );
        await logPlatformAudit({
          actorId: platformUser.id,
          action: 'platform_auth.login_failed',
          resourceType: 'platform_user',
          resourceId: platformUser.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        return this.unauthorized(res, 'Invalid credentials');
      }

      const token = jwt.sign(
        { userId: platformUser.id, email: platformUser.email, role: platformUser.role, type: 'platform' },
        getPlatformJwtSecret(),
        { expiresIn: '8h' }
      );

      await pool.query(
        `UPDATE platform_users
         SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [platformUser.id]
      );
      await logPlatformAudit({
        actorId: platformUser.id,
        action: 'platform_auth.login_succeeded',
        resourceType: 'platform_user',
        resourceId: platformUser.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.cookie('platform_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/api/platform'
      });

      this.success(res, {
        user: {
          id: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          role: platformUser.role,
          permissions: platformUser.permissions
        }
      }, 'Platform login successful');
    } catch (error) {
      this.logger.error('login', error);
      this.error(res, new Error('Login failed')); 
    }
  }

  /**
   * Get current platform user
   */
  async getCurrentUser(req, res) {
    try {
      if (!req.platformUser) {
        return this.unauthorized(res, 'Not authenticated');
      }

      this.success(res, req.platformUser);
    } catch (error) {
      this.logger.error('getCurrentUser', error);
      this.error(res, new Error('Failed to get current user')); 
    }
  }

  async logout(req, res) {
    try {
      if (req.platformUser) {
        await logPlatformAudit({
          actorId: req.platformUser.id,
          action: 'platform_auth.logout',
          resourceType: 'platform_user',
          resourceId: req.platformUser.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      res.clearCookie('platform_session', { path: '/api/platform' });
      this.success(res, null, 'Platform logout successful');
    } catch (error) {
      this.logger.error('logout', error);
      this.error(res, new Error('Logout failed')); 
    }
  }
}

module.exports = new PlatformAuthController();