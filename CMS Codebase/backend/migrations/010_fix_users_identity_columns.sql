-- Fix missing columns in users table required by IdentityService and auth flow

-- Add phone column (mirror of phone_number for compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

UPDATE users SET phone = phone_number WHERE phone IS NULL;

-- Add MFA columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

UPDATE users SET mfa_enabled = FALSE WHERE mfa_enabled IS NULL;

-- Add failed_login_attempts and locked_until if missing (used by auth controller)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL;
