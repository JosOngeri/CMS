-- Notifications Advanced Features Migration
-- Adds push notifications, templates, and logs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  variables JSONB, -- Available variables for substitution
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type VARCHAR(50),
  channel VARCHAR(50),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'delivered', 'opened'
  title VARCHAR(255),
  message TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add push notification column to notifications table if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS is_push BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS push_delivered_at TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_push ON notifications(is_push);

-- Add comments
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable substitution';
COMMENT ON TABLE notification_logs IS 'Log of all sent notifications for tracking and analytics';
COMMENT ON COLUMN notifications.is_push IS 'Flag indicating if notification was sent via push';
COMMENT ON COLUMN notifications.push_sent_at IS 'Timestamp when push notification was sent';
COMMENT ON COLUMN notifications.push_delivered_at IS 'Timestamp when push notification was delivered';
