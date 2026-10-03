/**
 * @audit Telegram channel repository.
 * @fixed Channel CRUD/post reads church-scoped; getChannelPosts/getChannelStats
 *        read telegram_channel_posts (telegram_posts is an orphan — no writer).
 *        telegram_settings is deployment-global BY DESIGN (CHECK id=1).
 */
const BaseRepository = require('./BaseRepository');

class TelegramRepository extends BaseRepository {
  constructor() {
    super('telegram_channels');
  }

  async getActiveChannels(churchId = null) {
    let query = `SELECT * FROM telegram_channels WHERE is_active = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getChannelById(channelId, churchId = null) {
    let query = `SELECT * FROM telegram_channels WHERE id = $1`;
    const params = [channelId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getChannelPosts(channelId, churchId = null) {
    // All post writes land in telegram_channel_posts; telegram_posts is an
    // orphan read target (no writer). Scope via the channel's church.
    let query = `
      SELECT tp.*
      FROM telegram_channel_posts tp
      JOIN telegram_channels tc ON tp.channel_id = tc.id
      WHERE tp.channel_id = $1
    `;
    const params = [channelId];

    if (churchId) {
      query += ` AND tc.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY tp.post_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // telegram_settings is deployment-global (single row id=1, one bot token) —
  // channelId/churchId accepted for signature compatibility but not needed
  async getChannelSettings(channelId, churchId = null) {
    void channelId; void churchId;
    const result = await this.pool.query('SELECT * FROM telegram_settings WHERE id = 1');
    return result.rows[0];
  }

  async getChannelStats(channelId, churchId = null) {
    const params = [channelId];
    // Scope via the channel's church; post counts share a single scan.
    let scope = '';
    if (churchId) {
      scope = ` AND tc.church_id = $2`;
      params.push(churchId);
    }
    const query = `
      SELECT p.total_posts, p.posts_30_days, v.total_views
      FROM (
        SELECT
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE post_date >= CURRENT_DATE - INTERVAL '30 days') as posts_30_days
        FROM telegram_channel_posts
        WHERE channel_id = $1
      ) p
      CROSS JOIN (
        SELECT COUNT(*) as total_views
        FROM telegram_post_views
        WHERE channel_id = $1
      ) v
      WHERE EXISTS (SELECT 1 FROM telegram_channels tc WHERE tc.id = $1${scope})
    `;
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createChannel(channelData) {
    const { channelId, channelName, channelUsername, requires2fa, autoSyncToAnnouncements, syncIntervalHours, churchId } = channelData;
    const query = `
      INSERT INTO telegram_channels (channel_id, channel_name, channel_username, requires_2fa, auto_sync_to_announcements, sync_interval_hours, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      channelId,
      channelName,
      channelUsername,
      requires2fa || false,
      autoSyncToAnnouncements || false,
      syncIntervalHours || 1,
      churchId
    ]);
    return result.rows[0];
  }

  async updateChannel(id, channelData, churchId = null) {
    const { channelName, channelUsername, isActive, requires2fa, autoSyncToAnnouncements, syncIntervalHours } = channelData;
    const params = [channelName, channelUsername, isActive, requires2fa, autoSyncToAnnouncements, syncIntervalHours, id];
    let where = 'id = $7';
    if (churchId) {
      where += ' AND church_id = $8';
      params.push(churchId);
    }
    const query = `
      UPDATE telegram_channels
      SET channel_name = COALESCE($1, channel_name),
          channel_username = COALESCE($2, channel_username),
          is_active = COALESCE($3, is_active),
          requires_2fa = COALESCE($4, requires_2fa),
          auto_sync_to_announcements = COALESCE($5, auto_sync_to_announcements),
          sync_interval_hours = COALESCE($6, sync_interval_hours),
          updated_at = CURRENT_TIMESTAMP
      WHERE ${where}
      RETURNING *
    `;
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async deleteChannel(id, churchId = null) {
    const params = [id];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $2';
      params.push(churchId);
    }
    await this.pool.query(`DELETE FROM telegram_channels WHERE ${where}`, params);
  }

  async createChannelPost(channelId, messageId, messageText) {
    const query = `
      INSERT INTO telegram_channel_posts (channel_id, message_id, message_text, post_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await this.pool.query(query, [channelId, messageId, messageText]);
    return result.rows[0];
  }

  // Real columns on telegram_photos_cache: telegram_file_id,
  // telegram_file_unique_id, cached_url, photo_id, church_id, expires_at
  async createPhotoCache(channelId, photoData, churchId = null) {
    const { fileId, fileUniqueId, photoUrl, photoId, expiresAt } = photoData;
    const query = `
      INSERT INTO telegram_photos_cache (telegram_file_id, telegram_file_unique_id, cached_url, photo_id, church_id, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      fileId,
      fileUniqueId,
      photoUrl,
      photoId || null,
      churchId,
      expiresAt || null
    ]);
    return result.rows[0];
  }

  async getSettings() {
    const result = await this.pool.query('SELECT * FROM telegram_settings WHERE id = 1');
    return result.rows[0];
  }

  async updateSettings(settingsData) {
    const { botToken, botUsername, webhookUrl, webhookSecret, maxFileSizeMb, apiTimeoutSeconds } = settingsData;
    const query = `
      UPDATE telegram_settings
      SET bot_token = COALESCE($1, bot_token),
          bot_username = COALESCE($2, bot_username),
          webhook_url = COALESCE($3, webhook_url),
          webhook_secret = COALESCE($4, webhook_secret),
          max_file_size_mb = COALESCE($5, max_file_size_mb),
          api_timeout_seconds = COALESCE($6, api_timeout_seconds),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;
    await this.pool.query(query, [botToken, botUsername, webhookUrl, webhookSecret, maxFileSizeMb, apiTimeoutSeconds]);
  }

  async upsertChannelPost(channelId, postData) {
    const { messageId, messageText, date, editDate } = postData;
    const query = `
      INSERT INTO telegram_channel_posts (channel_id, message_id, message_text, post_date, is_edited, edit_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (channel_id, message_id) DO UPDATE SET
        message_text = EXCLUDED.message_text,
        is_edited = EXCLUDED.is_edited,
        edit_date = EXCLUDED.edit_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      channelId,
      messageId,
      messageText || null,
      date || null,
      editDate ? true : false,
      editDate || null
    ]);
    return result.rows[0];
  }

  async updateChannelLastSync(channelId) {
    const query = 'UPDATE telegram_channels SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1';
    await this.pool.query(query, [channelId]);
  }

  async updateChannelMTProtoAuth(channelId, phoneNumber, passwordHash) {
    const query = `
      UPDATE telegram_channels
      SET mtproto_phone = $1,
          mtproto_password_hash = $2,
          mtproto_auth_status = 'pending',
          mtproto_last_auth_attempt = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [phoneNumber, passwordHash, channelId]);
    return result.rows[0];
  }

  async updateChannelMTProtoAuthSuccess(channelId, authKey) {
    const query = `
      UPDATE telegram_channels
      SET mtproto_auth_key = $1,
          mtproto_auth_status = 'authenticated',
          mtproto_last_auth_attempt = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [authKey, channelId]);
    return result.rows[0];
  }

  async updateChannelMTProtoAuthFailed(channelId) {
    const query = `
      UPDATE telegram_channels
      SET mtproto_auth_status = 'failed',
          mtproto_last_auth_attempt = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [channelId]);
  }

  async getChannelMTProtoAuthStatus(channelId, churchId = null) {
    const params = [channelId];
    let where = 'id = $1';
    if (churchId) {
      where += ' AND church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT id, channel_name, mtproto_phone, mtproto_auth_status, mtproto_last_auth_attempt
       FROM telegram_channels WHERE ${where}`,
      params
    );
    return result.rows[0];
  }
}

module.exports = new TelegramRepository();
