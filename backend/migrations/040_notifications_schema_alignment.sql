-- Migration 040: Align notifications schema with NotificationsRepository.
-- The repo expects notification_types + type_id/message/action_url/metadata
-- columns and notification_preferences — none existed on prod, so
-- /api/notifications 500'd for every user.

CREATE TABLE IF NOT EXISTS notification_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notification_types (name, icon, color) VALUES
  ('payment',      'banknote',  '#22C55E'),
  ('remittance',   'handshake', '#14B8A6'),
  ('announcement', 'megaphone', '#3B82F6'),
  ('event',        'calendar',  '#F59E0B'),
  ('approval',     'check',     '#8B5CF6'),
  ('department',   'users',     '#F97316'),
  ('system',       'info',      '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Newer notification columns the repository reads/writes
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_push BOOLEAN DEFAULT false;

-- Backfill type_id from the legacy `type` string where names line up
UPDATE notifications n
SET type_id = nt.id
FROM notification_types nt
WHERE n.type_id IS NULL AND n.type = nt.name;

CREATE INDEX IF NOT EXISTS idx_notifications_type_id ON notifications(type_id);

-- notification_logs joins type_id too. The table was only ever created by
-- legacy `database/migrations/add_notifications_advanced_features.sql`, so
-- create it here first (fresh DBs), then add type_id.
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type VARCHAR(50),
  channel VARCHAR(50),
  status VARCHAR(20) DEFAULT 'sent',
  title VARCHAR(255),
  message TEXT,
  error_message TEXT,
  metadata JSONB,
  church_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS type_id UUID;

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at);

-- Per-user channel preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  church_id UUID,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_church ON notification_preferences(church_id);
