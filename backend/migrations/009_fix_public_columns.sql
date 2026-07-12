-- Fix missing columns for public API endpoints

-- Add is_published to announcements table
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- Add created_at to gallery_photos table if missing
ALTER TABLE gallery_photos
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have sensible defaults
UPDATE announcements SET is_published = TRUE WHERE is_published IS NULL;
UPDATE gallery_photos SET created_at = uploaded_at WHERE created_at IS NULL;
