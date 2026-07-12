-- Add photo_location column to gallery_photos table for MTProto support
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS photo_location TEXT;
