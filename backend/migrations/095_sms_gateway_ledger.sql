-- 095: SMS gateway devices + per-recipient delivery ledger
--
-- Two tables close the "queued to nobody" gap:
--   sms_gateway_devices  — durable registry of JOSms Android relays per church
--   sms_deliveries       — per-recipient delivery state for every dispatched batch
--
-- Also adds sms_logs.recipients (JSONB) so a scheduled/pending log row can be
-- dispatched later — previously only recipient_count was stored, making
-- deferred sends impossible.

-- ---------------------------------------------------------------------------
-- sms_gateway_devices: one row per enrolled relay device per church.
-- is_online is the live signal; last_heartbeat_at keeps "last seen" durable
-- across restarts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_gateway_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  device_id         VARCHAR(120) NOT NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  label             VARCHAR(120),
  app_version       VARCHAR(40),
  battery           INT,
  signal            INT,
  is_online         BOOLEAN NOT NULL DEFAULT false,
  last_seen_at      TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_gateway_devices_church
  ON sms_gateway_devices (church_id, is_online);

-- ---------------------------------------------------------------------------
-- sms_deliveries: per-recipient state for each dispatched batch.
-- Written as 'queued' when process_bulk emits / bulk provider accepts;
-- updated by delivery-report posts or provider callbacks.
-- UNIQUE(batch_id, recipient) is the replay-safe dedup key.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  batch_id        VARCHAR(120) NOT NULL,
  recipient       VARCHAR(32) NOT NULL,
  message_preview VARCHAR(160),
  gateway         VARCHAR(60) NOT NULL DEFAULT 'josms',
  device_id       VARCHAR(120),
  status          VARCHAR(20) NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','accepted','sent','delivered','failed')),
  error           TEXT,
  idempotency_key VARCHAR(160),
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  UNIQUE (batch_id, recipient)
);

CREATE INDEX IF NOT EXISTS idx_sms_deliveries_church_status
  ON sms_deliveries (church_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_batch
  ON sms_deliveries (batch_id);
CREATE INDEX IF NOT EXISTS idx_sms_deliveries_church_queued
  ON sms_deliveries (church_id, queued_at DESC);

-- ---------------------------------------------------------------------------
-- sms_logs.recipients: the batch's actual recipient list, stored as JSONB so
-- scheduled sends can be dispatched later (and for audit/replay).
-- ---------------------------------------------------------------------------
ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS recipients JSONB;

-- sms_providers.callback_secret: per-provider token that authenticates
-- inbound delivery/topup callbacks (unauthenticated HTTP, token in path).
ALTER TABLE sms_providers
  ADD COLUMN IF NOT EXISTS callback_secret VARCHAR(120);
