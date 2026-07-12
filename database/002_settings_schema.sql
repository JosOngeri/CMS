-- SETTINGS Module Database Schema

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL DEFAULT 'string',
  category VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  status VARCHAR(50) DEFAULT 'scheduled',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable) VALUES
  -- Website settings
  ('site_name', 'Kiserian Main SDA Church', 'string', 'website', 'Site Name', 'The name of the website', true, true),
  ('site_description', 'Welcome to Kiserian Main SDA Church', 'string', 'website', 'Site Description', 'Site description for SEO', true, true),
  ('contact_email', 'info@kiseriansda.org', 'string', 'website', 'Contact Email', 'Main contact email', true, true),
  ('contact_phone', '+254 700 000 000', 'string', 'website', 'Contact Phone', 'Main contact phone', true, true),
  
  -- Theme settings
  ('primary_color', '#3b82f6', 'color', 'theme', 'Primary Color', 'Main theme color', true, true),
  ('secondary_color', '#8b5cf6', 'color', 'theme', 'Secondary Color', 'Secondary theme color', true, true),
  ('background_color', '#f8fafc', 'color', 'theme', 'Background Color', 'Page background color', true, true),
  ('text_color', '#1e293b', 'color', 'theme', 'Text Color', 'Main text color', true, true),
  
  -- Feature flags
  ('enable_registration', 'true', 'boolean', 'features', 'Enable Registration', 'Allow new user registration', true, true),
  ('enable_gallery', 'true', 'boolean', 'features', 'Enable Gallery', 'Enable photo gallery', true, true),
  ('enable_announcements', 'true', 'boolean', 'features', 'Enable Announcements', 'Enable announcements module', true, true),
  
  -- System settings
  ('maintenance_mode', 'false', 'boolean', 'system', 'Maintenance Mode', 'Put site in maintenance mode', false, true),
  ('max_upload_size', '10485760', 'number', 'system', 'Max Upload Size', 'Maximum file upload size in bytes', false, true)
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_public ON settings(is_public);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
