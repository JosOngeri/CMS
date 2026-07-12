-- Create gallery_photos table for storing photo metadata
CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_message_id INTEGER UNIQUE,
  telegram_file_id VARCHAR(255),
  caption TEXT,
  description TEXT,
  category VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_gallery_photos_telegram_message_id ON gallery_photos(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_at ON gallery_photos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by);

-- Create full-text search index for captions
CREATE INDEX IF NOT EXISTS idx_gallery_photos_caption_fts ON gallery_photos USING gin(to_tsvector('english', caption));

-- Add comment
COMMENT ON TABLE gallery_photos IS 'Stores metadata for photos from Telegram channel for search and filter functionality';
