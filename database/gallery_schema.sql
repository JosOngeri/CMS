-- Gallery Schema for Kiserian Main SDA Church Website
-- This schema supports photo gallery with Telegram integration

CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  telegram_message_id INTEGER UNIQUE,
  photo_location TEXT, -- JSON object with MTProto photo location data
  photo_url TEXT, -- URL to the photo file
  thumbnail_url TEXT, -- URL to thumbnail
  caption TEXT,
  description TEXT,
  category VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  tags TEXT[], -- Array of tags
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_by ON gallery_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_uploaded_at ON gallery_photos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_telegram_message_id ON gallery_photos(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_is_featured ON gallery_photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_tags ON gallery_photos USING GIN(tags);

-- Create full-text search index for captions and descriptions
CREATE INDEX IF NOT EXISTS idx_gallery_photos_caption_search ON gallery_photos USING GIN(to_tsvector('english', caption || ' ' || COALESCE(description, '')));

-- Create gallery categories table
CREATE TABLE IF NOT EXISTS gallery_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7), -- Hex color code
  parent_id INTEGER REFERENCES gallery_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_gallery_categories_parent ON gallery_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_active ON gallery_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_sort ON gallery_categories(sort_order);

-- Insert default categories
INSERT INTO gallery_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Church Services', 'church-services', 'Regular church services and worship', 'church', '#3B82F6', 1),
  ('Events', 'events', 'Special church events and celebrations', 'calendar', '#10B981', 2),
  ('Community', 'community', 'Community outreach and service activities', 'users', '#F59E0B', 3),
  ('Youth', 'youth', 'Youth group activities and programs', 'heart', '#8B5CF6', 4),
  ('Music', 'music', 'Music ministry and performances', 'music', '#EC4899', 5),
  ('Facilities', 'facilities', 'Church buildings and facilities', 'building', '#6B7280', 6)
ON CONFLICT (slug) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gallery_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for gallery_photos
DROP TRIGGER IF EXISTS update_gallery_photos_updated_at_trigger ON gallery_photos;
CREATE TRIGGER update_gallery_photos_updated_at_trigger
  BEFORE UPDATE ON gallery_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_photos_updated_at();

-- Create function to update gallery_categories updated_at
CREATE OR REPLACE FUNCTION update_gallery_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for gallery_categories
DROP TRIGGER IF EXISTS update_gallery_categories_updated_at_trigger ON gallery_categories;
CREATE TRIGGER update_gallery_categories_updated_at_trigger
  BEFORE UPDATE ON gallery_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_categories_updated_at();
