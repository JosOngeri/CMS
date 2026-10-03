-- 061_missing_column_patches.sql
-- Columns the application code queries but no canonical migration provides.
-- (Found by the resurrected e2e suite: departments.is_active -> 500 on
-- GET /api/departments; gallery_albums.church_slug -> 500 on album create.)

ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE gallery_albums ADD COLUMN IF NOT EXISTS church_slug VARCHAR(100);

-- Backfill church_slug from the parent church for existing rows.
UPDATE gallery_albums ga
SET church_slug = c.slug
FROM churches c
WHERE ga.church_id = c.id AND ga.church_slug IS NULL;
