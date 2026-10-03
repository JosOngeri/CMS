-- 067_payments_member_fk.sql
-- payments.member_id was declared REFERENCES users(id) in the ported base
-- schema, but every join in PaymentsRepository treats it as members.id and
-- the frontend sends members.id values. Re-point the FK at members.
--
-- Existing rows store user ids (the old FK target). The old constraint must
-- be dropped BEFORE the rewrite — writing member ids while it is still
-- enforced violates the users-FK mid-migration.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;

UPDATE payments p
SET member_id = m.id
FROM members m
WHERE p.member_id IS NOT NULL
  AND m.user_id = p.member_id;

UPDATE payments
SET member_id = NULL
WHERE member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM members m WHERE m.id = payments.member_id);

ALTER TABLE payments ADD CONSTRAINT payments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;
