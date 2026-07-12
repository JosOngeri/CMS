-- SMS Module Database Schema

-- SMS providers table
CREATE TABLE IF NOT EXISTS sms_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- 'africas_talking', 'twilio', 'nexmo', 'bulk_sms'
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  sender_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'welcome', 'reminder', 'notification', 'alert'
  content TEXT NOT NULL,
  variables JSONB, -- Array of variable names used in template
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES sms_providers(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  provider_message_id VARCHAR(255),
  cost NUMERIC,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
  target_group VARCHAR(50), -- 'all_members', 'elders', 'department', 'custom'
  target_criteria JSONB,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'cancelled'
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default SMS provider (placeholder)
INSERT INTO sms_providers (name, provider_type, sender_id, is_active) VALUES
('Africas Talking', 'africas_talking', 'KMainCMS', false)
ON CONFLICT DO NOTHING;

-- Insert default SMS templates
INSERT INTO sms_templates (name, template_type, content, variables) VALUES
('Welcome Message', 'welcome', 'Welcome to Kiserian Main SDA Church! We are blessed to have you as part of our family. Join us this Saturday for worship.', '[]'),
('Service Reminder', 'reminder', 'Reminder: Church service this Saturday at 9:00 AM. Do not miss out!', '[]'),
('Event Notification', 'notification', 'Event: {event_name} on {event_date}. We hope to see you there!', '["event_name", "event_date"]'),
('Prayer Request', 'alert', 'Prayer request: {prayer_request}. Please keep {name} in your prayers.', '["prayer_request", "name"]')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_at);

-- Add comments
COMMENT ON TABLE sms_providers IS 'SMS service providers and their API credentials';
COMMENT ON TABLE sms_templates IS 'Pre-defined SMS message templates with variable substitution';
COMMENT ON TABLE sms_logs IS 'Log of all SMS messages sent with delivery status';
COMMENT ON TABLE sms_campaigns IS 'Bulk SMS campaigns for targeted messaging';