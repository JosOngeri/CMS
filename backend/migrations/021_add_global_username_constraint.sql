-- Add global username unique constraint.
-- Global (not per-church) is intentional: login resolves identifier → user
-- without a church context, so a username must map to exactly one account
-- across all tenants (see UserRepository.findByUsernameGlobal).
--
-- L773: the original version added the constraint before deduping and had no
-- existence guard, so it failed both on dirty data and on re-runs. Dedupe
-- first, then add the constraint only when absent.

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

-- Handle any existing duplicate usernames by appending a random suffix
-- BEFORE creating the constraint — otherwise ADD CONSTRAINT fails first.
DO $$
DECLARE
  duplicate_record RECORD;
  suffix INTEGER;
  new_username VARCHAR(50);
BEGIN
  FOR duplicate_record IN
    SELECT username, COUNT(*) as count
    FROM users
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    suffix := FLOOR(RANDOM() * 1000) + 1;
    new_username := duplicate_record.username || '_' || suffix;

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

-- Drop the legacy per-church-style constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_username_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_username_key;
  END IF;
END $$;

-- Add unique constraint only when absent (idempotent re-run safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_username_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END $$;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT users_username_unique ON users IS 'Ensures username is globally unique across all churches';
