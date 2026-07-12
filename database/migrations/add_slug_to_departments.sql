-- Migration: Add slug column to departments table
-- This enables user-friendly URLs using department names instead of UUIDs

-- Add slug column
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Add comment explaining the column
COMMENT ON COLUMN departments.slug IS 'URL-friendly identifier for the department (e.g., music_ministry)';

-- Create a function to generate slugs from department names
CREATE OR REPLACE FUNCTION generate_slug(text VARCHAR) RETURNS VARCHAR AS $$
BEGIN
  -- Convert to lowercase, replace spaces with underscores, remove special characters
  RETURN lower(regexp_replace(regexp_replace(text, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing departments (without UUID suffix initially)
UPDATE departments
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_departments_slug ON departments(slug);

-- Ensure slug is unique by handling conflicts (only add numbers if there are duplicates)
DO $$
DECLARE
  dept RECORD;
  counter INTEGER;
  new_slug VARCHAR(100);
BEGIN
  FOR dept IN SELECT id, name, slug FROM departments WHERE slug IS NOT NULL LOOP
    counter := 1;
    new_slug := dept.slug;

    -- Check if slug is unique
    WHILE EXISTS (SELECT 1 FROM departments WHERE slug = new_slug AND id != dept.id) LOOP
      new_slug := dept.slug || '_' || counter;
      counter := counter + 1;
    END LOOP;

    -- Update if slug changed
    IF new_slug != dept.slug THEN
      UPDATE departments SET slug = new_slug WHERE id = dept.id;
    END IF;
  END LOOP;
END $$;
