-- Add video support to gallery_photos table
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT FALSE;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50);

-- Add comment
COMMENT ON COLUMN gallery_photos.is_video IS 'Indicates if the media is a video';
COMMENT ON COLUMN gallery_photos.mime_type IS 'MIME type of the media file (image/jpeg, video/mp4, etc.)';

-- Update existing photos to have proper mime type
UPDATE gallery_photos SET mime_type = 'image/jpeg' WHERE mime_type IS NULL AND is_video = FALSE;
