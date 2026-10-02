-- Reports persistence layer.
-- ReportsRepository and helpers/reportScheduler.js referenced these tables for
-- months but they were never created — every save/schedule/execute path 500'd.
-- church_id is baked in from the start (multi-tenant isolation).

CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) DEFAULT 'custom',
  data_source VARCHAR(50),
  parameters  JSONB DEFAULT '{}'::jsonb,
  format      VARCHAR(20) DEFAULT 'json',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  church_id   UUID,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  data_source VARCHAR(50),
  filters     JSONB DEFAULT '[]'::jsonb,
  columns     JSONB DEFAULT '[]'::jsonb,
  group_by    VARCHAR(100),
  sort_by     VARCHAR(100),
  format      VARCHAR(20) DEFAULT 'json',
  is_public   BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  church_id   UUID,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  schedule_config JSONB DEFAULT '{}'::jsonb,
  report_config   JSONB DEFAULT '{}'::jsonb,
  recipients      JSONB DEFAULT '[]'::jsonb,
  is_active       BOOLEAN DEFAULT true,
  is_public       BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  church_id       UUID,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  filename      VARCHAR(255),
  status        VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  church_id     UUID,
  executed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_church_id            ON reports(church_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_church_id      ON saved_reports(church_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_creator        ON saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_church_id  ON scheduled_reports(church_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active     ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_report_executions_church_id  ON report_executions(church_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_report_id  ON report_executions(report_id);
