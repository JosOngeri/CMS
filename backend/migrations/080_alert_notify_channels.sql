-- 080: alert delivery channels (finishes 4.6).
--
-- The engine already fires platform_alerts rows; this adds the delivery
-- layer: per-rule notify_channels ('email', 'telegram') plus the
-- recipient settings the delivery code reads.

-- Per-rule delivery channels. Empty array = console-only alert.
ALTER TABLE platform_alert_rules
  ADD COLUMN IF NOT EXISTS notify_channels TEXT[] NOT NULL DEFAULT '{}';

-- Recipients for the channels. Empty email list = all active platform owners.
INSERT INTO platform_settings (key, value, description) VALUES
  ('alert_email_recipients', '[]', '4.6: JSON array of emails for fired alerts; empty = all active platform owners'),
  ('alert_telegram_chat_id', '""', '4.6: chat/channel id telegramService posts fired alerts to; empty = disabled')
ON CONFLICT (key) DO NOTHING;

-- Default seeded rules get email delivery (idempotent: only fills empty arrays).
UPDATE platform_alert_rules
SET notify_channels = '{email}'
WHERE notify_channels = '{}' OR notify_channels IS NULL;

-- Tenant link on alerts so dunning suspensions can be auto-resolved when
-- the tenant pays (9.5 auto-restore) — message-text matching is fragile.
ALTER TABLE platform_alerts
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_platform_alerts_church ON platform_alerts(church_id);
