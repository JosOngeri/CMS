-- Phase 10: Notification Templates Migration
-- Creates notification templates for real-time notifications

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type_id VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  variables JSONB DEFAULT '{}',
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, church_id)
);

-- Create notification delivery tracking table
CREATE TABLE IF NOT EXISTS notification_delivery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_church ON notification_templates(church_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification ON notification_delivery(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery(status);

-- Seed default notification templates
INSERT INTO notification_templates (name, type_id, title, message, action_url, variables) VALUES
  ('new_member', 'membership', 'New Member Added', 'Welcome {{name}} to the church family!', '/members/{{member_id}}', '["name", "member_id"]'),
  ('payment_received', 'payment', 'Payment Received', 'Thank you for your payment of {{amount}}', '/payments/{{payment_id}}', '["amount", "payment_id"]'),
  ('event_reminder', 'event', 'Event Reminder', 'Reminder: {{event_name}} is on {{event_date}}', '/events/{{event_id}}', '["event_name", "event_date", "event_id"]'),
  ('announcement', 'announcement', 'New Announcement', '{{title}} - {{summary}}', '/announcements/{{announcement_id}}', '["title", "summary", "announcement_id"]'),
  ('meeting_scheduled', 'department', 'Meeting Scheduled', 'Meeting: {{meeting_title}} on {{meeting_date}}', '/departments/{{department_id}}/meetings/{{meeting_id}}', '["meeting_title", "meeting_date", "department_id", "meeting_id"]')
ON CONFLICT (name, church_id) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER trg_update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- Add comments
COMMENT ON TABLE notification_templates IS 'Notification templates with variable substitution';
COMMENT ON TABLE notification_delivery IS 'Notification delivery tracking for real-time notifications';
COMMENT ON COLUMN notification_templates.variables IS 'JSON array of variable names for template substitution';
