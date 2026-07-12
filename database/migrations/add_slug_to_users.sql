-- Migration: Add slug column to users table
-- This enables user-friendly URLs using first_name_last_name instead of UUIDs

-- Add slug column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Add comment explaining the column
COMMENT ON COLUMN users.slug IS 'URL-friendly identifier for the user (e.g., john_doe)';

-- Create a function to generate slugs from first and last name
CREATE OR REPLACE FUNCTION generate_user_slug(first_name VARCHAR, last_name VARCHAR, user_id UUID) RETURNS VARCHAR AS $$
DECLARE
  base_slug VARCHAR(100);
  counter INTEGER;
  new_slug VARCHAR(100);
BEGIN
  -- Convert to lowercase, replace spaces with underscores, remove special characters
  base_slug := lower(regexp_replace(regexp_replace(COALESCE(first_name, '') || '_' || COALESCE(last_name, ''), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));

  -- Handle empty names
  IF base_slug = '_' OR base_slug = '' THEN
    base_slug := 'user_' || substring(user_id::text, 1, 8);
  END IF;

  -- Check if base slug is unique
  counter := 1;
  new_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM users WHERE slug = new_slug AND id != user_id) LOOP
    new_slug := base_slug || '_' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing users (without UUID suffix initially)
UPDATE users
SET slug = generate_user_slug(first_name, last_name, id)
WHERE slug IS NULL;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);

-- Ensure slug is unique by handling conflicts (only add numbers if there are duplicates)
DO $$
DECLARE
  user_record RECORD;
  counter INTEGER;
  new_slug VARCHAR(100);
BEGIN
  FOR user_record IN SELECT id, first_name, last_name, slug FROM users WHERE slug IS NOT NULL LOOP
    counter := 1;
    new_slug := user_record.slug;

    -- Check if slug is unique
    WHILE EXISTS (SELECT 1 FROM users WHERE slug = new_slug AND id != user_record.id) LOOP
      new_slug := user_record.slug || '_' || counter;
      counter := counter + 1;
    END LOOP;

    -- Update if slug changed
    IF new_slug != user_record.slug THEN
      UPDATE users SET slug = new_slug WHERE id = user_record.id;
    END IF;
  END LOOP;
END $$;
