const UserSettingsRepository = require('../repositories/UserSettingsRepository');
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
      return res.json({ preferences: newPreferences });
    }

    res.json({ preferences });
  } catch (error) {
    this.logger.error('getUserPreferences', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
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
    const {
      // Notification settings
      email_notifications,
      sms_notifications,
      announcement_notifications,
      event_notifications,
      department_notifications,
      payment_notifications,
      reminder_notifications,
      // Privacy settings
      profile_visibility,
      show_email,
      show_phone,
      show_departments,
      allow_messages,
      show_activity,
      // UI preferences
      theme,
      language,
      timezone
    } = req.body;
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (email_notifications !== undefined) {
      updates.push(`email_notifications = $${paramCount}`);
      values.push(email_notifications);
      paramCount++;
    }
    
    if (sms_notifications !== undefined) {
      updates.push(`sms_notifications = $${paramCount}`);
      values.push(sms_notifications);
      paramCount++;
    }
    
    if (announcement_notifications !== undefined) {
      updates.push(`announcement_notifications = $${paramCount}`);
      values.push(announcement_notifications);
      paramCount++;
    }
    
    if (event_notifications !== undefined) {
      updates.push(`event_notifications = $${paramCount}`);
      values.push(event_notifications);
      paramCount++;
    }
    
    if (department_notifications !== undefined) {
      updates.push(`department_notifications = $${paramCount}`);
      values.push(department_notifications);
      paramCount++;
    }
    
    if (payment_notifications !== undefined) {
      updates.push(`payment_notifications = $${paramCount}`);
      values.push(payment_notifications);
      paramCount++;
    }
    
    if (reminder_notifications !== undefined) {
      updates.push(`reminder_notifications = $${paramCount}`);
      values.push(reminder_notifications);
      paramCount++;
    }
    
    if (profile_visibility !== undefined) {
      updates.push(`profile_visibility = $${paramCount}`);
      values.push(profile_visibility);
      paramCount++;
    }
    
    if (show_email !== undefined) {
      updates.push(`show_email = $${paramCount}`);
      values.push(show_email);
      paramCount++;
    }
    
    if (show_phone !== undefined) {
      updates.push(`show_phone = $${paramCount}`);
      values.push(show_phone);
      paramCount++;
    }
    
    if (show_departments !== undefined) {
      updates.push(`show_departments = $${paramCount}`);
      values.push(show_departments);
      paramCount++;
    }
    
    if (allow_messages !== undefined) {
      updates.push(`allow_messages = $${paramCount}`);
      values.push(allow_messages);
      paramCount++;
    }
    
    if (show_activity !== undefined) {
      updates.push(`show_activity = $${paramCount}`);
      values.push(show_activity);
      paramCount++;
    }
    
    if (theme !== undefined) {
      updates.push(`theme = $${paramCount}`);
      values.push(theme);
      paramCount++;
    }
    
    if (language !== undefined) {
      updates.push(`language = $${paramCount}`);
      values.push(language);
      paramCount++;
    }
    
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount}`);
      values.push(timezone);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(userId);
    
    const query = `
      UPDATE user_preferences
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const preferences = await UserSettingsRepository.updateUserPreferences(userId, updates, values);

    if (!preferences) {
      // Create preferences if they don't exist
      const newPreferences = await UserSettingsRepository.createUserPreferencesWithFields(userId, updates, values);
      return res.json({
        message: 'User preferences created successfully',
        preferences: newPreferences
      });
    }

    res.json({
      message: 'User preferences updated successfully',
      preferences
    });
  } catch (error) {
    this.logger.error('updateUserPreferences', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
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
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get current password hash
    const user = await UserSettingsRepository.getUserPasswordHash(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = require('bcrypt');

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await UserSettingsRepository.updateUserPassword(userId, newPasswordHash);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    this.logger.error('changePassword', error);
    res.status(500).json({ error: 'Failed to change password' });
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

    const activities = await UserSettingsRepository.getActivityFeed(userId, limit, offset);
    const total = await UserSettingsRepository.getActivityFeedCount(userId);

    res.json({
      activities,
      total,
      limit,
      offset
    });
  } catch (error) {
    this.logger.error('getActivityHistory', error);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
  }
}

module.exports = new UserSettingsController();
