-- Phase 4: UUID Standardization for DEPARTMENTS
-- Objective: Convert departments and all related tables to UUID v4

BEGIN;

-- 1. Create temporary UUID columns
ALTER TABLE departments ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE department_members ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE department_members ADD COLUMN new_department_id UUID;
ALTER TABLE department_members ADD COLUMN new_user_id UUID; -- Assuming users might be serial too, let's check.
-- Wait, schema.sql says users.id is UUID. So only FK needs updating.

-- 2. Backfill FK references
UPDATE department_members dm
SET new_department_id = d.new_id
FROM departments d
WHERE dm.department_id = d.id;

-- 3. Standardize Related Tables
ALTER TABLE department_communications ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE department_communications ADD COLUMN new_department_id UUID;
UPDATE department_communications dc SET new_department_id = d.new_id FROM departments d WHERE dc.department_id = d.id;

ALTER TABLE department_meetings ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE department_meetings ADD COLUMN new_department_id UUID;
UPDATE department_meetings dm SET new_department_id = d.new_id FROM departments d WHERE dm.department_id = d.id;

-- 4. Finalize Primary Keys (Departments)
ALTER TABLE department_members DROP CONSTRAINT IF EXISTS department_members_department_id_fkey;
ALTER TABLE department_communications DROP CONSTRAINT IF EXISTS department_communications_department_id_fkey;
ALTER TABLE department_meetings DROP CONSTRAINT IF EXISTS department_meetings_department_id_fkey;

ALTER TABLE departments DROP CONSTRAINT departments_pkey CASCADE;
ALTER TABLE departments DROP COLUMN id;
ALTER TABLE departments RENAME COLUMN new_id TO id;
ALTER TABLE departments ADD PRIMARY KEY (id);

-- 5. Finalize Foreign Keys and child PKs
ALTER TABLE department_members DROP COLUMN department_id;
ALTER TABLE department_members RENAME COLUMN new_department_id TO department_id;
ALTER TABLE department_members ADD CONSTRAINT department_members_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);

-- Standardize department_members PK
ALTER TABLE department_members DROP CONSTRAINT IF EXISTS department_members_pkey;
ALTER TABLE department_members DROP COLUMN id;
ALTER TABLE department_members RENAME COLUMN new_id TO id;
ALTER TABLE department_members ADD PRIMARY KEY (id);

COMMIT;
