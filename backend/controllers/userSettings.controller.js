const UserSettingsRepository = require('../repositories/UserSettingsRepository');
const AuthRepository = require('../repositories/AuthRepository');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../helpers/security');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * User Settings Controller
 * Handles user preferences, password changes, and activity history
 */
class UserSettingsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('UserSettingsController');
  }

  /**
   * Get user preferences
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserPreferences(req, res) {
  try {
    const userId = req.user.id;

    const preferences = await UserSettingsRepository.getUserPreferences(userId);

    if (!preferences) {
      // Create default preferences if they don't exist
      const newPreferences = await UserSettingsRepository.createUserPreferences(userId);
      return this.success(res, { preferences: newPreferences });
    }

    this.success(res, { preferences });
  } catch (error) {
    this.logger.error('getUserPreferences', error);
    this.error(res, 'Failed to fetch user preferences');
  }
  }

  /**
   * Update user preferences
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.body - Request body with preference fields
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateUserPreferences(req, res) {
  try {
    const userId = req.user.id;

    // Single upsert — field allowlist + column/placeholder construction live
    // in the repository (ledger L147/L571: the old SET-string-as-column INSERT
    // could never succeed and raced under concurrent requests).
    const preferences = await UserSettingsRepository.upsertUserPreferences(userId, req.body, req.user.church_id);

    if (!preferences) {
      return this.badRequest(res, 'No valid fields to update');
    }

    this.success(res, { message: 'User preferences saved successfully', preferences });
  } catch (error) {
    this.logger.error('updateUserPreferences', error);
    this.error(res, 'Failed to update user preferences');
  }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.body - Request body
   * @param {string} req.body.current_password - Current password
   * @param {string} req.body.new_password - New password
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return this.badRequest(res, 'Current password and new password are required');
    }

    const strengthCheck = validatePasswordStrength(new_password);
    if (!strengthCheck.isValid) {
      return this.badRequest(res, strengthCheck.message);
    }

    // Get current password hash
    const user = await UserSettingsRepository.getUserPasswordHash(userId);

    if (!user) {
      return this.notFound(res, 'User not found');
    }

    // Verify current password — same bcryptjs lib as the rest of the auth chain
    const isValidPassword = await comparePassword(current_password, user.password_hash);
    if (!isValidPassword) {
      return this.unauthorized(res, 'Current password is incorrect');
    }

    // Hash new password at the standardized cost (12), not the old 10
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await UserSettingsRepository.updateUserPassword(userId, newPasswordHash);

    // Revoke all existing sessions — a password change must not leave old
    // refresh tokens usable (ledger L147)
    await AuthRepository.invalidateUserRefreshTokens(userId);

    this.success(res, { message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    this.logger.error('changePassword', error);
    this.error(res, 'Failed to change password');
  }
  }

  /**
   * Get user activity history
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit=20] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getActivityHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const activities = await UserSettingsRepository.getActivityFeed(userId, limit, offset, req.user.church_id);
    const total = await UserSettingsRepository.getActivityFeedCount(userId, req.user.church_id);

    this.success(res, { activities, total, limit, offset });
  } catch (error) {
    this.logger.error('getActivityHistory', error);
    this.error(res, 'Failed to fetch activity history');
  }
  }
}

module.exports = new UserSettingsController();
