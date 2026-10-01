-- 048_gallery_member_features.sql
-- Per-member gallery features: favourites and private labels.
-- Both are scoped to user_id so each member only sees their own.

CREATE TABLE IF NOT EXISTS gallery_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, photo_id)
);
CREATE INDEX IF NOT EXISTS idx_gallery_favorites_user ON gallery_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_favorites_photo ON gallery_favorites(photo_id);

CREATE TABLE IF NOT EXISTS gallery_photo_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES gallery_photos(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, photo_id, label)
);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_labels_user ON gallery_photo_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_labels_photo ON gallery_photo_labels(photo_id);
