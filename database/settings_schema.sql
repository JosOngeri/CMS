-- Settings Schema for Global Site Configuration
-- This table stores site-wide settings that can be managed by admins

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json, color
    category VARCHAR(100) NOT NULL, -- general, appearance, contact, payment, sms, etc.
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Whether this setting can be accessed by non-admin users
    is_editable BOOLEAN DEFAULT TRUE, -- Whether this setting can be edited
    validation_rules JSONB, -- JSON object with validation rules (min, max, pattern, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER settings_updated_at_trigger
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Insert default settings
INSERT INTO settings (key, value, value_type, category, label, description, is_public, is_editable, validation_rules) VALUES
-- General Settings
('site_name', 'Kiserian Main SDA Church', 'string', 'general', 'Site Name', 'The name of the church website', TRUE, TRUE, '{"minLength": 2, "maxLength": 100}'),
('site_description', 'Welcome to Kiserian Main SDA Church', 'string', 'general', 'Site Description', 'A brief description of the church', TRUE, TRUE, '{"minLength": 10, "maxLength": 500}'),
('site_logo', '', 'string', 'general', 'Site Logo URL', 'URL to the church logo image', TRUE, TRUE, '{}'),
('site_favicon', '', 'string', 'general', 'Site Favicon URL', 'URL to the site favicon', FALSE, TRUE, '{}'),
('maintenance_mode', 'false', 'boolean', 'general', 'Maintenance Mode', 'Enable maintenance mode to take the site offline', FALSE, TRUE, '{}'),

-- Appearance Settings
('primary_color', '#10B981', 'color', 'appearance', 'Primary Color', 'Main theme color for the site', TRUE, TRUE, '{}'),
('secondary_color', '#3B82F6', 'color', 'appearance', 'Secondary Color', 'Secondary theme color for the site', TRUE, TRUE, '{}'),
('accent_color', '#F59E0B', 'color', 'appearance', 'Accent Color', 'Accent color for highlights', TRUE, TRUE, '{}'),
('background_color', '#FFFFFF', 'color', 'appearance', 'Background Color', 'Background color for the site', TRUE, TRUE, '{}'),
('text_color', '#1F2937', 'color', 'appearance', 'Text Color', 'Main text color', TRUE, TRUE, '{}'),
('font_family', 'Inter', 'string', 'appearance', 'Font Family', 'Default font family for the site', TRUE, TRUE, '{}'),

-- Contact Settings
('church_address', 'Kiserian, Kenya', 'string', 'contact', 'Church Address', 'Physical address of the church', TRUE, TRUE, '{}'),
('church_phone', '+254 700 000 000', 'string', 'contact', 'Church Phone', 'Main church phone number', TRUE, TRUE, '{"pattern": "^[+]?[0-9\\s\\-]+$"}'),
('church_email', 'info@kiseriansda.org', 'string', 'contact', 'Church Email', 'Main church email address', TRUE, TRUE, '{"pattern": "^[\\w\\-\\.]+@[\\w\\-\\.]+\\.[a-zA-Z]{2,}$"}'),
('church_website', 'https://kiseriansda.org', 'string', 'contact', 'Church Website', 'Main church website URL', TRUE, TRUE, '{"pattern": "^https?://.+$"}'),

-- Social Media Settings
('facebook_url', '', 'string', 'social', 'Facebook URL', 'Facebook page URL', TRUE, TRUE, '{}'),
('twitter_url', '', 'string', 'social', 'Twitter URL', 'Twitter profile URL', TRUE, TRUE, '{}'),
('instagram_url', '', 'string', 'social', 'Instagram URL', 'Instagram profile URL', TRUE, TRUE, '{}'),
('youtube_url', '', 'string', 'social', 'YouTube URL', 'YouTube channel URL', TRUE, TRUE, '{}'),

-- Payment Settings
('mpesa_shortcode', '', 'string', 'payment', 'M-Pesa Shortcode', 'M-Pesa Paybill or Till Number', FALSE, TRUE, '{"pattern": "^[0-9]+$"}'),
('mpesa_passkey', '', 'string', 'payment', 'M-Pesa Passkey', 'M-Pesa API Passkey (encrypted)', FALSE, TRUE, '{}'),
('mpesa_environment', 'sandbox', 'string', 'payment', 'M-Pesa Environment', 'Sandbox or Production environment', FALSE, TRUE, '{"enum": ["sandbox", "production"]}'),
('default_tithe_amount', '100', 'number', 'payment', 'Default Tithe Amount', 'Default suggested tithe amount', TRUE, TRUE, '{"min": 1, "max": 100000}'),

-- SMS Settings
('sms_provider', 'at', 'string', 'sms', 'SMS Provider', 'SMS service provider (at, africaistalking, etc.)', FALSE, TRUE, '{}'),
('sms_api_key', '', 'string', 'sms', 'SMS API Key', 'API key for SMS provider', FALSE, TRUE, '{}'),
('sms_sender_id', 'KISERIAN', 'string', 'sms', 'SMS Sender ID', 'Sender ID for outgoing SMS messages', FALSE, TRUE, '{}'),
('sms_enabled', 'true', 'boolean', 'sms', 'SMS Enabled', 'Enable or disable SMS functionality', FALSE, TRUE, '{}'),

-- Service Settings
('saturday_service_time', '09:00', 'string', 'service', 'Saturday Service Time', 'Saturday worship service time', TRUE, TRUE, '{"pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('wednesday_service_time', '18:00', 'string', 'service', 'Wednesday Service Time', 'Wednesday prayer meeting time', TRUE, TRUE, '{"pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('pastor_name', 'Pastor Name', 'string', 'service', 'Pastor Name', 'Name of the senior pastor', TRUE, TRUE, '{}'),

-- Feature Flags
('enable_treasury', 'true', 'boolean', 'features', 'Enable Treasury', 'Enable treasury accounting module', FALSE, TRUE, '{}'),
('enable_events', 'true', 'boolean', 'features', 'Enable Events', 'Enable events module', TRUE, TRUE, '{}'),
('enable_announcements', 'true', 'boolean', 'features', 'Enable Announcements', 'Enable announcements module', TRUE, TRUE, '{}'),
('enable_live_stream', 'false', 'boolean', 'features', 'Enable Live Stream', 'Enable live streaming feature', TRUE, TRUE, '{}')
ON CONFLICT (key) DO NOTHING;

-- Create a view for public settings (accessible by non-admin users)
CREATE OR REPLACE VIEW public_settings AS
SELECT key, value, value_type, label, description
FROM settings
WHERE is_public = TRUE;
