-- Phase 4: Execute UUID Migration for Remaining Tables (FINAL)
-- This script converts settings, permissions, and telegram_photos_cache from INTEGER to UUID
-- These tables have no foreign key constraints, so they can be migrated independently

BEGIN;

-- 1. Standardize settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE settings SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings DROP COLUMN IF EXISTS id;
ALTER TABLE settings RENAME COLUMN new_id TO id;
ALTER TABLE settings ADD PRIMARY KEY (id);

-- 2. Standardize permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE permissions SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- Update foreign key references in role_permissions
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS new_permission_id UUID;
UPDATE role_permissions SET new_permission_id = p.new_id
FROM permissions p WHERE role_permissions.permission_id = p.id AND p.new_id IS NOT NULL;

-- Handle orphaned records
UPDATE role_permissions SET new_permission_id = NULL WHERE new_permission_id IS NULL AND permission_id IS NOT NULL;

-- Drop constraints
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE role_permissions DROP COLUMN IF EXISTS permission_id;
ALTER TABLE role_permissions RENAME COLUMN new_permission_id TO permission_id;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

-- Finalize permissions
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE permissions DROP COLUMN IF EXISTS id;
ALTER TABLE permissions RENAME COLUMN new_id TO id;
ALTER TABLE permissions ADD PRIMARY KEY (id);

-- 3. Standardize telegram_photos_cache
ALTER TABLE telegram_photos_cache ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE telegram_photos_cache SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE telegram_photos_cache DROP CONSTRAINT IF EXISTS telegram_photos_cache_pkey;
ALTER TABLE telegram_photos_cache DROP COLUMN IF EXISTS id;
ALTER TABLE telegram_photos_cache RENAME COLUMN new_id TO id;
ALTER TABLE telegram_photos_cache ADD PRIMARY KEY (id);

COMMIT;

-- Verification queries (run separately to verify)
-- SELECT id FROM settings LIMIT 5;
-- SELECT id FROM permissions LIMIT 5;
-- SELECT id FROM telegram_photos_cache LIMIT 5;
