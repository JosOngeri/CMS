-- Add missing columns to gallery_photos table
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS height INTEGER;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_gallery_photos_is_featured ON gallery_photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_tags ON gallery_photos USING GIN(tags);
