-- Migration 076: 'Admin' role permission backfill
-- The 'Admin' role is assigned to every church administrator (ChurchRepository.
-- createChurchWithAdmin, seed-role-accounts.js) but migration 038 backfilled
-- role_permissions for every role EXCEPT it — Admin users logged in with an
-- empty permission set, so permission-gated navigation/APIs treated them like
-- they had no access at all.
--
-- Church Admin is the church-scoped equivalent of 'Super Admin': grant it the
-- same full catalog. Tenant scoping is enforced by church_id on queries, so
-- full permissions cannot leak across churches.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
