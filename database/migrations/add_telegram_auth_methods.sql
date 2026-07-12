-- Telegram Authentication Methods Table
CREATE TABLE IF NOT EXISTS telegram_auth_methods (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'bot' or 'mtproto'
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_telegram_auth_methods_type ON telegram_auth_methods(type);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_methods_is_active ON telegram_auth_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_methods_is_default ON telegram_auth_methods(is_default);

-- Add comment
COMMENT ON TABLE telegram_auth_methods IS 'Stores Telegram authentication methods for bot API and MTProto';
