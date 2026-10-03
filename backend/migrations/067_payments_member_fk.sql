-- 067_payments_member_fk.sql
-- payments.member_id was declared REFERENCES users(id) in the ported base
-- schema, but every join in PaymentsRepository treats it as members.id and
-- the frontend sends members.id values. Re-point the FK at members.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;
