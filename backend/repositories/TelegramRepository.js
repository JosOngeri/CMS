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
    let query = `
      SELECT tp.*, u.first_name || ' ' || u.last_name as posted_by_name
      FROM telegram_posts tp
      LEFT JOIN users u ON tp.posted_by = u.id
      WHERE tp.channel_id = $1
    `;
    const params = [channelId];

    if (churchId) {
      query += ` AND tp.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY tp.posted_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getChannelSettings(channelId, churchId = null) {
    let query = `SELECT * FROM telegram_settings WHERE channel_id = $1`;
    const params = [channelId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getChannelStats(channelId, churchId = null) {
    let query = `
      SELECT
        (SELECT COUNT(*) FROM telegram_posts WHERE channel_id = $1) as total_posts,
        (SELECT COUNT(*) FROM telegram_posts WHERE channel_id = $1 AND posted_at >= CURRENT_DATE - INTERVAL '30 days') as posts_30_days,
        (SELECT COUNT(*) FROM telegram_post_views WHERE channel_id = $1) as total_views
    `;
    const params = [channelId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createChannel(channelData) {
    const { channelId, channelName, channelUsername, requires2fa, autoSyncToAnnouncements, syncIntervalHours } = channelData;
    const query = `
      INSERT INTO telegram_channels (channel_id, channel_name, channel_username, requires_2fa, auto_sync_to_announcements, sync_interval_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      channelId,
      channelName,
      channelUsername,
      requires2fa || false,
      autoSyncToAnnouncements || false,
      syncIntervalHours || 1
    ]);
    return result.rows[0];
  }

  async updateChannel(id, channelData) {
    const { channelName, channelUsername, isActive, requires2fa, autoSyncToAnnouncements, syncIntervalHours } = channelData;
    const query = `
      UPDATE telegram_channels
      SET channel_name = COALESCE($1, channel_name),
          channel_username = COALESCE($2, channel_username),
          is_active = COALESCE($3, is_active),
          requires_2fa = COALESCE($4, requires_2fa),
          auto_sync_to_announcements = COALESCE($5, auto_sync_to_announcements),
          sync_interval_hours = COALESCE($6, sync_interval_hours),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      channelName,
      channelUsername,
      isActive,
      requires2fa,
      autoSyncToAnnouncements,
      syncIntervalHours,
      id
    ]);
    return result.rows[0];
  }

  async deleteChannel(id) {
    await this.pool.query('DELETE FROM telegram_channels WHERE id = $1', [id]);
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

  async createPhotoCache(channelId, photoData) {
    const { fileId, fileUniqueId, photoUrl, thumbUrl, width, height, caption } = photoData;
    const query = `
      INSERT INTO telegram_photos_cache (channel_id, file_id, file_unique_id, photo_url, thumb_url, width, height, caption)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      channelId,
      fileId,
      fileUniqueId,
      photoUrl,
      thumbUrl || null,
      width || null,
      height || null,
      caption || null
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

  async getChannelMTProtoAuthStatus(channelId) {
    const query = `
      SELECT id, channel_name, mtproto_phone, mtproto_auth_status, mtproto_last_auth_attempt
      FROM telegram_channels
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [channelId]);
    return result.rows[0];
  }
}

module.exports = new TelegramRepository();
