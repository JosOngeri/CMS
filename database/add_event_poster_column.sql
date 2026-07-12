-- Add poster_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Add default_event_poster setting
INSERT INTO settings (key, value, value_type, category, label, description, is_editable, validation_rules) VALUES
  ('default_event_poster', '', 'text', 'event_settings', 'Default Event Poster', 'Default poster image URL for events (if no custom poster uploaded)', true, NULL)
ON CONFLICT (key) DO NOTHING;
