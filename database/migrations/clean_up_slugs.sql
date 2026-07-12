-- Script to clean up existing slugs by removing UUID suffixes
-- This will regenerate slugs to be cleaner (only add numbers if there are duplicates)

-- Update department slugs to remove UUID suffixes
DO $$
DECLARE
  dept RECORD;
  counter INTEGER;
  new_slug VARCHAR(100);
  base_slug VARCHAR(100);
BEGIN
  FOR dept IN SELECT id, name FROM departments LOOP
    -- Generate clean base slug from name
    base_slug := lower(regexp_replace(regexp_replace(dept.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));
    
    -- Handle empty names
    IF base_slug = '' THEN
      base_slug := 'department_' || substring(dept.id::text, 1, 8);
    END IF;
    
    -- Check if base slug is unique
    counter := 1;
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM departments WHERE slug = new_slug AND id != dept.id) LOOP
      new_slug := base_slug || '_' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the slug
    UPDATE departments SET slug = new_slug WHERE id = dept.id;
  END LOOP;
END $$;

-- Update user slugs to remove UUID suffixes
DO $$
DECLARE
  user_record RECORD;
  counter INTEGER;
  new_slug VARCHAR(100);
  base_slug VARCHAR(100);
BEGIN
  FOR user_record IN SELECT id, first_name, last_name FROM users LOOP
    -- Generate clean base slug from name
    base_slug := lower(regexp_replace(regexp_replace(COALESCE(user_record.first_name, '') || '_' || COALESCE(user_record.last_name, ''), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '_', 'g'));
    
    -- Handle empty names
    IF base_slug = '_' OR base_slug = '' THEN
      base_slug := 'user_' || substring(user_record.id::text, 1, 8);
    END IF;
    
    -- Check if base slug is unique
    counter := 1;
    new_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM users WHERE slug = new_slug AND id != user_record.id) LOOP
      new_slug := base_slug || '_' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the slug
    UPDATE users SET slug = new_slug WHERE id = user_record.id;
  END LOOP;
END $$;

-- Display the updated slugs
SELECT 'Updated Department Slugs:' as info;
SELECT id, name, slug FROM departments ORDER BY name;

SELECT 'Updated User Slugs:' as info;
SELECT id, first_name, last_name, slug FROM users ORDER BY first_name, last_name;
