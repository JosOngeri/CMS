-- Migration 073: platform_users auth columns
--
-- platformAuth.controller.js selects password_hash / failed_login_attempts /
-- locked_until, but migration 020 created the table without them — every
-- /api/platform/auth/login attempt 500'd on "column does not exist".
-- Mirrors the columns the legacy database/migrations/add_platform_foundation.sql
-- added.

ALTER TABLE platform_users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
