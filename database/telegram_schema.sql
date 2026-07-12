-- TELEGRAM Module Database Schema

-- Telegram bot and API settings (no dependencies)
CREATE TABLE IF NOT EXISTS telegram_settings (
  id SERIAL PRIMARY KEY,
  bot_token VARCHAR(500) NOT NULL,
  bot_username VARCHAR(255),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  is_webhook_active BOOLEAN DEFAULT false,
  max_file_size_mb INTEGER DEFAULT 50,
  api_timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telegram channels configuration (no dependencies)
CREATE TABLE IF NOT EXISTS telegram_channels (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR(100) UNIQUE NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  channel_username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  requires_2fa BOOLEAN DEFAULT false,
  auto_sync_to_announcements BOOLEAN DEFAULT false,
  sync_interval_hours INTEGER DEFAULT 1,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telegram channel posts/messages (depends on telegram_channels)
CREATE TABLE IF NOT EXISTS telegram_channel_posts (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES telegram_channels(id) ON DELETE CASCADE,
  message_id INTEGER NOT NULL,
  message_text TEXT,
  post_date TIMESTAMP,
  media_group_id VARCHAR(100),
  is_edited BOOLEAN DEFAULT false,
  edit_date TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  synced_to_announcement BOOLEAN DEFAULT false,
  announcement_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel_id, message_id)
);

-- Telegram media attachments (depends on telegram_channel_posts)
CREATE TABLE IF NOT EXISTS telegram_channel_media (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES telegram_channel_posts(id) ON DELETE CASCADE,
  media_type VARCHAR(50) NOT NULL, -- 'photo', 'video', 'document', etc.
  file_id VARCHAR(255) NOT NULL,
  file_unique_id VARCHAR(255),
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for video/audio
  mime_type VARCHAR(100),
  file_name VARCHAR(255),
  thumb_file_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telegram photos cache (depends on telegram_channels)
CREATE TABLE IF NOT EXISTS telegram_photos_cache (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES telegram_channels(id) ON DELETE CASCADE,
  file_id VARCHAR(255) NOT NULL,
  file_unique_id VARCHAR(255),
  file_reference TEXT,
  file_reference_expires_at TIMESTAMP,
  photo_url VARCHAR(500),
  thumb_url VARCHAR(500),
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  caption TEXT,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_id)
);

-- Insert default settings
INSERT INTO telegram_settings (bot_token, bot_username, webhook_url)
VALUES ('', '', '')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_channels_channel_id ON telegram_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_is_active ON telegram_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_channel_id ON telegram_channel_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_synced ON telegram_channel_posts(synced_to_announcement);
CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_post_date ON telegram_channel_posts(post_date);
CREATE INDEX IF NOT EXISTS idx_telegram_channel_media_post_id ON telegram_channel_media(post_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_channel_id ON telegram_photos_cache(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_file_id ON telegram_photos_cache(file_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_expires_at ON telegram_photos_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_is_expired ON telegram_photos_cache(is_expired);

-- Add comments
COMMENT ON TABLE telegram_channels IS 'Configuration for Telegram channels integrated with the church system';
COMMENT ON TABLE telegram_channel_posts IS 'Posts/messages from Telegram channels';
COMMENT ON TABLE telegram_channel_media IS 'Media attachments from Telegram posts';
COMMENT ON TABLE telegram_settings IS 'Bot configuration and API settings for Telegram integration';
COMMENT ON TABLE telegram_photos_cache IS 'Cached photo data from Telegram for gallery integration';