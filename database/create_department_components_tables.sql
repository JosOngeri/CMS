-- Department Components System Migration
-- This migration creates tables for the shared components system

-- Component Registry Table
CREATE TABLE IF NOT EXISTS department_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- choir, music, events, volunteers, inventory, attendance, budget
  description TEXT,
  is_global BOOLEAN DEFAULT false, -- Available to all by default
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Component Allocation Table
CREATE TABLE IF NOT EXISTS department_component_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(component_id, department_id)
);

-- Choir Component Data Table
CREATE TABLE IF NOT EXISTS choir_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  member_name VARCHAR(100) NOT NULL,
  voice_part VARCHAR(50), -- Soprano, Alto, Tenor, Bass
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Music Library Component Data Table
CREATE TABLE IF NOT EXISTS music_library_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  composer VARCHAR(100),
  arrangement VARCHAR(100),
  category VARCHAR(50), -- hymn, anthem, contemporary, etc.
  file_url VARCHAR(500),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Planning Component Data Table
CREATE TABLE IF NOT EXISTS event_planning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  event_name VARCHAR(200) NOT NULL,
  budget_amount DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  vendor_name VARCHAR(100),
  vendor_contact VARCHAR(100),
  status VARCHAR(50) DEFAULT 'planning', -- planning, confirmed, completed, cancelled
  event_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Volunteer Management Component Data Table
CREATE TABLE IF NOT EXISTS volunteer_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  volunteer_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  skills TEXT[],
  availability TEXT[], -- JSON array of available times
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Inventory Component Data Table
CREATE TABLE IF NOT EXISTS inventory_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  item_type VARCHAR(50), -- equipment, supplies, instruments, etc.
  quantity INTEGER DEFAULT 0,
  location VARCHAR(100),
  condition VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor
  last_checked TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Tracking Component Data Table
CREATE TABLE IF NOT EXISTS attendance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  event_name VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  attendee_count INTEGER DEFAULT 0,
  attendee_names TEXT[], -- Array of attendee names
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget Management Component Data Table
CREATE TABLE IF NOT EXISTS budget_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  budget_amount DECIMAL(10, 2) NOT NULL,
  spent_amount DECIMAL(10, 2) DEFAULT 0,
  fiscal_year INTEGER NOT NULL,
  month INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_department_components_type ON department_components(type);
CREATE INDEX IF NOT EXISTS idx_department_component_allocations_component ON department_component_allocations(component_id);
CREATE INDEX IF NOT EXISTS idx_department_component_allocations_department ON department_component_allocations(department_id);
CREATE INDEX IF NOT EXISTS idx_choir_data_department ON choir_data(department_id);
CREATE INDEX IF NOT EXISTS idx_music_library_data_department ON music_library_data(department_id);
CREATE INDEX IF NOT EXISTS idx_event_planning_data_department ON event_planning_data(department_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_data_department ON volunteer_data(department_id);
CREATE INDEX IF NOT EXISTS idx_inventory_data_department ON inventory_data(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_data_department ON attendance_data(department_id);
CREATE INDEX IF NOT EXISTS idx_budget_data_department ON budget_data(department_id);

-- Insert sample components
INSERT INTO department_components (name, type, description, is_global) VALUES
('Choir Management', 'choir', 'Manage choir members, voice parts, and participation', false),
('Music Library', 'music', 'Sheet music, recordings, and musical resources', false),
('Event Planning', 'events', 'Budget, vendors, and logistics for events', false),
('Volunteer Management', 'volunteers', 'Scheduling and availability tracking for volunteers', false),
('Resource Inventory', 'inventory', 'Equipment, supplies, and asset tracking', false),
('Attendance Tracking', 'attendance', 'Meeting and event attendance records', false),
('Budget Management', 'budget', 'Income, expenses, and financial reports', false)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_department_components_updated_at BEFORE UPDATE ON department_components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();