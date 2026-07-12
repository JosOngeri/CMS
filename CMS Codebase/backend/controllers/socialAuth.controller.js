const { generateAccessToken, generateRefreshToken } = require('../helpers/security');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const socialAuthRepository = require('../repositories/SocialAuthRepository');
const SocialAuthService = require('../services/SocialAuthService');

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

      const user = await SocialAuthService.processSocialAuth(req.user, 'google', socialAuthRepository);

      const roles = await socialAuthRepository.getUserRoles(user.id);
      const accessToken = generateAccessToken(user.id, roles);
      const refreshToken = generateRefreshToken(user.id);

      await socialAuthRepository.insertRefreshToken(user.id, refreshToken);
      await SocialAuthService.logAuthAudit(user.id, 'LOGIN_SUCCESS_SOCIAL', { provider: 'google' }, socialAuthRepository);

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

      const user = await SocialAuthService.processSocialAuth(req.user, 'facebook', socialAuthRepository);

      const roles = await socialAuthRepository.getUserRoles(user.id);
      const accessToken = generateAccessToken(user.id, roles);
      const refreshToken = generateRefreshToken(user.id);

      await socialAuthRepository.insertRefreshToken(user.id, refreshToken);
      await SocialAuthService.logAuthAudit(user.id, 'LOGIN_SUCCESS_SOCIAL', { provider: 'facebook' }, socialAuthRepository);

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