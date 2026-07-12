-- Permissions and role permissions schema
-- Create missing permissions tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns for existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permissions' AND column_name = 'category'
  ) THEN
    ALTER TABLE permissions ADD COLUMN category VARCHAR(100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permissions' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE permissions ADD COLUMN church_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_church_id ON permissions(church_id);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  -- User management
  ('users.view', 'View users', 'users'),
  ('users.create', 'Create users', 'users'),
  ('users.edit', 'Edit users', 'users'),
  ('users.delete', 'Delete users', 'users'),
  
  -- Member management
  ('members.view', 'View members', 'members'),
  ('members.create', 'Create members', 'members'),
  ('members.edit', 'Edit members', 'members'),
  ('members.delete', 'Delete members', 'members'),
  
  -- Department management
  ('departments.view', 'View departments', 'departments'),
  ('departments.create', 'Create departments', 'departments'),
  ('departments.edit', 'Edit departments', 'departments'),
  ('departments.delete', 'Delete departments', 'departments'),
  
  -- Treasury management
  ('treasury.view', 'View treasury', 'treasury'),
  ('treasury.create', 'Create treasury records', 'treasury'),
  ('treasury.edit', 'Edit treasury records', 'treasury'),
  ('treasury.delete', 'Delete treasury records', 'treasury'),
  
  -- Content management
  ('content.view', 'View content', 'content'),
  ('content.create', 'Create content', 'content'),
  ('content.edit', 'Edit content', 'content'),
  ('content.delete', 'Delete content', 'content'),
  ('content.publish', 'Publish content', 'content'),
  
  -- Settings management
  ('settings.view', 'View settings', 'settings'),
  ('settings.edit', 'Edit settings', 'settings'),
  
  -- SMS management
  ('sms.view', 'View SMS', 'sms'),
  ('sms.create', 'Create SMS', 'sms'),
  ('sms.send', 'Send SMS', 'sms'),
  
  -- Gallery management
  ('gallery.view', 'View gallery', 'gallery'),
  ('gallery.create', 'Create gallery items', 'gallery'),
  ('gallery.edit', 'Edit gallery items', 'gallery'),
  ('gallery.delete', 'Delete gallery items', 'gallery'),
  
  -- Event management
  ('events.view', 'View events', 'events'),
  ('events.create', 'Create events', 'events'),
  ('events.edit', 'Edit events', 'events'),
  ('events.delete', 'Delete events', 'events'),
  
  -- Reports
  ('reports.view', 'View reports', 'reports'),
  ('reports.export', 'Export reports', 'reports')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to Super Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic permissions to Pastor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Pastor' AND p.category IN ('users', 'members', 'departments', 'treasury', 'content', 'events', 'reports')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic permissions to First Elder role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'First Elder' AND p.category IN ('members', 'departments', 'treasury', 'content', 'events')
ON CONFLICT (role_id, permission_id) DO NOTHING;
