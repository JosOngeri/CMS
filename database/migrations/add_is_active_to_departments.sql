-- Migration: Add is_active column to departments table
-- This is needed for batch activation/deactivation operations

-- Add is_active column with default value of true
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN departments.is_active IS 'Indicates whether the department is currently active';

-- Update existing departments to be active by default
UPDATE departments 
SET is_active = true 
WHERE is_active IS NULL;

-- Create an index for faster filtering by active status
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
