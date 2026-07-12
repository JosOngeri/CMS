-- Migration: Add approval status to department_members table
-- This enables the approval workflow for department membership

-- Add status column to track approval state
ALTER TABLE department_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add comment explaining the column
COMMENT ON COLUMN department_members.status IS 'Membership status: pending, approved, or rejected';

-- Add approved_at column to track when approval happened
ALTER TABLE department_members 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add approved_by column to track who approved the request
ALTER TABLE department_members 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Add comments
COMMENT ON COLUMN department_members.approved_at IS 'Timestamp when membership was approved';
COMMENT ON COLUMN department_members.approved_by IS 'User ID of the person who approved this membership';

-- Update existing active memberships to be approved
UPDATE department_members 
SET status = 'approved', approved_at = CURRENT_TIMESTAMP
WHERE is_active = true AND status IS NULL;

-- Update existing inactive memberships to be rejected
UPDATE department_members 
SET status = 'rejected'
WHERE is_active = false AND status IS NULL;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_department_members_status ON department_members(status);

-- Create index for faster filtering by pending approvals
CREATE INDEX IF NOT EXISTS idx_department_members_pending ON department_members(status) WHERE status = 'pending';
