/**
 * Social Auth Service
 * Handles social authentication logic including account linking and user creation
 */
class SocialAuthService {
  /**
   * Process social authentication callback
   * @param {Object} socialUser - Social user data from provider
   * @param {string} provider - Provider name (google/facebook)
   * @param {Object} socialAuthRepository - Social auth repository
   * @returns {Object} User data
   */
  async processSocialAuth(socialUser, provider, socialAuthRepository) {
    const { id, email, picture } = socialUser;
    const avatarUrl = picture?.data?.url || picture;

    let user = await this.getOrCreateUser(socialUser, provider, socialAuthRepository, avatarUrl);

    await this.assignDefaultRole(user, socialAuthRepository);
    await this.logAuthAudit(user.id, 'USER_REGISTERED_SOCIAL', { provider, email }, socialAuthRepository);

    return user;
  }

  /**
   * Get existing user or create new one
   * @param {Object} socialUser - Social user data
   * @param {string} provider - Provider name
   * @param {Object} socialAuthRepository - Social auth repository
   * @param {string} avatarUrl - Avatar URL
   * @returns {Object} User data
   */
  async getOrCreateUser(socialUser, provider, socialAuthRepository, avatarUrl) {
    let user;

    if (provider === 'google') {
      user = await socialAuthRepository.getUserByGoogleId(socialUser.id);
    } else if (provider === 'facebook') {
      user = await socialAuthRepository.getUserByFacebookId(socialUser.id);
    }

    if (!user) {
      user = await socialAuthRepository.getUserByEmail(socialUser.email);

      if (user) {
        await this.linkSocialAccount(user.id, socialUser.id, provider, avatarUrl, socialAuthRepository);
      } else {
        user = await this.createNewUser(socialUser, provider, avatarUrl, socialAuthRepository);
      }
    }

    return user;
  }

  /**
   * Create new user from social auth
   * @param {Object} socialUser - Social user data
   * @param {string} provider - Provider name
   * @param {string} avatarUrl - Avatar URL
   * @param {Object} socialAuthRepository - Social auth repository
   * @returns {Object} Created user
   */
  async createNewUser(socialUser, provider, avatarUrl, socialAuthRepository) {
    const { generateRandomToken, hashPassword } = require('../helpers/security');
    const randomPassword = generateRandomToken();
    const passwordHash = await hashPassword(randomPassword);

    const userData = {
      email: socialUser.email,
      passwordHash,
      firstName: provider === 'google' ? socialUser.given_name : socialUser.first_name,
      lastName: provider === 'google' ? socialUser.family_name : socialUser.last_name,
      googleId: provider === 'google' ? socialUser.id : null,
      facebookId: provider === 'facebook' ? socialUser.id : null,
      picture: avatarUrl,
      emailVerified: true
    };

    return await socialAuthRepository.createUser(userData);
  }

  /**
   * Link social account to existing user
   * @param {number} userId - User ID
   * @param {string} socialId - Social ID
   * @param {string} provider - Provider name
   * @param {string} avatarUrl - Avatar URL
   * @param {Object} socialAuthRepository - Social auth repository
   */
  async linkSocialAccount(userId, socialId, provider, avatarUrl, socialAuthRepository) {
    if (provider === 'google') {
      await socialAuthRepository.linkGoogleAccount(userId, socialId, avatarUrl);
    } else if (provider === 'facebook') {
      await socialAuthRepository.linkFacebookAccount(userId, socialId, avatarUrl);
    }
  }

  /**
   * Assign default role to user
   * @param {Object} user - User object
   * @param {Object} socialAuthRepository - Social auth repository
   */
  async assignDefaultRole(user, socialAuthRepository) {
    const role = await socialAuthRepository.getRoleByName('Member');
    if (role) {
      await socialAuthRepository.assignUserRole(user.id, role.id);
    }
  }

  /**
   * Log auth audit event
   * @param {number} userId - User ID
   * @param {string} event - Event type
   * @param {Object} metadata - Event metadata
   * @param {Object} socialAuthRepository - Social auth repository
   */
  async logAuthAudit(userId, event, metadata, socialAuthRepository) {
    await socialAuthRepository.logAuthAudit(userId, event, metadata);
  }
}

module.exports = new SocialAuthService();
