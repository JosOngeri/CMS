# backend/scripts/
One-off ops/maintenance scripts.
## Files
| File | Purpose |
|---|---|
| `_scriptSafety.js` | Shared guards for repo scripts (L736/L753/L754/L755/L756). |
| `add-gallery-created-at.js` | — |
| `add-missing-columns.js` | — |
| `add-palette-setting.js` | — |
| `add-sample-gallery-data.js` | — |
| `add-telegram-channel.js` | — |
| `add-video-support.sql` | Add video support to gallery_photos table |
| `app-smoke-test.js` | Dynamic smoke test for every endpoint the mobile app uses. |
| `apply-migration.js` | Apply a SQL migration file. |
| `apply-migrations.js` | Idempotent migration runner for backend/migrations/NNN_*.sql |
| `assign-demo-church.js` | — |
| `auth-telegram.js` | Configuration |
| `auth-wrapper.js` | Configuration |
| `check-approval-requests-columns.js` | — |
| `check-columns.js` | — |
| `check-database.js` | — |
| `check-departments-columns.js` | — |
| `check-departments.js` | — |
| `check-documentation.js` | — |
| `check-gallery-albums-columns.js` | — |
| `check-gallery-photos-columns.js` | — |
| `check-members-columns.js` | — |
| `check-mfa-status.js` | — |
| `check-missing-repository-methods.js` | Script to check for missing repository methods |
| `check-notification-preferences-columns.js` | — |
| `check-notification-tables.js` | — |
| `check-notification-types-columns.js` | — |
| `check-notifications-columns.js` | — |
| `check-payments-columns.js` | — |
| `check-photo-tag-columns.js` | — |
| `check-security-tables.js` | — |
| `check-tables.js` | — |
| `check-telegram-tables.js` | — |
| `check-users-columns.js` | — |
| `check-users.js` | — |
| `check-website-settings-table.js` | — |
| `create-gallery-table.sql` | DEPRECATED: Superseded by backend/migrations/004_gallery_schema.sql. |
| `create-indexes.sql` | Database Indexes for Common Queries |
| `create-local-admin.js` | L756: refuse prod/remote DBs; no hardcoded password. |
| `create-missing-tables.js` | — |
| `create-palette-tables.sql` | Create color_palettes table for storing color palettes |
| `create-security-tables.js` | — |
| `create-treasury-tables.js` | — |
| `create-user-slug-function.js` | — |
| `create-website-settings-table.js` | — |
| `delete-test-announcements.js` | — |
| `delete-test-departments.js` | — |
| `delete-test-events.js` | — |
| `delete-test-gallery-albums.js` | — |
| `delete-test-payments.js` | — |
| `delete-test-user.js` | — |
| `extract-routes-and-db.js` | — |
| `fix-approval-comments.js` | — |
| `fix-approval-requests-columns.js` | — |
| `fix-departments-church-slug.js` | — |
| `fix-departments-columns.js` | — |
| `fix-gallery-albums-church-slug.js` | — |
| `fix-gallery-albums-columns.js` | — |
| `fix-gallery-uploaded-by.js` | — |
| `fix-notifications-columns.js` | — |
| `fix-table-columns.js` | — |
| `fix-users-deleted-at.js` | — |
| `flesh-out-repositories.js` | Script to identify and flesh out missing repository methods |
| `generate-comprehensive-seed.js` | Comprehensive Seed Data Generator for Msabato CMS |
| `generate-login-doc.js` | Generate USER_LOGINS.md from a psql export (username\|email\|church\|roles\|phone). |
| `get-admin-logins.js` | — |
| `probe-schema.js` | — |
| `reset-admin-password.js` | — |
| `reset-db.js` | L753: DROP SCHEMA public CASCADE — full wipe. Refuse on prod/remote DBs. |
| `reset-nonmember-passwords.js` | One-off: reset passwords for non-seeded (non "member*" username) accounts |
| `run-fix-migration.js` | — |
| `run-migration-026.js` | Runs migrations/026_mobile_parity.sql |
| `run-migration.js` | — |
| `run-mobile-migration.js` | Mobile Integration Migration Script |
| `run-platform-migration.js` | — |
| `security_audit.js` | Security Audit Script for Msabato CMS Backend |
| `seed-admin.js` | L756: refuse prod/remote DBs; no hardcoded password. |
| `seed-church-data.js` | docx section heading -> catalog slug |
| `seed-churches.js` | — |
| `seed-comprehensive.js` | L754: TRUNCATEs live tables — refuse on prod/remote DBs. |
| `seed-deep-test-data.js` | Deep test-data seeder — fills every feature table with realistic, |
| `seed-demo-data.js` | — |
| `seed-demo-users.js` | L756: refuse prod/remote DBs; no hardcoded demo passwords. |
| `seed-history.js` | Seed ~3 years of operational history for the seeded churches. |
| `seed-palettes.js` | — |
| `seed-role-accounts.js` | Seed per-church role accounts so every dashboard view can be tested. |
| `seed-test-permutations.js` | Full coverage seeder — every DB table gets >=1 realistic row per church with status/type variations (pending/approved/rejected, open/closed, public/private). Idempotent natural-key upserts; safe to re-run. Run: `node scripts/seed-test-permutations.js` |
| `seed-upcoming-events.js` | Seeds 8 weeks of upcoming events for each seeded church |
| `setup-test-db.js` | async |
| `sync-telegram-gallery.js` | Sync photos from a Telegram channel into the gallery. |
| `test-all-routes.js` | — |
| `test-api.js` | — |
| `test-data.js` | — |
| `test-frontend-endpoints.js` | — |
| `test-leadership-flow.js` | Integration test for the department leadership + handover flow. |
| `test-login.js` | — |
| `test-mobile-api.js` | Mobile API Structure Test Script |
| `test-multiple-apis.js` | — |
| `test-sms-callback.js` | — |
| `test-sms.js` | — |
| `test-sync.js` | — |
| `validate-db-routes.js` | — |
| `validate-route-mounting.js` | Extract mounted routes from server.js |
| `verify-admin.js` | — |
| `verify-ledger-fixes.js` | Re-tests every FIXED claim from fix passes 1-5: |

## Subfolders

- [`data/`](data/README.md)
_Generated by `scripts/generate-folder-readmes.js` — edit file headers, not this table._