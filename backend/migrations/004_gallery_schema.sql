-- Gallery Module Schema
-- Photo gallery management with Telegram integration

-- Albums table
CREATE TABLE IF NOT EXISTS gallery_albums (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_id INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_private BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gallery_albums_created_by ON gallery_albums(created_by);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_order_index ON gallery_albums(order_index);

-- Photos table
CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  album_id INT NOT NULL,
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
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_album_id ON gallery_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_telegram_file_unique_id ON gallery_photos(telegram_file_unique_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_order_index ON gallery_photos(order_index);

-- Tags table
CREATE TABLE IF NOT EXISTS gallery_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_tags_slug ON gallery_tags(slug);

-- Photo tags junction table
CREATE TABLE IF NOT EXISTS gallery_photo_tags (
  photo_id INT NOT NULL,
  tag_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_photo_id ON gallery_photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_tags_tag_id ON gallery_photo_tags(tag_id);

-- Comments table
CREATE TABLE IF NOT EXISTS gallery_comments (
  id SERIAL PRIMARY KEY,
  photo_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_comments_photo_id ON gallery_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_comments_user_id ON gallery_comments(user_id);

-- Telegram photos cache table
CREATE TABLE IF NOT EXISTS telegram_photos_cache (
  id SERIAL PRIMARY KEY,
  telegram_file_id VARCHAR(255) NOT NULL,
  telegram_file_unique_id VARCHAR(255) NOT NULL UNIQUE,
  cached_url VARCHAR(512) NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  photo_id INT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_telegram_file_unique_id ON telegram_photos_cache(telegram_file_unique_id);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_expires_at ON telegram_photos_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_photos_cache_is_valid ON telegram_photos_cache(is_valid);
