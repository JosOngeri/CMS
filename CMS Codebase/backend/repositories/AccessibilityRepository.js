const BaseRepository = require('./BaseRepository');

class AccessibilityRepository extends BaseRepository {
  constructor() {
    super('accessibility_settings');
  }

  async getSettings() {
    const result = await this.pool.query('SELECT * FROM accessibility_settings WHERE id = 1');
    return result.rows[0] || {};
  }

  async updateSettings(data) {
    const { highContrast, reducedMotion, textSize, screenReader, keyboardNavigation, focusIndicators, skipLinks } = data;

    const result = await this.pool.query(
      `UPDATE accessibility_settings
       SET high_contrast = $1, reduced_motion = $2, text_size = $3, screen_reader = $4,
           keyboard_navigation = $5, focus_indicators = $6, skip_links = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [highContrast, reducedMotion, textSize, screenReader, keyboardNavigation, focusIndicators, skipLinks]
    );
    return result.rows[0];
  }
}

module.exports = new AccessibilityRepository();
