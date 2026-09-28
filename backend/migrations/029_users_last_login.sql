-- Migration 029: users.last_login for system-health "active users" metric
-- and api_logs table for API request auditing.

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS api_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  method VARCHAR(10),
  path TEXT,
  status_code INT,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);
