-- 081: offboarding lifecycle (1.5), support access grants (12.2),
-- invoice credit notes (9.4). ASCII only.

-- 1.5 Offboarding: structured lifecycle on churches.
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offboard_reason TEXT;

-- 12.2 Support access: time-boxed impersonation grant tied to a ticket.
CREATE TABLE IF NOT EXISTS platform_support_access (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE SET NULL,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  impersonation_id INTEGER REFERENCES platform_impersonations(id) ON DELETE SET NULL,
  granted_by INTEGER NOT NULL REFERENCES platform_users(id),
  mode VARCHAR(10) NOT NULL DEFAULT 'readonly',
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_access_church ON platform_support_access(church_id);
CREATE INDEX IF NOT EXISTS idx_support_access_ticket ON platform_support_access(ticket_id);

-- 9.4 Credit notes: stored on the invoice row (one credit per invoice is
-- enough for a SaaS ledger — repeat credits update the same fields).
ALTER TABLE platform_invoices
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_reason TEXT,
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credited_by INTEGER REFERENCES platform_users(id);
