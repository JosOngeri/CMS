-- Phase 4: Execute UUID Migration for Gallery Tables (CORRECT ORDER)
-- This script converts gallery tables from INTEGER to UUID primary keys
-- IMPORTANT: Convert parent tables BEFORE child tables

BEGIN;

-- 1. Standardize gallery_albums (PARENT TABLE - DO FIRST)
ALTER TABLE gallery_albums ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE gallery_albums SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Finalize gallery_albums BEFORE updating foreign keys
ALTER TABLE gallery_albums DROP CONSTRAINT IF EXISTS gallery_albums_pkey;
ALTER TABLE gallery_albums DROP COLUMN IF EXISTS id;
ALTER TABLE gallery_albums RENAME COLUMN new_id TO id;
ALTER TABLE gallery_albums ADD PRIMARY KEY (id);

-- 2. Standardize gallery_tags (PARENT TABLE - DO SECOND)
ALTER TABLE gallery_tags ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE gallery_tags SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Finalize gallery_tags BEFORE updating foreign keys
ALTER TABLE gallery_tags DROP CONSTRAINT IF EXISTS gallery_tags_pkey;
ALTER TABLE gallery_tags DROP COLUMN IF EXISTS id;
ALTER TABLE gallery_tags RENAME COLUMN new_id TO id;
ALTER TABLE gallery_tags ADD PRIMARY KEY (id);

-- 3. Standardize gallery_photos (CHILD TABLE - DO THIRD)
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE gallery_photos SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references to gallery_albums (now UUID)
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS new_album_id UUID;
UPDATE gallery_photos SET new_album_id = ga.id 
FROM gallery_albums ga WHERE gallery_photos.album_id = ga.id AND ga.id IS NOT NULL;

-- Handle orphaned records
UPDATE gallery_photos SET new_album_id = NULL WHERE new_album_id IS NULL AND album_id IS NOT NULL;

-- Drop old foreign key constraint
ALTER TABLE gallery_photos DROP CONSTRAINT IF EXISTS gallery_photos_album_id_fkey;

-- Drop old column and rename new one
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS album_id;
ALTER TABLE gallery_photos RENAME COLUMN new_album_id TO album_id;

-- Add new foreign key constraint with UUID
ALTER TABLE gallery_photos ADD CONSTRAINT gallery_photos_album_id_fkey 
  FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE;

-- Finalize gallery_photos
ALTER TABLE gallery_photos DROP CONSTRAINT IF EXISTS gallery_photos_pkey;
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS id;
ALTER TABLE gallery_photos RENAME COLUMN new_id TO id;
ALTER TABLE gallery_photos ADD PRIMARY KEY (id);

-- 4. Standardize gallery_comments (CHILD TABLE - DO FOURTH)
ALTER TABLE gallery_comments ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE gallery_comments SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references to gallery_photos (now UUID)
ALTER TABLE gallery_comments ADD COLUMN IF NOT EXISTS new_photo_id UUID;
UPDATE gallery_comments SET new_photo_id = gp.id 
FROM gallery_photos gp WHERE gallery_comments.photo_id = gp.id AND gp.id IS NOT NULL;

-- Handle orphaned records
UPDATE gallery_comments SET new_photo_id = NULL WHERE new_photo_id IS NULL AND photo_id IS NOT NULL;

-- Drop constraints
ALTER TABLE gallery_comments DROP CONSTRAINT IF EXISTS gallery_comments_photo_id_fkey;
ALTER TABLE gallery_comments DROP COLUMN IF EXISTS photo_id;
ALTER TABLE gallery_comments RENAME COLUMN new_photo_id TO photo_id;
ALTER TABLE gallery_comments ADD CONSTRAINT gallery_comments_photo_id_fkey 
  FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE;

-- Finalize gallery_comments
ALTER TABLE gallery_comments DROP CONSTRAINT IF EXISTS gallery_comments_pkey;
ALTER TABLE gallery_comments DROP COLUMN IF EXISTS id;
ALTER TABLE gallery_comments RENAME COLUMN new_id TO id;
ALTER TABLE gallery_comments ADD PRIMARY KEY (id);

-- 5. Standardize gallery_photo_tags (CHILD TABLE - DO FIFTH)
ALTER TABLE gallery_photo_tags ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE gallery_photo_tags SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references to gallery_photos (now UUID)
ALTER TABLE gallery_photo_tags ADD COLUMN IF NOT EXISTS new_photo_id UUID;
UPDATE gallery_photo_tags SET new_photo_id = gp.id 
FROM gallery_photos gp WHERE gallery_photo_tags.photo_id = gp.id AND gp.id IS NOT NULL;

-- Update foreign key references to gallery_tags (now UUID)
ALTER TABLE gallery_photo_tags ADD COLUMN IF NOT EXISTS new_tag_id UUID;
UPDATE gallery_photo_tags SET new_tag_id = gt.id 
FROM gallery_tags gt WHERE gallery_photo_tags.tag_id = gt.id AND gt.id IS NOT NULL;

-- Handle orphaned records
UPDATE gallery_photo_tags SET new_photo_id = NULL WHERE new_photo_id IS NULL AND photo_id IS NOT NULL;
UPDATE gallery_photo_tags SET new_tag_id = NULL WHERE new_tag_id IS NULL AND tag_id IS NOT NULL;

-- Drop constraints
ALTER TABLE gallery_photo_tags DROP CONSTRAINT IF EXISTS gallery_photo_tags_photo_id_fkey;
ALTER TABLE gallery_photo_tags DROP CONSTRAINT IF EXISTS gallery_photo_tags_tag_id_fkey;
ALTER TABLE gallery_photo_tags DROP COLUMN IF EXISTS photo_id;
ALTER TABLE gallery_photo_tags DROP COLUMN IF EXISTS tag_id;
ALTER TABLE gallery_photo_tags RENAME COLUMN new_photo_id TO photo_id;
ALTER TABLE gallery_photo_tags RENAME COLUMN new_tag_id TO tag_id;
ALTER TABLE gallery_photo_tags ADD CONSTRAINT gallery_photo_tags_photo_id_fkey 
  FOREIGN KEY (photo_id) REFERENCES gallery_photos(id) ON DELETE CASCADE;
ALTER TABLE gallery_photo_tags ADD CONSTRAINT gallery_photo_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES gallery_tags(id) ON DELETE CASCADE;

-- Finalize gallery_photo_tags
ALTER TABLE gallery_photo_tags DROP CONSTRAINT IF EXISTS gallery_photo_tags_pkey;
ALTER TABLE gallery_photo_tags DROP COLUMN IF EXISTS id;
ALTER TABLE gallery_photo_tags RENAME COLUMN new_id TO id;
ALTER TABLE gallery_photo_tags ADD PRIMARY KEY (id);

COMMIT;

-- Verification queries (run separately to verify)
-- SELECT id FROM gallery_albums LIMIT 5;
-- SELECT id FROM gallery_photos LIMIT 5;
-- SELECT id FROM gallery_tags LIMIT 5;
