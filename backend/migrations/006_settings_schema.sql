-- Settings table migration
-- This migration creates the settings table for storing application configuration

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  value_type VARCHAR(50) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'color')),
  category VARCHAR(100) DEFAULT 'general',
  label VARCHAR(255),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Create index on is_public for public settings queries
CREATE INDEX IF NOT EXISTS idx_settings_public ON settings(is_public);

-- Insert default settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable) VALUES
  -- General Settings
  ('site_name', 'Kiserian SDA Church', 'string', 'general', 'Site Name', 'The name of the church website', true, true),
  ('site_description', 'Welcome to Kiserian Seventh-day Adventist Church', 'string', 'general', 'Site Description', 'Description of the church website', true, true),
  ('contact_email', 'info@kiseriansda.org', 'string', 'general', 'Contact Email', 'Main contact email address', true, true),
  ('contact_phone', '+254700000000', 'string', 'general', 'Contact Phone', 'Main contact phone number', true, true),
  ('address', 'Kiserian, Kenya', 'string', 'general', 'Address', 'Church physical address', true, true),
  
  -- Appearance Settings
  ('primary_color', '#3b82f6', 'color', 'appearance', 'Primary Color', 'Primary theme color', true, true),
  ('secondary_color', '#10b981', 'color', 'appearance', 'Secondary Color', 'Secondary theme color', true, true),
  ('background_color', '#ffffff', 'color', 'appearance', 'Background Color', 'Background color', true, true),
  ('text_color', '#1f2937', 'color', 'appearance', 'Text Color', 'Text color', true, true),
  ('dark_mode', 'false', 'boolean', 'appearance', 'Dark Mode', 'Enable dark mode by default', true, true),
  
  -- Member Settings
  ('member_auto_id', 'true', 'boolean', 'members', 'Auto-generate Member IDs', 'Automatically generate member IDs', false, true),
  ('member_id_prefix', 'KSDA', 'string', 'members', 'Member ID Prefix', 'Prefix for member IDs', false, true),
  
  -- SMS Settings
  ('sms_enabled', 'false', 'boolean', 'sms', 'SMS Enabled', 'Enable SMS functionality', false, true),
  ('sms_provider', 'africastalking', 'string', 'sms', 'SMS Provider', 'SMS service provider', false, true),
  ('sms_api_key', '', 'string', 'sms', 'SMS API Key', 'API key for SMS provider', false, true),
  ('sms_sender_id', 'KSDA', 'string', 'sms', 'SMS Sender ID', 'Sender ID for SMS messages', false, true),
  
  -- Notification Settings
  ('email_notifications', 'true', 'boolean', 'notifications', 'Email Notifications', 'Enable email notifications', false, true),
  ('sms_notifications', 'false', 'boolean', 'notifications', 'SMS Notifications', 'Enable SMS notifications', false, true),
  
  -- Security Settings
  ('session_timeout', '30', 'number', 'security', 'Session Timeout (minutes)', 'Session timeout in minutes', false, true),
  ('password_min_length', '8', 'number', 'security', 'Minimum Password Length', 'Minimum password length', false, true),
  ('require_2fa', 'false', 'boolean', 'security', 'Require 2FA', 'Require two-factor authentication', false, true),
  
  -- SEO Settings
  ('meta_title', 'Kiserian SDA Church', 'string', 'seo', 'Meta Title', 'Default meta title', true, true),
  ('meta_description', 'Welcome to Kiserian Seventh-day Adventist Church', 'string', 'seo', 'Meta Description', 'Default meta description', true, true),
  ('meta_keywords', 'SDA, church, Kiserian, Seventh-day Adventist', 'string', 'seo', 'Meta Keywords', 'Default meta keywords', true, true),
  
  -- Feature Flags
  ('FEATURE_SETTINGS_USE_ALTERNATIVE', 'false', 'boolean', 'feature-flags', 'Settings Alternative UI', 'Use alternative settings interface', false, false)
ON CONFLICT (key) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
