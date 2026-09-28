const { pool } = require('../config/database');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const { spawn } = require('child_process');
const path = require('path');

const logger = createLogger('TelegramChurchController');

class TelegramChurchController extends BaseController {
  /**
   * Get the current church's Telegram config
   */
  async getConfig(req, res) {
    try {
      const churchId = req.user.church_id;
      const result = await pool.query(
        'SELECT * FROM telegram_channels WHERE church_id = $1 LIMIT 1',
        [churchId]
      );
      this.success(res, { data: result.rows[0] || null });
    } catch (error) {
      logger.error('getConfig', error);
      this.error(res, 'Failed to fetch Telegram config');
    }
  }

  /**
   * Save or update the current church's Telegram channel settings
   */
  async saveConfig(req, res) {
    try {
      const churchId = req.user.church_id;
      const {
        channelId,
        channelName,
        channelUsername,
        autoSyncToAnnouncements,
        syncIntervalHours,
        isActive
      } = req.body;

      const result = await pool.query(
        `INSERT INTO telegram_channels
          (church_id, channel_id, channel_name, channel_username, auto_sync_to_announcements, sync_interval_hours, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (church_id) DO UPDATE SET
           channel_id = EXCLUDED.channel_id,
           channel_name = EXCLUDED.channel_name,
           channel_username = EXCLUDED.channel_username,
           auto_sync_to_announcements = EXCLUDED.auto_sync_to_announcements,
           sync_interval_hours = EXCLUDED.sync_interval_hours,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [churchId, channelId, channelName, channelUsername, autoSyncToAnnouncements || false, syncIntervalHours || 1, isActive !== false]
      );

      this.success(res, { message: 'Telegram config saved', data: result.rows[0] });
    } catch (error) {
      logger.error('saveConfig', error);
      this.error(res, 'Failed to save Telegram config');
    }
  }

  /**
   * Trigger a manual sync for the current church's Telegram channel
   */
  async sync(req, res) {
    try {
      const churchId = req.user.church_id;
      const church = await pool.query('SELECT slug FROM churches WHERE id = $1', [churchId]);
      if (!church.rows.length) return this.notFound(res, 'Church not found');

      const churchSlug = church.rows[0].slug;

      // Spawn sync script in background; return immediately
      const script = path.join(__dirname, '..', 'scripts', 'sync-telegram-gallery.js');
      const child = spawn(process.execPath, [script, 'auto', churchSlug, '200'], {
        cwd: path.join(__dirname, '..'),
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      this.success(res, { message: 'Telegram sync started for this church' });
    } catch (error) {
      logger.error('sync', error);
      this.error(res, 'Failed to start Telegram sync');
    }
  }
}

module.exports = new TelegramChurchController();
