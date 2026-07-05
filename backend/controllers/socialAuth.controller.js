const { generateAccessToken, generateRefreshToken, hashPassword, generateRandomToken } = require('../helpers/security');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const socialAuthRepository = require('../repositories/SocialAuthRepository');

/**
 * Social Auth Controller
 * Handles social authentication callbacks (Google, Facebook) and account linking
 */
class SocialAuthController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SocialAuthController');
  }

  /**
   * Handle Google OAuth callback
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from passport
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async googleCallback(req, res) {
    try {
      const { id, email, given_name, family_name, picture } = req.user;

      // Check if user exists by Google ID
      let user = await socialAuthRepository.getUserByGoogleId(id);

      if (!user) {
        // Check if user exists by email (account linking)
        user = await socialAuthRepository.getUserByEmail(email);

        if (user) {
          // Link Google account to existing user
          await socialAuthRepository.linkGoogleAccount(user.id, id, picture);
        } else {
          // Create new user
          const randomPassword = generateRandomToken();
          const passwordHash = await hashPassword(randomPassword);

          user = await socialAuthRepository.createUser({
            email,
            passwordHash,
            firstName: given_name,
            lastName: family_name,
            googleId: id,
            facebookId: null,
            picture,
            emailVerified: true
          });

          // Assign default role
          const role = await socialAuthRepository.getRoleByName('Member');
          if (role) {
            await socialAuthRepository.assignUserRole(user.id, role.id);
          }

          // Log registration
          await socialAuthRepository.logAuthAudit(user.id, 'USER_REGISTERED_SOCIAL', { provider: 'google', email });
        }
      }

      // Get user roles
      const roles = await socialAuthRepository.getUserRoles(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user.id, roles);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token
      await socialAuthRepository.insertRefreshToken(user.id, refreshToken);

      // Log successful login
      await socialAuthRepository.logAuthAudit(user.id, 'LOGIN_SUCCESS_SOCIAL', { provider: 'google' });

      // Redirect to frontend with tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      this.logger.error('googleCallback', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=auth_failed`);
    }
  }

  /**
   * Handle Facebook OAuth callback
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from passport
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async facebookCallback(req, res) {
    try {
      const { id, email, first_name, last_name, picture } = req.user;
      const avatarUrl = picture?.data?.url;

      // Check if user exists by Facebook ID
      let user = await socialAuthRepository.getUserByFacebookId(id);

      if (!user) {
        // Check if user exists by email (account linking)
        user = await socialAuthRepository.getUserByEmail(email);

        if (user) {
          // Link Facebook account to existing user
          await socialAuthRepository.linkFacebookAccount(user.id, id, avatarUrl);
        } else {
          // Create new user
          const randomPassword = generateRandomToken();
          const passwordHash = await hashPassword(randomPassword);

          user = await socialAuthRepository.createUser({
            email,
            passwordHash,
            firstName: first_name,
            lastName: last_name,
            googleId: null,
            facebookId: id,
            picture: avatarUrl,
            emailVerified: true
          });

          // Assign default role
          const role = await socialAuthRepository.getRoleByName('Member');
          if (role) {
            await socialAuthRepository.assignUserRole(user.id, role.id);
          }

          // Log registration
          await socialAuthRepository.logAuthAudit(user.id, 'USER_REGISTERED_SOCIAL', { provider: 'facebook', email });
        }
      }

      // Get user roles
      const roles = await socialAuthRepository.getUserRoles(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user.id, roles);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token
      await socialAuthRepository.insertRefreshToken(user.id, refreshToken);

      // Log successful login
      await socialAuthRepository.logAuthAudit(user.id, 'LOGIN_SUCCESS_SOCIAL', { provider: 'facebook' });

      // Redirect to frontend with tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      this.logger.error('facebookCallback', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=auth_failed`);
    }
  }

  /**
   * Link a social account to existing user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.body - Request body
   * @param {string} req.body.provider - Social provider (google/facebook)
   * @param {string} req.body.socialId - Social ID
   * @param {string} req.body.email - Email
   * @param {string} req.body.firstName - First name
   * @param {string} req.body.lastName - Last name
   * @param {string} req.body.picture - Profile picture URL
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async linkSocialAccount(req, res) {
    try {
      const userId = req.user.id;
      const { provider, socialId, email, firstName, lastName, picture } = req.body;

      if (provider === 'google') {
        await socialAuthRepository.linkGoogleAccount(userId, socialId, picture);
      } else if (provider === 'facebook') {
        await socialAuthRepository.linkFacebookAccount(userId, socialId, picture);
      }

      // Log account linking
      await socialAuthRepository.logAuthAudit(userId, 'SOCIAL_ACCOUNT_LINKED', { provider });

      res.json({
        success: true,
        message: 'Social account linked successfully',
      });
    } catch (error) {
      this.logger.error('linkSocialAccount', error);
      res.status(500).json({ success: false, error: 'Failed to link social account' });
    }
  }

  /**
   * Unlink a social account from user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.provider - Social provider to unlink
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async unlinkSocialAccount(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.params;

      if (provider === 'google') {
        await socialAuthRepository.unlinkGoogleAccount(userId);
      } else if (provider === 'facebook') {
        await socialAuthRepository.unlinkFacebookAccount(userId);
      }

      // Log account unlinking
      await socialAuthRepository.logAuthAudit(userId, 'SOCIAL_ACCOUNT_UNLINKED', { provider });

      res.json({
        success: true,
        message: 'Social account unlinked successfully',
      });
    } catch (error) {
      this.logger.error('unlinkSocialAccount', error);
      res.status(500).json({ success: false, error: 'Failed to unlink social account' });
    }
  }
}

module.exports = new SocialAuthController();