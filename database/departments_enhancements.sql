-- DEPARTMENTS Module Enhancements

-- Add missing columns to existing tables if they don't exist
DO $$
BEGIN
  -- Check if table exists and add columns if missing
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') THEN
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget_allocation NUMERIC DEFAULT 0;
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS meeting_schedule TEXT;
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;
END $$;

-- Department resources table
CREATE TABLE IF NOT EXISTS department_resources (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'document', 'link', 'equipment', 'space'
  description TEXT,
  url VARCHAR(500),
  file_path VARCHAR(500),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department activities table (if not exists)
CREATE TABLE IF NOT EXISTS department_activities (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_department_resources_department_id ON department_resources(department_id);
CREATE INDEX IF NOT EXISTS idx_department_resources_type ON department_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_department_activities_department_id ON department_activities(department_id);
CREATE INDEX IF NOT EXISTS idx_department_activities_user_id ON department_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_department_activities_created_at ON department_activities(created_at);

-- Add comments
COMMENT ON TABLE department_resources IS 'Shared resources managed by departments';
COMMENT ON TABLE department_activities IS 'Activity feed tracking department actions and changes';