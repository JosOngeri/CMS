-- 065_profile_and_payment_columns.sql
-- Two real gaps surfaced by the resurrected e2e suite:
--
-- 1) The frontend profile form (ProfileManagement.jsx) submits bio/address/
--    date_of_birth — but users had no such columns and the updateProfile
--    whitelist silently dropped them (or 500'd when they were the only fields).
-- 2) payments.phone_number was NOT NULL, but the manual/cash createPayment
--    path never supplies a phone — every manual payment insert failed.

ALTER TABLE payments ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
