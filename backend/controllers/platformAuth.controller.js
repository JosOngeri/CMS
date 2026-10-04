const BaseController = require('./BaseController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { getPlatformJwtSecret, PLATFORM_JWT_SIGN_OPTIONS } = require('../config/platformJwt');
const { auditPlatformAction, normalizeIp } = require('../services/platformAudit.service');
const { createLogger } = require('../helpers/controllerLogger');
const totp = require('../helpers/totp');

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
        `SELECT id, email, name, role, permissions, password_hash, failed_login_attempts, locked_until,
                mfa_enabled, mfa_required, mfa_secret
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
        // actorId passed explicitly — req.platformUser isn't set yet here
        await auditPlatformAction(req, {
          actorId: platformUser.id,
          action: 'platform_auth.login_failed',
          resourceType: 'platform_user',
          resourceId: platformUser.id
        });
        return this.unauthorized(res, 'Invalid credentials');
      }

      // MFA (3.4): an enrolled user must also present a valid TOTP code.
      // mfa_required-but-not-enrolled users log in normally — the
      // middleware then funnels them to the setup endpoints only.
      if (platformUser.mfa_enabled) {
        const code = typeof req.body.totp === 'string' ? req.body.totp : '';
        if (!code) {
          return res.status(401).json({
            success: false,
            error: 'Authenticator code required',
            code: 'MFA_REQUIRED'
          });
        }
        if (!totp.verify(platformUser.mfa_secret, code)) {
          await auditPlatformAction(req, {
            actorId: platformUser.id,
            action: 'platform_auth.mfa_failed',
            resourceType: 'platform_user',
            resourceId: platformUser.id
          });
          return res.status(401).json({
            success: false,
            error: 'Invalid authenticator code',
            code: 'MFA_INVALID'
          });
        }
      }

      // jti makes the session individually revocable (3.3) — the row in
      // platform_sessions is what authenticatePlatformUser checks per call.
      const jti = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      const token = jwt.sign(
        { userId: platformUser.id, email: platformUser.email, role: platformUser.role, type: 'platform', jti },
        getPlatformJwtSecret(),
        PLATFORM_JWT_SIGN_OPTIONS
      );

      const clientIp = normalizeIp(req.ip);
      await pool.query(
        `INSERT INTO platform_sessions (platform_user_id, token_jti, ip, user_agent, expires_at)
         VALUES ($1, $2, NULLIF($3, '')::inet, $4, $5)`,
        [platformUser.id, jti, clientIp, (req.headers?.['user-agent'] || '').slice(0, 500), expiresAt]
      );

      await pool.query(
        `UPDATE platform_users
         SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [platformUser.id]
      );
      await auditPlatformAction(req, {
        actorId: platformUser.id,
        action: 'platform_auth.login_succeeded',
        resourceType: 'platform_user',
        resourceId: platformUser.id
      });

      res.cookie('platform_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/api/platform'
      });

      this.success(res, {
        // Bearer token for non-cookie clients (mobile admin app). The web
        // console keeps using the httpOnly platform_session cookie.
        token,
        user: {
          id: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          role: platformUser.role,
          permissions: platformUser.permissions,
          mfa_enabled: platformUser.mfa_enabled === true,
          // The console reads this to force the setup screen before
          // anything else — enforced server-side too.
          mfa_setup_required: platformUser.mfa_required === true && platformUser.mfa_enabled !== true
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
        await auditPlatformAction(req, {
          action: 'platform_auth.logout',
          resourceType: 'platform_user',
          resourceId: req.platformUser.id
        });
      }
      res.clearCookie('platform_session', { path: '/api/platform' });
      this.success(res, null, 'Platform logout successful');
    } catch (error) {
      this.logger.error('logout', error);
      this.error(res, new Error('Logout failed')); 
    }
  }

  // ── Sessions (3.3) ──────────────────────────────────────────────────────

  /** GET /auth/sessions — the caller's own active sessions. */
  async listMySessions(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, ip, user_agent, created_at, expires_at,
                (token_jti = $2) AS current
         FROM platform_sessions
         WHERE platform_user_id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC`,
        [req.platformUser.id, req.platformUser.jti || '']
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('listMySessions', error);
      this.error(res, new Error('Failed to list sessions'));
    }
  }

  /** GET /auth/sessions/all — every staff member's sessions (security view). */
  async listAllSessions(req, res) {
    try {
      const result = await pool.query(
        `SELECT s.id, s.platform_user_id, u.email, u.name, s.ip, s.user_agent,
                s.created_at, s.expires_at
         FROM platform_sessions s
         JOIN platform_users u ON u.id = s.platform_user_id
         WHERE s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
         ORDER BY s.created_at DESC
         LIMIT 200`
      );
      this.success(res, result.rows);
    } catch (error) {
      this.logger.error('listAllSessions', error);
      this.error(res, new Error('Failed to list sessions'));
    }
  }

  /** POST /auth/sessions/:id/revoke — kill one session (own, or any with permission). */
  async revokeSession(req, res) {
    const { id } = req.params;
    try {
      const session = await pool.query(
        'SELECT id, platform_user_id FROM platform_sessions WHERE id = $1 AND revoked_at IS NULL',
        [id]
      );
      if (session.rows.length === 0) return this.notFound(res, 'Session not found');

      const ownsIt = session.rows[0].platform_user_id === req.platformUser.id;
      const canManage = req.platformUser.permissions.includes('*') ||
        req.platformUser.permissions.includes('security:manage');
      if (!ownsIt && !canManage) {
        return this.forbidden(res, 'Can only revoke your own sessions');
      }

      await pool.query(
        'UPDATE platform_sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = $3 WHERE id = $1',
        [id, req.platformUser.id, ownsIt ? 'self' : 'admin_revocation']
      );
      await auditPlatformAction(req, {
        action: 'platform_auth.session_revoked',
        resourceType: 'platform_session',
        resourceId: id,
        details: { target_user: session.rows[0].platform_user_id }
      });
      this.success(res, null, 'Session revoked');
    } catch (error) {
      this.logger.error('revokeSession', error);
      this.error(res, new Error('Failed to revoke session'));
    }
  }

  /** POST /auth/users/:userId/revoke-sessions — kill every active session a staff member holds. */
  async revokeUserSessions(req, res) {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        `UPDATE platform_sessions
         SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = 'admin_revoke_all'
         WHERE platform_user_id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        [userId, req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'platform_auth.sessions_revoked_all',
        resourceType: 'platform_user',
        resourceId: userId,
        details: { sessions_revoked: result.rowCount }
      });
      this.success(res, { revoked: result.rowCount }, `Revoked ${result.rowCount} session(s)`);
    } catch (error) {
      this.logger.error('revokeUserSessions', error);
      this.error(res, new Error('Failed to revoke sessions'));
    }
  }

  // ── MFA (3.4) ───────────────────────────────────────────────────────────

  /** POST /auth/mfa/setup — generate a pending secret + otpauth URI. */
  async mfaSetup(req, res) {
    try {
      const secret = totp.generateSecret();
      await pool.query(
        'UPDATE platform_users SET mfa_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [secret, req.platformUser.id]
      );
      this.success(res, {
        secret,
        otpauthUri: totp.otpauthUri({ secret, email: req.platformUser.email })
      }, 'Scan with an authenticator app, then confirm with a code');
    } catch (error) {
      this.logger.error('mfaSetup', error);
      this.error(res, new Error('Failed to start MFA setup'));
    }
  }

  /** POST /auth/mfa/enable {code} — confirm the pending secret. */
  async mfaEnable(req, res) {
    try {
      const result = await pool.query('SELECT mfa_secret FROM platform_users WHERE id = $1', [req.platformUser.id]);
      const secret = result.rows[0]?.mfa_secret;
      if (!secret) return this.badRequest(res, 'Run MFA setup first');
      if (!totp.verify(secret, req.body.code)) {
        return this.badRequest(res, 'Invalid code — check your authenticator app and try again');
      }
      await pool.query(
        'UPDATE platform_users SET mfa_enabled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'platform_auth.mfa_enabled',
        resourceType: 'platform_user',
        resourceId: req.platformUser.id
      });
      this.success(res, { mfa_enabled: true }, 'MFA enabled — future logins will ask for a code');
    } catch (error) {
      this.logger.error('mfaEnable', error);
      this.error(res, new Error('Failed to enable MFA'));
    }
  }

  /** POST /auth/mfa/disable {code} — requires a valid code to turn off. */
  async mfaDisable(req, res) {
    try {
      const result = await pool.query(
        'SELECT mfa_secret, mfa_required FROM platform_users WHERE id = $1',
        [req.platformUser.id]
      );
      const user = result.rows[0];
      if (!totp.verify(user?.mfa_secret, req.body.code)) {
        return this.badRequest(res, 'Invalid code');
      }
      if (user.mfa_required) {
        return this.forbidden(res, 'MFA is required for your account — an owner must lift the requirement first');
      }
      await pool.query(
        'UPDATE platform_users SET mfa_enabled = false, mfa_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [req.platformUser.id]
      );
      await auditPlatformAction(req, {
        action: 'platform_auth.mfa_disabled',
        resourceType: 'platform_user',
        resourceId: req.platformUser.id
      });
      this.success(res, { mfa_enabled: false }, 'MFA disabled');
    } catch (error) {
      this.logger.error('mfaDisable', error);
      this.error(res, new Error('Failed to disable MFA'));
    }
  }
}

module.exports = new PlatformAuthController();