-- Migration 049: Tenant scoping for comments, accounting exports, and Telegram auth methods

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(80) NOT NULL,
  entity_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
UPDATE comments c
SET church_id = u.church_id
FROM users u
WHERE c.user_id = u.id AND c.church_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_church_entity ON comments(church_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE TABLE IF NOT EXISTS accounting_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(50) NOT NULL,
  export_format VARCHAR(20) NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  record_count INTEGER DEFAULT 0,
  file_path TEXT,
  file_size BIGINT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

ALTER TABLE accounting_exports
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_accounting_exports_church ON accounting_exports(church_id);

CREATE TABLE IF NOT EXISTS telegram_auth_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('bot', 'mtproto')),
  name VARCHAR(120) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE telegram_auth_methods
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_telegram_auth_methods_church ON telegram_auth_methods(church_id);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_methods_church_default
  ON telegram_auth_methods(church_id, is_default);
