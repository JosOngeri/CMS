-- Migration 033: Enforce one Telegram config per church
ALTER TABLE telegram_channels ADD CONSTRAINT unique_telegram_channel_per_church UNIQUE (church_id);
