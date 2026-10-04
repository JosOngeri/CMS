-- 083: deploy records (8.3) + integration fallback settings seed (13.5).
-- ASCII only.

-- 8.3 Every deploy registers itself here so operators can see deploy
-- history and know which commit to roll back to.
CREATE TABLE IF NOT EXISTS platform_deploys (
  id SERIAL PRIMARY KEY,
  version VARCHAR(40),
  sha VARCHAR(40),
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  deployed_by VARCHAR(120) DEFAULT 'deploy-workflow',
  notes TEXT,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deploys_at ON platform_deploys(deployed_at DESC);

-- 13.5 Non-secret fallback integration config. Secrets never live here —
-- this holds provider names and env-var references only.
INSERT INTO platform_settings (key, value) VALUES
  ('integration_fallbacks', '{"sms_fallback_provider": null, "smtp_fallback_env": null, "mpesa_fallback_env": null}')
ON CONFLICT (key) DO NOTHING;
