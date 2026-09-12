-- Allow the same department names across churches (multi-tenant).
-- The original single-tenant schema made departments.name globally UNIQUE,
-- which prevents two churches from both having e.g. a "Children" department.
-- Uniqueness is enforced per-church via (slug, church_id) or globally on slug.

ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_unique;
DROP INDEX IF EXISTS departments_name_unique;

-- Ensure per-church slug uniqueness for upserts
CREATE UNIQUE INDEX IF NOT EXISTS departments_slug_church_key
  ON departments (slug, church_id);

-- users.church_slug exists in production but may be missing locally
ALTER TABLE users ADD COLUMN IF NOT EXISTS church_slug VARCHAR(100);

-- members columns present in production but missing in older local schema
ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_number VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- department_members.church_id exists in production but may be missing locally
ALTER TABLE department_members ADD COLUMN IF NOT EXISTS church_id UUID;
