-- Migration: Add is_active column to department_members table
-- This is needed for tracking active/inactive department memberships

-- Add is_active column with default value of true
ALTER TABLE department_members 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN department_members.is_active IS 'Indicates whether the membership is currently active';

-- Update existing memberships to be active by default
UPDATE department_members 
SET is_active = true 
WHERE is_active IS NULL;

-- Create an index for faster filtering by active status
CREATE INDEX IF NOT EXISTS idx_department_members_is_active ON department_members(is_active);

-- Add role column if it doesn't exist (used by some queries)
ALTER TABLE department_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Member';

-- Update existing role_in_department to role if role is null
UPDATE department_members 
SET role = role_in_department 
WHERE role IS NULL AND role_in_department IS NOT NULL;

-- Set default role for any remaining null values
UPDATE department_members 
SET role = 'Member' 
WHERE role IS NULL;
