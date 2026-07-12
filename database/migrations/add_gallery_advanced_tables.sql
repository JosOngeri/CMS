-- Gallery Module Advanced Tables Migration
-- Adds albums, photo tagging, comments, and privacy settings

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Gallery Albums
CREATE TABLE IF NOT EXISTS gallery_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES gallery_categories(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  cover_photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo Tags
CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo-Tag Junction Table
CREATE TABLE IF NOT EXISTS photo_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES photo_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(photo_id, tag_id)
);

-- Photo Comments
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo Privacy
CREATE TABLE IF NOT EXISTS photo_privacy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'restricted'
  allowed_departments UUID[], -- Array of department UUIDs
  allowed_users UUID[], -- Array of user UUIDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(photo_id)
);

-- Photo-Album Junction Table
CREATE TABLE IF NOT EXISTS album_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES gallery_albums(id) ON DELETE CASCADE,
  photo_id INTEGER REFERENCES gallery_photos(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(album_id, photo_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gallery_albums_slug ON gallery_albums(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_category ON gallery_albums(category_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_parent ON gallery_albums(parent_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_cover ON gallery_albums(cover_photo_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_public ON gallery_albums(is_public);
CREATE INDEX IF NOT EXISTS idx_photo_tags_name ON photo_tags(name);
CREATE INDEX IF NOT EXISTS idx_photo_tag_assignments_photo ON photo_tag_assignments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tag_assignments_tag ON photo_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user ON photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_privacy_photo ON photo_privacy(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_privacy_visibility ON photo_privacy(visibility);
CREATE INDEX IF NOT EXISTS idx_album_photos_album ON album_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_photo ON album_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_sort ON album_photos(sort_order);

-- Insert default photo tags
INSERT INTO photo_tags (name, slug, color) VALUES
('Church Service', 'church-service', '#3B82F6'),
('Event', 'event', '#10B981'),
('Community', 'community', '#F59E0B'),
('Youth', 'youth', '#8B5CF6'),
('Music', 'music', '#EC4899'),
('Outreach', 'outreach', '#6B7280'),
('Fellowship', 'fellowship', '#14B8A6'),
('Worship', 'worship', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE gallery_albums IS 'Photo albums for organizing gallery photos';
COMMENT ON TABLE photo_tags IS 'Tags for categorizing and filtering photos';
COMMENT ON TABLE photo_tag_assignments IS 'Junction table for photo-tag relationships';
COMMENT ON TABLE photo_comments IS 'Comments on gallery photos';
COMMENT ON TABLE photo_privacy IS 'Privacy settings for individual photos';
COMMENT ON TABLE album_photos IS 'Junction table for album-photo relationships with ordering';

-- Create function to generate album slugs
CREATE OR REPLACE FUNCTION generate_album_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
    NEW.slug := regexp_replace(NEW.slug, '-+', '-', 'g');
    -- Ensure uniqueness
    FOR i IN 1..10 LOOP
      IF NOT EXISTS (SELECT 1 FROM gallery_albums WHERE slug = NEW.slug) THEN
        EXIT;
      END IF;
      NEW.slug := NEW.slug || '-' || i;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for gallery_albums
DROP TRIGGER IF EXISTS generate_album_slug_trigger ON gallery_albums;
CREATE TRIGGER generate_album_slug_trigger
  BEFORE INSERT OR UPDATE ON gallery_albums
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_album_slug();
