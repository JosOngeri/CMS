-- Gallery Analytics Migration
-- Adds photo views, downloads, shares tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Photo Views
CREATE TABLE IF NOT EXISTS gallery_photo_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Photo Downloads
CREATE TABLE IF NOT EXISTS gallery_photo_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

-- Photo Shares
CREATE TABLE IF NOT EXISTS gallery_photo_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'twitter', 'email', 'whatsapp', etc.
  recipient VARCHAR(255),
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add metadata columns to gallery_photos if they don't exist
ALTER TABLE gallery_photos 
ADD COLUMN IF NOT EXISTS camera VARCHAR(100),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS iso VARCHAR(20),
ADD COLUMN IF NOT EXISTS aperture VARCHAR(20),
ADD COLUMN IF NOT EXISTS shutter_speed VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_roles TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gallery_photo_views_photo ON gallery_photo_views(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_views_user ON gallery_photo_views(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_views_viewed ON gallery_photo_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_downloads_photo ON gallery_photo_downloads(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_downloads_user ON gallery_photo_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_downloads_downloaded ON gallery_photo_downloads(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_shares_photo ON gallery_photo_shares(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_shares_user ON gallery_photo_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_shares_shared ON gallery_photo_shares(shared_at);

-- Add comments
COMMENT ON TABLE gallery_photo_views IS 'Photo view tracking for analytics';
COMMENT ON TABLE gallery_photo_downloads IS 'Photo download tracking for analytics';
COMMENT ON TABLE gallery_photo_shares IS 'Photo share tracking for analytics';
COMMENT ON COLUMN gallery_photos.camera IS 'Camera model used to take the photo';
COMMENT ON COLUMN gallery_photos.location IS 'GPS location where photo was taken';
COMMENT ON COLUMN gallery_photos.iso IS 'ISO setting of the photo';
COMMENT ON COLUMN gallery_photos.aperture IS 'Aperture setting of the photo';
COMMENT ON COLUMN gallery_photos.shutter_speed IS 'Shutter speed of the photo';
COMMENT ON COLUMN gallery_photos.is_private IS 'Privacy setting for photo visibility';
COMMENT ON COLUMN gallery_photos.allowed_roles IS 'Comma-separated list of roles allowed to view private photos';
