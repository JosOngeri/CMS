-- Create members and fix department_members for production DB
-- The cms_db on the VPS was created from an older schema and is missing
-- the members table and department_members.church_id.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  membership_status VARCHAR(50) DEFAULT 'active',
  joined_date TIMESTAMP,
  baptism_date DATE,
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(50),
  occupation VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  notes TEXT,
  church_id UUID NOT NULL,
  membership_number VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_synced_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_members_church_id FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_church_id ON members(church_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- Ensure department_members exists (may have been created by another schema)
CREATE TABLE IF NOT EXISTS department_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  department_id UUID NOT NULL,
  role VARCHAR(100),
  role_in_department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  requested_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  church_id UUID
);

-- Add church_id if the existing department_members table lacks it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_members' AND column_name = 'church_id'
  ) THEN
    ALTER TABLE department_members ADD COLUMN church_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_department_members_user_id ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_department_members_department_id ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_church_id ON department_members(church_id);
