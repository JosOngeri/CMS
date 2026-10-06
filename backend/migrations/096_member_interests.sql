-- 096: member_interests — inbound SMS keyword events pushed by JOSms gateways
--
-- When a member texts a keyword (e.g. "JOIN", "PRAYER") to the church's
-- gateway phone, the Android app posts the event here. This keeps inbound
-- interest durable in the CMS instead of living only on the phone.
CREATE TABLE IF NOT EXISTS member_interests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  phone       VARCHAR(32) NOT NULL,
  keyword     VARCHAR(80),
  message     TEXT,
  device_id   VARCHAR(120),
  status      VARCHAR(20) NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','contacted','joined','dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_interests_church
  ON member_interests (church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_interests_phone
  ON member_interests (church_id, phone);
