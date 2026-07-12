-- Create user_preferences table for storing user notification and privacy settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  announcement_notifications BOOLEAN DEFAULT true,
  event_notifications BOOLEAN DEFAULT true,
  department_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  
  -- Privacy Settings
  profile_visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'members_only', 'private'
  show_email BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT true,
  show_departments BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  show_activity BOOLEAN DEFAULT true,
  
  -- UI Preferences
  theme VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores user notification, privacy, and UI preferences';
