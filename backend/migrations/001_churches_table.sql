-- 001: Core tenancy table.
-- `churches` was only ever created by the legacy `database/migrations/
-- add_tenancy_core.sql`, which the canonical runner never applies — every
-- fresh build (test DB, new deploy) died on the first migration that
-- references it (003). Mirrors the legacy definition; later migrations
-- (020+) add subscription_tier/billing columns via guarded ALTERs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS churches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) UNIQUE NOT NULL,
  settings    JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_churches_slug ON churches(slug);
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches(is_active);

-- Seed the primary church so a fresh DB is usable end-to-end (idempotent).
INSERT INTO churches (name, slug, settings)
VALUES ('Kiserian Main SDA', 'kiserian-main-sda', '{"timezone": "Africa/Nairobi", "currency": "KES"}')
ON CONFLICT (slug) DO NOTHING;
