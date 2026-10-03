-- Phase 4: Execute UUID Migration for Settings and Telegram Cache
-- These tables have no foreign key constraints

BEGIN;

-- 1. Standardize settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE settings SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings DROP COLUMN IF EXISTS id;
ALTER TABLE settings RENAME COLUMN new_id TO id;
ALTER TABLE settings ADD PRIMARY KEY (id);

-- 2. Standardize telegram_photos_cache
ALTER TABLE telegram_photos_cache ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE telegram_photos_cache SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE telegram_photos_cache DROP CONSTRAINT IF EXISTS telegram_photos_cache_pkey;
ALTER TABLE telegram_photos_cache DROP COLUMN IF EXISTS id;
ALTER TABLE telegram_photos_cache RENAME COLUMN new_id TO id;
ALTER TABLE telegram_photos_cache ADD PRIMARY KEY (id);

COMMIT;

-- Verification queries (run separately to verify)
-- SELECT id FROM settings LIMIT 5;
-- SELECT id FROM telegram_photos_cache LIMIT 5;
