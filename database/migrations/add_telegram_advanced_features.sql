-- TELEGRAM Module Advanced Features Migration
-- Adds support for MTProto authentication, album filtering, and tag filtering

-- Add album_id to telegram_photos_cache for album filtering
ALTER TABLE telegram_photos_cache
ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES gallery_albums(id) ON DELETE SET NULL;

-- Add tags array to telegram_photos_cache for tag filtering
ALTER TABLE telegram_photos_cache
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add is_valid column (if not exists) for cache management
ALTER TABLE telegram_photos_cache
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT true;

-- Add MTProto authentication data to telegram_channels
ALTER TABLE telegram_channels
ADD COLUMN IF NOT EXISTS mtproto_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS mtproto_password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS mtproto_auth_key TEXT,
ADD COLUMN IF NOT EXISTS mtproto_auth_status VARCHAR(20) DEFAULT 'none', -- 'none', 'pending', 'authenticated', 'failed'
ADD COLUMN IF NOT EXISTS mtproto_last_auth_attempt TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_album_id ON telegram_photos_cache(album_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_tags ON telegram_photos_cache USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_is_valid ON telegram_photos_cache(is_valid);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_mtproto_status ON telegram_channels(mtproto_auth_status);

-- Add comments
COMMENT ON COLUMN telegram_photos_cache.album_id IS 'Gallery album ID for album filtering';
COMMENT ON COLUMN telegram_photos_cache.tags IS 'Array of tags for tag-based filtering';
COMMENT ON COLUMN telegram_photos_cache.is_valid IS 'Whether the cached photo reference is still valid';
COMMENT ON COLUMN telegram_channels.mtproto_phone IS 'Phone number for MTProto authentication';
COMMENT ON COLUMN telegram_channels.mtproto_password_hash IS 'Hashed password for MTProto authentication';
COMMENT ON COLUMN telegram_channels.mtproto_auth_key IS 'MTProto authentication key';
COMMENT ON COLUMN telegram_channels.mtproto_auth_status IS 'Status of MTProto authentication';
COMMENT ON COLUMN telegram_channels.mtproto_last_auth_attempt IS 'Timestamp of last MTProto authentication attempt';
