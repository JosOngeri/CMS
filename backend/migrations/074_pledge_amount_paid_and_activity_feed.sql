-- Migration 074: pledges.amount_paid cache sync + activity_feed view
--
-- PaymentsRepository.getPledgesWithFilters used to run SUM(pledge_payments.amount)
-- on every fetch. The column pledges.amount_paid already exists (migration 041)
-- but was never maintained — this backfills it and installs a trigger that keeps
-- it in sync on any pledge_payments write (covers INSERT/UPDATE/DELETE, including
-- writers outside the repository).

-- Canonical-path backfill (same class as the 070 preamble): pledge_payments
-- existed only in legacy database/payments_schema.sql yet PaymentsRepository
-- writes it (recordPledgePayment) and joins it. Ported with the legacy shape.
CREATE TABLE IF NOT EXISTS pledge_payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pledge_id    UUID REFERENCES pledges(id) ON DELETE CASCADE,
  payment_id   UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount       NUMERIC NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pledge_payments_pledge ON pledge_payments(pledge_id);

-- Backfill from the authoritative pledge_payments rows.
UPDATE pledges p
SET amount_paid = COALESCE((
      SELECT SUM(pp.amount) FROM pledge_payments pp WHERE pp.pledge_id = p.id
    ), 0);

-- Trigger: recompute the parent's cached total after each pledge_payments change.
CREATE OR REPLACE FUNCTION sync_pledge_amount_paid() RETURNS TRIGGER AS $$
BEGIN
  UPDATE pledges
  SET amount_paid = COALESCE((
        SELECT SUM(amount) FROM pledge_payments
        WHERE pledge_id = COALESCE(NEW.pledge_id, OLD.pledge_id)
      ), 0),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.pledge_id, OLD.pledge_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_pledge_amount_paid ON pledge_payments;
CREATE TRIGGER trg_sync_pledge_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON pledge_payments
FOR EACH ROW EXECUTE FUNCTION sync_pledge_amount_paid();

-- activity_feed: unified view over the four activity sources so
-- ActivityFeedRepository can filter (activity_type) and paginate in SQL
-- instead of a 4-way UNION ALL rebuilt inline per request.
-- NOTE: a *materialized* version was considered but deferred — there is no
-- refresh/scheduling infrastructure for it (same deferral as cluster 05's
-- getUserActivityLevel). A plain view keeps data real-time; per-source
-- indexes on (department_id, church_id, created_at) below keep it fast.

CREATE OR REPLACE VIEW activity_feed AS
SELECT
  'announcement' AS activity_type,
  a.id,
  a.title,
  a.content AS description,
  a.created_at,
  CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
  u.id AS actor_id,
  a.priority,
  'announcement' AS sub_type,
  a.department_id,
  a.church_id
FROM announcements a
JOIN users u ON a.author_id = u.id
UNION ALL
SELECT
  'event_created' AS activity_type,
  e.id,
  e.title,
  e.description,
  e.created_at,
  CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
  u.id AS actor_id,
  NULL AS priority,
  'event' AS sub_type,
  e.department_id,
  e.church_id
FROM events e
JOIN users u ON e.organizer_id = u.id
UNION ALL
SELECT
  'member_joined' AS activity_type,
  dm.user_id AS id,
  CONCAT(u.first_name, ' ', u.last_name) AS title,
  'Joined the department' AS description,
  dm.joined_at AS created_at,
  CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
  u.id AS actor_id,
  NULL AS priority,
  'member' AS sub_type,
  dm.department_id,
  dm.church_id
FROM department_members dm
JOIN users u ON dm.user_id = u.id
WHERE dm.is_active = true
UNION ALL
SELECT
  'approval_requested' AS activity_type,
  ar.id,
  ar.title,
  ar.description,
  ar.created_at,
  CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
  u.id AS actor_id,
  ar.priority,
  'approval' AS sub_type,
  ar.department_id,
  ar.church_id
FROM approval_requests ar
JOIN users u ON ar.requester_id = u.id;

CREATE INDEX IF NOT EXISTS idx_announcements_dept_church_created
  ON announcements (department_id, church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_dept_church_created
  ON events (department_id, church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_department_members_dept_church
  ON department_members (department_id, church_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_dept_church_created
  ON approval_requests (department_id, church_id, created_at DESC);
