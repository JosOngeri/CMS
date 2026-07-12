-- Role Hierarchy and Department-Specific Permissions

-- Add hierarchy to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent_role_id INTEGER REFERENCES roles(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB;

-- Update existing roles with hierarchy levels
UPDATE roles SET level = 5 WHERE name = 'Super Admin';
UPDATE roles SET level = 4 WHERE name = 'Pastor';
UPDATE roles SET level = 3 WHERE name = 'First Elder';
UPDATE roles SET level = 2 WHERE name = 'Department Head';
UPDATE roles SET level = 1 WHERE name = 'Member';

-- Set parent relationships
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Super Admin') WHERE name = 'Pastor';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Pastor') WHERE name = 'First Elder';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'First Elder') WHERE name = 'Department Head';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE name = 'Department Head') WHERE name = 'Member';

-- Add department-specific permissions table (only if departments table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') THEN
    CREATE TABLE IF NOT EXISTS department_permissions (
      id SERIAL PRIMARY KEY,
      department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      permissions JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(department_id, role_id)
    );

    CREATE INDEX IF NOT EXISTS idx_department_permissions_department_id ON department_permissions(department_id);
    CREATE INDEX IF NOT EXISTS idx_department_permissions_role_id ON department_permissions(role_id);

    COMMENT ON TABLE department_permissions IS 'Department-specific role permissions for granular access control';
  END IF;
END $$;

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);

-- Add comments for roles table
COMMENT ON COLUMN roles.parent_role_id IS 'Parent role for hierarchical role structure';
COMMENT ON COLUMN roles.level IS 'Role level in hierarchy (higher = more privileges)';
COMMENT ON COLUMN roles.permissions IS 'JSON object containing role permissions';