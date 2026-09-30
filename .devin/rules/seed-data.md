# Database Schema Changes Require Seed Data

Every migration or schema change MUST ship with a matching seed that fills the
new/changed structures with realistic test data.

## Requirements

1. **New table** → the migration (or a companion `NNN_<name>_seed.sql` /
   `backend/scripts/seed-*.js`) inserts at least a handful of realistic rows per
   church, covering every column — no NULLs left where a sensible value exists.
2. **New column** → the migration backfills existing rows with realistic values
   (or a deterministic default), not just NULL/empty.
3. **Data must be multi-tenant** — seed for every church in `churches`, never
   only for Kiserian Main SDA. Always set `church_id` correctly.
4. **Realistic, not placeholder** — plausible Kenyan names, KES amounts, dates
   spread over recent months, valid foreign keys to real users/departments.
   No "test", "foo", "lorem ipsum", or TODO strings.
5. **Idempotent** — seeds must be safe to re-run (`ON CONFLICT DO NOTHING`,
   existence checks, or deterministic slugs/keys).
6. **Verify** — after seeding, row-count the affected tables and confirm the
   feature reads them end-to-end (dashboard, API, mobile).
7. Migration and seed run against production via `docker exec shared-postgres
   psql -U postgres -d cms_db` — prod schema is the source of truth; verify
   column names against `information_schema` before writing inserts.
