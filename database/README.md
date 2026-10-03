# database/ — legacy schema files (NOT the canonical migration path)

> **Canonical migrations live in `backend/migrations/`** (numbered `NNN_*.sql`,
> applied in order by `backend/migrate.js` with `schema_migrations` tracking).
> Everything in this directory is retained for reference only — the runner
> does NOT scan `database/` or `database/migrations/`.

## Layout

- `*.sql` (root) — pre-multitenancy per-feature schemas and seed files.
  Several are still read directly by legacy one-off scripts in `backend/`
  (`setup-database.js` → `schema.sql`, `migrate-members.js` →
  `003_members_schema.sql`, `reset-db.js` → `complete_schema.sql`, …).
  Prefer `npm run` equivalents / `node migrate.js` over running these.
- `migrations/` — an abandoned named-migration path superseded by
  `backend/migrations/`. A few scripts still point at individual files
  (`run-mobile-migration.js` → `mobile_integration.sql`).
- `migrations/_graveyard/` — dead retry variants (`execute_uuid_*`,
  `standardize_uuids_*`, `test_syntax.sql`). Unreferenced; kept for history.

## Rules

- Never add new files here — schema changes go in `backend/migrations/`.
- Never run these files manually against production; several are not
  idempotent, some contain stale assumptions, and seed files in this folder
  predate tenant scoping (see `add_mpesa_settings.sql`, `sample_data.sql`,
  `complete_seed.sql`, `departments_seed_updated.sql`, `seed_church_workers.sql`).
