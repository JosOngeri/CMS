-- NOTIFICATIONS Module Database Schema

-- Notification types table
CREATE TABLE IF NOT EXISTS notification_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type_id INTEGER REFERENCES notification_types(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default notification types
INSERT INTO notification_types (name, description, icon, color) VALUES
('Content Update', 'New or updated content notifications', 'file-text', '#3B82F6'),
('Event Reminder', 'Event and meeting reminders', 'calendar', '#F59E0B'),
('Approval Required', 'Items requiring your approval', 'check-circle', '#EF4444'),
('System Alert', 'System notifications and alerts', 'alert-triangle', '#EF4444'),
('Message', 'New messages and communications', 'message-square', '#10B981'),
('Financial', 'Financial notifications and updates', 'dollar-sign', '#10B981')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_id ON notifications(type_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- Add comments
COMMENT ON TABLE notification_types IS 'Types of notifications in the system';
COMMENT ON TABLE notifications IS 'User notifications with read status';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';