-- 093: align prod pledges + department_resources with code expectations.
-- The migration runner tracks applied files by name, so post-deploy deltas
-- must ship as a new file rather than edits to an already-applied one.

-- pledges: prod uses pledge_amount; code + dev use amount
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'pledges' AND column_name = 'pledge_amount') THEN
    UPDATE pledges SET amount = pledge_amount WHERE amount IS NULL AND pledge_amount IS NOT NULL;
  END IF;
END $$;

-- department_resources: prod shape predates the title/file_type/file_size cols
ALTER TABLE department_resources ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE department_resources ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE department_resources ADD COLUMN IF NOT EXISTS file_size INTEGER;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'department_resources' AND column_name = 'name') THEN
    UPDATE department_resources SET title = name WHERE title IS NULL AND name IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'department_resources' AND column_name = 'type') THEN
    UPDATE department_resources SET file_type = type WHERE file_type IS NULL AND type IS NOT NULL;
  END IF;
END $$;
