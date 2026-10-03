-- Migration 033: Enforce one Telegram config per church
-- Remove duplicates keeping the most recently updated row per church
-- (tie-broken by highest id). Previously compared a.id < b.id alone, which
-- kept the highest id — an older config edited later would lose its fresh row.
DELETE FROM telegram_channels a
USING telegram_channels b
WHERE a.church_id = b.church_id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at = b.updated_at AND a.id < b.id));

ALTER TABLE telegram_channels ADD CONSTRAINT unique_telegram_channel_per_church UNIQUE (church_id);
