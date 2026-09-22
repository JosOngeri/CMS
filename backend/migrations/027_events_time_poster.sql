-- Migration 027: add event_time and poster_url to events
-- The mobile events API (getMobileEvents) and events UI expect these columns.

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_url TEXT;
