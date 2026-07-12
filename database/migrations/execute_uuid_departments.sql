-- Phase 4: Execute UUID Migration for Departments
-- This script converts departments from SERIAL to UUID primary keys

BEGIN;

-- 1. Add new UUID column to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();

-- 2. Backfill new_id with UUIDs for existing rows
UPDATE departments SET new_id = uuid_generate_v4() WHERE new_id IS NULL;

-- 3. Add new UUID columns to foreign key tables
ALTER TABLE department_members ADD COLUMN IF NOT EXISTS new_department_id UUID;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS new_department_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS new_department_id UUID;

-- 4. Update foreign key references to use new_id
UPDATE department_members SET new_department_id = d.new_id 
FROM departments d WHERE department_members.department_id = d.id;

UPDATE announcements SET new_department_id = d.new_id 
FROM departments d WHERE announcements.department_id = d.id;

UPDATE events SET new_department_id = d.new_id 
FROM departments d WHERE events.department_id = d.id;

-- 5. Drop foreign key constraints
ALTER TABLE department_members DROP CONSTRAINT IF EXISTS department_members_department_id_fkey;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_department_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_department_id_fkey;

-- 6. Drop old columns
ALTER TABLE department_members DROP COLUMN IF EXISTS department_id;
ALTER TABLE announcements DROP COLUMN IF EXISTS department_id;
ALTER TABLE events DROP COLUMN IF EXISTS department_id;

-- 7. Rename new columns to final names
ALTER TABLE department_members RENAME COLUMN new_department_id TO department_id;
ALTER TABLE announcements RENAME COLUMN new_department_id TO department_id;
ALTER TABLE events RENAME COLUMN new_department_id TO department_id;

-- 8. Re-add foreign key constraints with UUID
ALTER TABLE department_members ADD CONSTRAINT department_members_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE announcements ADD CONSTRAINT announcements_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE events ADD CONSTRAINT events_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- 9. Drop primary key constraint from departments
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_pkey;

-- 10. Drop old id column
ALTER TABLE departments DROP COLUMN IF EXISTS id;

-- 11. Rename new_id to id
ALTER TABLE departments RENAME COLUMN new_id TO id;

-- 12. Add primary key constraint
ALTER TABLE departments ADD PRIMARY KEY (id);

-- 13. Create index for performance
CREATE INDEX IF NOT EXISTS idx_departments_id ON departments(id);

COMMIT;

-- Verification query (run separately to verify)
-- SELECT id FROM departments LIMIT 5;
