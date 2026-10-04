-- ============================================================================
-- 085: platform_app_logs (4.7) + platform_tenant_messages (11.2)
-- ============================================================================
-- platform_app_logs: warn-and-above structured log entries written by the
-- app's pino multistream, browsable from the platform console log explorer.
--
-- platform_tenant_messages: a lightweight two-way thread between platform
-- staff and a church's admins (distinct from support tickets — no workflow).
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_app_logs (
    id          BIGSERIAL PRIMARY KEY,
    level       VARCHAR(10) NOT NULL,      -- warn | error | fatal
    msg         TEXT,
    context     JSONB,                     -- the pino log object minus msg/level/time
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_app_logs_time ON platform_app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_app_logs_level ON platform_app_logs(level, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_tenant_messages (
    id                  SERIAL PRIMARY KEY,
    church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    sender_type         VARCHAR(10) NOT NULL CHECK (sender_type IN ('platform', 'church')),
    sender_label        VARCHAR(120) NOT NULL,   -- platform staff name or church admin name
    body                TEXT NOT NULL,
    read_by_church_at   TIMESTAMPTZ,
    read_by_platform_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_tenant_msgs ON platform_tenant_messages(church_id, created_at DESC);
