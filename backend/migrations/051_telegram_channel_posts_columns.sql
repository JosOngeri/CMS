-- telegramService references announcement_id / synced_to_announcement on
-- telegram_channel_posts (sync-to-announcements flow) but migration 032
-- never created them — every announcement-sync write 500'd.

ALTER TABLE telegram_channel_posts
  ADD COLUMN IF NOT EXISTS announcement_id UUID,
  ADD COLUMN IF NOT EXISTS synced_to_announcement BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_telegram_channel_posts_announcement
  ON telegram_channel_posts(announcement_id);
