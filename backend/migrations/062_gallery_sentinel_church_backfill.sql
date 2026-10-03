-- L775: migration 004 stamped pre-existing gallery rows with the sentinel
-- church_id '00000000-0000-0000-0000-000000000000', which matches no tenant —
-- those albums/photos are invisible to every church. Reassign them to the
-- oldest real church (the original single-tenant owner), following the same
-- fallback pattern used by 046_treasury_schema_backfill.sql. Rows already
-- owned by a real church are untouched, so this is safe to re-run.
UPDATE gallery_albums
SET church_id = (
  SELECT id FROM churches ORDER BY created_at NULLS LAST LIMIT 1
)
WHERE church_id = '00000000-0000-0000-0000-000000000000';

UPDATE gallery_photos
SET church_id = (
  SELECT id FROM churches ORDER BY created_at NULLS LAST LIMIT 1
)
WHERE church_id = '00000000-0000-0000-0000-000000000000';
