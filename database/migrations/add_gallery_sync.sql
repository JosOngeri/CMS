-- Phase 11: Gallery Sync Tracking Migration
-- Adds sync status tracking for MTProto gallery synchronization

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create gallery sync status table
CREATE TABLE IF NOT EXISTS gallery_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES gallery_albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES gallery_photos(id) ON DELETE CASCADE,
  telegram_channel_id VARCHAR(100),
  telegram_msg_id BIGINT,
  telegram_file_id VARCHAR(200),
  telegram_file_unique_id VARCHAR(200),
  sync_status VARCHAR(20) DEFAULT 'pending',
  sync_error TEXT,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sync-related columns to gallery tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_albums' AND column_name='telegram_channel_id') THEN
    ALTER TABLE gallery_albums ADD COLUMN telegram_channel_id VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_albums' AND column_name='last_synced_at') THEN
    ALTER TABLE gallery_albums ADD COLUMN last_synced_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_photos' AND column_name='telegram_file_id') THEN
    ALTER TABLE gallery_photos ADD COLUMN telegram_file_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_photos' AND column_name='telegram_file_unique_id') THEN
    ALTER TABLE gallery_photos ADD COLUMN telegram_file_unique_id VARCHAR(200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_photos' AND column_name='cdn_url') THEN
    ALTER TABLE gallery_photos ADD COLUMN cdn_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_photos' AND column_name='optimized_url') THEN
    ALTER TABLE gallery_photos ADD COLUMN optimized_url TEXT;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_gallery_sync_status_album ON gallery_sync_status(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sync_status_photo ON gallery_sync_status(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sync_status_status ON gallery_sync_status(sync_status);
CREATE INDEX IF NOT EXISTS idx_gallery_sync_status_telegram ON gallery_sync_status(telegram_file_unique_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_telegram ON gallery_albums(telegram_channel_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_telegram ON gallery_photos(telegram_file_unique_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_gallery_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_gallery_sync_status_updated_at ON gallery_sync_status;
CREATE TRIGGER trg_update_gallery_sync_status_updated_at
  BEFORE UPDATE ON gallery_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_sync_status_updated_at();

-- Add comments
COMMENT ON TABLE gallery_sync_status IS 'Tracks MTProto sync status for gallery items';
COMMENT ON COLUMN gallery_sync_status.sync_status IS 'pending, syncing, completed, failed';
COMMENT ON COLUMN gallery_photos.cdn_url IS 'CDN URL for photo storage';
COMMENT ON COLUMN gallery_photos.optimized_url IS 'Optimized/compressed photo URL';
