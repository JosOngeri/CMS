-- Phase 4: Database UUID Standardization
-- Convert SERIAL/INTEGER PKs to UUID v4 for consistency and multi-tenancy

-- 1. Standardize DEPARTMENTS
ALTER TABLE departments ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE department_members ADD COLUMN new_department_id UUID;
ALTER TABLE announcements ADD COLUMN new_department_id UUID;
ALTER TABLE events ADD COLUMN new_department_id UUID;

-- (Logic to sync new_id across tables would go here in a live migration)

-- 2. Standardize USERS (if mixed, but schema.sql says UUID already)
-- If some tables use INTEGER user_id, they need conversion.
ALTER TABLE department_members ADD COLUMN new_user_id UUID;
ALTER TABLE announcements ADD COLUMN new_author_id UUID;
ALTER TABLE events ADD COLUMN new_organizer_id UUID;
ALTER TABLE payments ADD COLUMN new_member_id UUID;

-- 3. Finalize Primary Keys
-- After data migration:
-- ALTER TABLE departments DROP CONSTRAINT departments_pkey CASCADE;
-- ALTER TABLE departments DROP COLUMN id;
-- ALTER TABLE departments RENAME COLUMN new_id TO id;
-- ALTER TABLE departments ADD PRIMARY KEY (id);

-- This script serves as the blueprint for the UUID migration.
