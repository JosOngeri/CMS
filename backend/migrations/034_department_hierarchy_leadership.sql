-- Migration 034: Department hierarchy + leadership/handover + temporary access
-- Implements docs/plans/sda-departments-seed-plan.md

-- 1. Department hierarchy (folds database/add_categories_hierarchy.sql into migrations)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_committee BOOLEAN DEFAULT false;
-- Columns used by routes but missing on some deployments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS church_slug VARCHAR(100);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS leader_name VARCHAR(200);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS leader_contact VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
-- Slug uniqueness is per-church (multi-tenant) — drop the legacy global-unique constraint/index
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_slug_key;
DROP INDEX IF EXISTS departments_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS departments_slug_church_key ON departments(slug, church_id);

-- department_permissions does not exist on all deployments — create it first
CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL, -- 'read','write','admin','manage_members','manage_budget'
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, user_id)
);

-- department_activities does not exist on all deployments
CREATE TABLE IF NOT EXISTS department_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_department_activities_dept ON department_activities(department_id);

-- user_roles multi-tenancy support
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by UUID;

-- 2. Temporary access on department_permissions
ALTER TABLE department_permissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE department_permissions ADD COLUMN IF NOT EXISTS granted_by UUID;
ALTER TABLE department_permissions ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_department_permissions_expiry
  ON department_permissions(expires_at) WHERE is_temporary = true;

-- 3. Department leadership — one row per appointed position
CREATE TABLE IF NOT EXISTS department_leadership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position VARCHAR(30) NOT NULL,                 -- head | assistant | secretary | acting_head | subcommittee_head
  allocation_type VARCHAR(20) NOT NULL DEFAULT 'permanent', -- permanent | temporary
  start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMPTZ,                          -- NULL = permanent
  appointed_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  handover_id UUID,
  subcommittee_id UUID REFERENCES department_subcommittees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- one row per (dept, user, position); NULL subcommittee_id needs partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_dept_leadership_dept
  ON department_leadership(department_id, user_id, position)
  WHERE subcommittee_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dept_leadership_sub
  ON department_leadership(department_id, user_id, position, subcommittee_id)
  WHERE subcommittee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dept_leadership_dept ON department_leadership(department_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dept_leadership_user ON department_leadership(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dept_leadership_expiry ON department_leadership(end_date)
  WHERE is_active = true AND end_date IS NOT NULL;

-- 4. Department handovers
CREATE TABLE IF NOT EXISTS department_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  outgoing_user_id UUID REFERENCES users(id),
  incoming_user_id UUID NOT NULL REFERENCES users(id),
  position VARCHAR(30) NOT NULL DEFAULT 'head',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | accepted | completed | declined | cancelled
  handover_date TIMESTAMPTZ,
  checklist JSONB DEFAULT '{}'::jsonb,            -- records, funds_assets, pending_programs, keys_logins, member_roster
  notes TEXT,
  initiated_by UUID REFERENCES users(id),
  subcommittee_id UUID REFERENCES department_subcommittees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dept_handovers_dept ON department_handovers(department_id, status);
CREATE INDEX IF NOT EXISTS idx_dept_handovers_incoming ON department_handovers(incoming_user_id, status);
CREATE INDEX IF NOT EXISTS idx_dept_handovers_outgoing ON department_handovers(outgoing_user_id, status);

-- handover_id back-reference on leadership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'department_leadership' AND constraint_name = 'fk_leadership_handover'
  ) THEN
    ALTER TABLE department_leadership
      ADD CONSTRAINT fk_leadership_handover
      FOREIGN KEY (handover_id) REFERENCES department_handovers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Subcommittee-scoped finance columns
ALTER TABLE department_budgets   ADD COLUMN IF NOT EXISTS subcommittee_id UUID REFERENCES department_subcommittees(id) ON DELETE SET NULL;
ALTER TABLE event_collections    ADD COLUMN IF NOT EXISTS subcommittee_id UUID REFERENCES department_subcommittees(id) ON DELETE SET NULL;
ALTER TABLE department_programs  ADD COLUMN IF NOT EXISTS subcommittee_id UUID REFERENCES department_subcommittees(id) ON DELETE SET NULL;

-- 6. New roles (level column comes from database/role_hierarchy.sql; ensure it exists)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO roles (name, description, level)
SELECT 'Assistant Department Head', 'Assistant head of a church department', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Assistant Department Head');

INSERT INTO roles (name, description, level)
SELECT 'Church Board Member', 'Member of the church board', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Church Board Member');

INSERT INTO roles (name, description, level)
SELECT 'Subcommittee Head', 'Head of a department subcommittee', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Subcommittee Head');
