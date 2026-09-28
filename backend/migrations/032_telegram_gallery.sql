-- Migration 032: Telegram integration + gallery sync schema
-- Creates the telegram tables the repositories/services expect and links
-- gallery tables to telegram channels.

CREATE TABLE IF NOT EXISTS telegram_auth_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('bot', 'mtproto')),
  name VARCHAR(120) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  channel_id VARCHAR(120) NOT NULL,
  channel_name VARCHAR(200) NOT NULL,
  channel_username VARCHAR(120),
  requires_2fa BOOLEAN NOT NULL DEFAULT false,
  auto_sync_to_announcements BOOLEAN NOT NULL DEFAULT false,
  sync_interval_hours INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  mtproto_phone VARCHAR(30),
  mtproto_password_hash TEXT,
  mtproto_auth_key TEXT,
  mtproto_auth_status VARCHAR(20) NOT NULL DEFAULT 'none',
  mtproto_last_auth_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_church ON telegram_channels(church_id);

CREATE TABLE IF NOT EXISTS telegram_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bot_token TEXT,
  bot_username VARCHAR(120),
  webhook_url TEXT,
  webhook_secret TEXT,
  max_file_size_mb INTEGER NOT NULL DEFAULT 50,
  api_timeout_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO telegram_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS telegram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES telegram_channels(id) ON DELETE CASCADE,
  message_id BIGINT,
  message_text TEXT,
  media_type VARCHAR(30),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_channel ON telegram_posts(channel_id);

CREATE TABLE IF NOT EXISTS telegram_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES telegram_channels(id) ON DELETE CASCADE,
  post_id UUID REFERENCES telegram_posts(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telegram_post_views_channel ON telegram_post_views(channel_id);

CREATE TABLE IF NOT EXISTS telegram_channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES telegram_channels(id) ON DELETE CASCADE,
  message_id BIGINT NOT NULL,
  message_text TEXT,
  post_date TIMESTAMPTZ,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (channel_id, message_id)
);

CREATE TABLE IF NOT EXISTS gallery_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES gallery_photos(id) ON DELETE SET NULL,
  telegram_channel_id VARCHAR(120),
  telegram_msg_id BIGINT,
  telegram_file_id VARCHAR(255),
  telegram_file_unique_id VARCHAR(255),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_file_unique_id)
);

ALTER TABLE gallery_albums ADD COLUMN IF NOT EXISTS telegram_channel_id VARCHAR(120);
ALTER TABLE gallery_albums ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS telegram_channel_id VARCHAR(120);
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS telegram_msg_id BIGINT;
