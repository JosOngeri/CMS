-- Gallery Module Schema
-- Photo gallery management with Telegram integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Albums table
CREATE TABLE IF NOT EXISTS gallery_albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_id UUID NULL,
  created_by UUID NOT NULL,
  church_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_private BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  CONSTRAINT fk_gallery_albums_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Add missing columns for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_albums' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE gallery_albums ADD COLUMN order_index INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_albums' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE gallery_albums ADD COLUMN church_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_albums_created_by ON gallery_albums(created_by);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_church_id ON gallery_albums(church_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_order_index ON gallery_albums(order_index);

-- Photos table
CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID NOT NULL,
  title VARCHAR(255),
  description TEXT,
  file_url VARCHAR(512) NOT NULL,
  thumbnail_url VARCHAR(512),
  file_size INT,
  file_type VARCHAR(50),
  width INT,
  height INT,
  telegram_file_id VARCHAR(255),
  telegram_file_unique_id VARCHAR(255),
  uploaded_by UUID NOT NULL,
  church_id UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  CONSTRAINT fk_gallery_photos_album_id FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE,
  CONSTRAINT fk_gallery_photos_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Add missing columns for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN order_index INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN church_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_photos_album_id ON gallery_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_church_id ON gallery_photos(church_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_telegram_file_unique_id ON gallery_photos(telegram_file_unique_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_order_index ON gallery_photos(order_index);

-- Tags table
CREATE TABLE IF NOT EXISTS gallery_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  church_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing church_id column for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_tags' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE gallery_tags ADD COLUMN church_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_tags_slug ON gallery_tags(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_tags_church_id ON gallery_tags(church_id);

-- Photo tags junction table
CREATE TABLE IF NOT EXISTS gallery_photo_tags (
  photo_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, tag_id),
  CONSTRAINT fk_gallery_photo_tags_photo_id FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE,
  CONSTRAINT fk_gallery_photo_tags_tag_id FOREIGN KEY (tag_id) REFERENCES gallery_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_photo_id ON gallery_photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_tag_id ON gallery_photo_tags(tag_id);

-- Comments table
CREATE TABLE IF NOT EXISTS gallery_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID NOT NULL,
  user_id UUID NOT NULL,
  church_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_comments_photo_id FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE,
  CONSTRAINT fk_gallery_comments_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add missing church_id column for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_comments' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE gallery_comments ADD COLUMN church_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_comments_photo_id ON gallery_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_comments_user_id ON gallery_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_comments_church_id ON gallery_comments(church_id);

-- Telegram photos cache table
CREATE TABLE IF NOT EXISTS telegram_photos_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_file_id VARCHAR(255) NOT NULL,
  telegram_file_unique_id VARCHAR(255) NOT NULL UNIQUE,
  cached_url VARCHAR(512) NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  photo_id UUID NULL,
  church_id UUID NOT NULL,
  CONSTRAINT fk_telegram_photos_cache_photo_id FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE SET NULL
);

-- Add missing church_id column for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telegram_photos_cache' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE telegram_photos_cache ADD COLUMN church_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_telegram_file_unique_id ON telegram_photos_cache(telegram_file_unique_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_expires_at ON telegram_photos_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_is_valid ON telegram_photos_cache(is_valid);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_church_id ON telegram_photos_cache(church_id);
