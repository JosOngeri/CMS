-- Department Advanced Features Migration
-- Adds permissions, activity feed, branding, and budget tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Department Permissions
CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin', 'manage_members', 'manage_budget'
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, user_id, permission)
);

-- Department Activities
CREATE TABLE IF NOT EXISTS department_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department Settings
CREATE TABLE IF NOT EXISTS department_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, setting_key)
);

-- Add branding columns to departments table if they don't exist
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS logo VARCHAR(500),
ADD COLUMN IF NOT EXISTS banner VARCHAR(500),
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_department_permissions_dept ON department_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_department_permissions_user ON department_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_department_activities_dept ON department_activities(department_id);
CREATE INDEX IF NOT EXISTS idx_department_activities_user ON department_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_department_activities_created ON department_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_department_settings_dept ON department_settings(department_id);
CREATE INDEX IF NOT EXISTS idx_department_settings_key ON department_settings(setting_key);

-- Add comments
COMMENT ON TABLE department_permissions IS 'Department-specific user permissions';
COMMENT ON TABLE department_activities IS 'Activity feed for department actions';
COMMENT ON TABLE department_settings IS 'Department-specific settings and preferences';
COMMENT ON COLUMN departments.logo IS 'Department logo image URL';
COMMENT ON COLUMN departments.banner IS 'Department banner image URL';
COMMENT ON COLUMN departments.primary_color IS 'Department primary theme color';
COMMENT ON COLUMN departments.secondary_color IS 'Department secondary theme color';
