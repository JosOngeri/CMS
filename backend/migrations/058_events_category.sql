-- Migration 058: events.category
-- The events form collects a category and the list page filters by it, but the
-- column never existed — created events silently dropped the value and the
-- category filter was a dead control. Default 'service' matches the form's
-- default option; existing rows become 'service'.
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'service';
