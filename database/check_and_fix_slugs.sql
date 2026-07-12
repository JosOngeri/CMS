-- Check current department slugs
SELECT id, name, slug FROM departments;

-- If slugs are NULL or missing, run this to generate them:
-- First, ensure the slug column exists
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Create function to generate slugs
CREATE OR REPLACE FUNCTION generate_slug(text VARCHAR) RETURNS VARCHAR AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(text, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for departments that don't have them
UPDATE departments
SET slug = generate_slug(name)
WHERE slug IS NULL OR slug = '';

-- Handle duplicate slugs by adding numbers
DO $$
DECLARE
  dept RECORD;
  counter INTEGER;
  new_slug VARCHAR(100);
BEGIN
  FOR dept IN SELECT id, name, slug FROM departments WHERE slug IS NOT NULL LOOP
    counter := 1;
    new_slug := dept.slug;

    WHILE EXISTS (SELECT 1 FROM departments WHERE slug = new_slug AND id != dept.id) LOOP
      new_slug := dept.slug || '_' || counter;
      counter := counter + 1;
    END LOOP;

    IF new_slug != dept.slug THEN
      UPDATE departments SET slug = new_slug WHERE id = dept.id;
    END IF;
  END LOOP;
END $$;

-- Verify the results
SELECT id, name, slug FROM departments;
