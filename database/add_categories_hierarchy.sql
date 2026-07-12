-- Add support for categories and committee/subcommittee hierarchy

-- Create categories table for dynamic category management
CREATE TABLE IF NOT EXISTS department_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO department_categories (name, description, color) VALUES
('Leadership', 'Church leadership departments', '#8B5CF6'),
('Ministry', 'Ministry departments', '#3B82F6'),
('Education', 'Education departments', '#10B981'),
('Youth', 'Youth programs', '#F97316'),
('Support', 'Support ministries', '#6B7280'),
('Special', 'Special programs', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Add parent_department_id to departments for committee/subcommittee hierarchy
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Add is_committee flag to distinguish committees from regular departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_committee BOOLEAN DEFAULT false;

-- Add foreign key constraint for parent relationship
-- Note: This is already handled by the REFERENCES clause above

-- Create index for better performance on parent lookups
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_category ON departments(category);
