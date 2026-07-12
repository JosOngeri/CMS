-- Phase 4: Execute UUID Migration for Permissions (FIXED)
-- This script converts permissions and role_permissions to UUID

BEGIN;

-- 1. Standardize permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
UPDATE permissions SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE permissions DROP COLUMN IF EXISTS id;
ALTER TABLE permissions RENAME COLUMN new_id TO id;
ALTER TABLE permissions ADD PRIMARY KEY (id);

-- 2. Update role_permissions.permission_id to UUID
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS new_permission_id UUID;
UPDATE role_permissions SET new_permission_id = p.id
FROM permissions p WHERE role_permissions.permission_id::text = p.id::text AND role_permissions.permission_id IS NOT NULL;

-- Handle orphaned records
UPDATE role_permissions SET new_permission_id = NULL WHERE new_permission_id IS NULL AND permission_id IS NOT NULL;

-- Drop old FK constraint if exists
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;

-- Drop old column and rename new one
ALTER TABLE role_permissions DROP COLUMN IF EXISTS permission_id;
ALTER TABLE role_permissions RENAME COLUMN new_permission_id TO permission_id;

-- Add new FK constraint with UUID
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

COMMIT;

-- Verification queries (run separately to verify)
-- SELECT id FROM permissions LIMIT 5;
-- SELECT permission_id FROM role_permissions LIMIT 5;
