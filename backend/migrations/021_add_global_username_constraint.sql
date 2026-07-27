-- Add global username unique constraint
-- This ensures usernames are unique across all churches, not just within a single church

-- First, check if username column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(50);
  END IF;
END $$;

-- Create unique constraint on username (global, not per-church)
-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_username_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_username_key;
  END IF;
END $$;

-- Add unique constraint on username (global uniqueness)
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Handle any existing duplicate usernames by appending random suffix
DO $$
DECLARE
  duplicate_record RECORD;
  suffix INTEGER;
  new_username VARCHAR(50);
BEGIN
  -- Find duplicate usernames
  FOR duplicate_record IN 
    SELECT username, COUNT(*) as count 
    FROM users 
    WHERE username IS NOT NULL 
    GROUP BY username 
    HAVING COUNT(*) > 1
  LOOP
    -- For each duplicate, add a random suffix to make them unique
    suffix := FLOOR(RANDOM() * 1000) + 1;
    new_username := duplicate_record.username || '_' || suffix;
    
    -- Update one of the duplicates
    UPDATE users 
    SET username = new_username 
    WHERE id = (
      SELECT id FROM users 
      WHERE username = duplicate_record.username 
      LIMIT 1
    );
    
    RAISE NOTICE 'Resolved duplicate username % -> %', duplicate_record.username, new_username;
  END LOOP;
END $$;

-- Add comment to document the constraint
COMMENT ON CONSTRAINT users_username_unique ON users IS 'Ensures username is globally unique across all churches';