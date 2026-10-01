-- Migration 044: Gallery direct uploads
-- Supports POST /gallery/upload (multipart photo upload) and
-- PUT /gallery/photos/batch from GalleryManagement.
-- Adds caption/category/status columns (metadata the web UI edits),
-- adds created_at/updated_at (repo queries reference them),
-- and makes album_id nullable so photos can exist outside an album.

DO $$
BEGIN
  -- caption / category / status columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'caption'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN caption TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'category'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN category VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'status'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN status VARCHAR(20) DEFAULT 'approved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE gallery_photos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- album_id must be nullable for direct uploads
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery_photos' AND column_name = 'album_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE gallery_photos ALTER COLUMN album_id DROP NOT NULL;
  END IF;
END $$;
