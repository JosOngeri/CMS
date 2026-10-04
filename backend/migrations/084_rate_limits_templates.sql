-- ============================================================================
-- 084: Per-tenant rate-limit overrides (6.8) + tenant templates (1.4)
-- ============================================================================
-- tenant_rate_limits: optional override of the global API ceiling per church.
-- Only rows present here change behavior; absent rows get the global limiter.
--
-- tenant_templates: reusable snapshots of a church's departments + roles so a
-- new tenant can be provisioned "from template" instead of from scratch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_rate_limits (
    church_id        UUID PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
    max_requests     INTEGER NOT NULL CHECK (max_requests BETWEEN 10 AND 100000),
    window_seconds   INTEGER NOT NULL DEFAULT 60 CHECK (window_seconds BETWEEN 10 AND 3600),
    note             TEXT,
    updated_by       INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_templates (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    source_church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
    snapshot         JSONB NOT NULL,  -- { departments: [...], roles: [...] }
    created_by       INTEGER REFERENCES platform_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_templates_created ON tenant_templates(created_at DESC);

-- 13.4: default theme/branding assets merged into every new church's
-- settings.branding by the tenant-creation gateway (explicit input wins).
INSERT INTO platform_settings (key, value)
VALUES (
  'new_tenant_defaults',
  jsonb_build_object(
    'branding', jsonb_build_object(
      'theme', 'default',
      'primaryColor', '#3B82F6',
      'secondaryColor', '#F59E0B',
      'logoUrl', '',
      'faviconUrl', ''
    )
  )
)
ON CONFLICT (key) DO UPDATE
SET value = platform_settings.value || EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
