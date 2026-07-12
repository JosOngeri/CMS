-- Security enhancements table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  reason TEXT,
  blocked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP NOT NULL,
  is_permanent BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);

-- Add comments
COMMENT ON TABLE blocked_ips IS 'Blocked IP addresses for security';