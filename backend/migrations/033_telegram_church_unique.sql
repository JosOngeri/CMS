-- Migration 033: Enforce one Telegram config per church
-- Remove duplicates keeping the most recently updated row per church
DELETE FROM telegram_channels a
USING telegram_channels b
WHERE a.id < b.id AND a.church_id = b.church_id;

ALTER TABLE telegram_channels ADD CONSTRAINT unique_telegram_channel_per_church UNIQUE (church_id);
