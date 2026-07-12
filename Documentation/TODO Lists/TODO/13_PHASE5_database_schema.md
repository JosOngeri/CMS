# Phase 5 — Database Schema Fixes
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 5 — DATABASE SCHEMA FIXES

### 5.1 Migration Files — UUID vs SERIAL Inconsistency

- [x] 🔴 Audit every table in `007_auth_tables.sql`, `008_permissions_schema.sql`, `004_gallery_schema.sql`, `005_fix_missing_columns.sql`, `006_settings_schema.sql`: any table using `SERIAL` for `id` must be changed to `UUID DEFAULT gen_random_uuid()` to match the main schema
- [x] 🔴 Any INT foreign key that references a UUID primary key must be changed to UUID — check `refresh_tokens.user_id`, `password_reset_tokens.user_id`, `auth_audit_log.user_id`, `role_permissions.permission_id`
- [x] 🔴 Add FOREIGN KEY constraints to all migration tables — they currently have none: `refresh_tokens.user_id REFERENCES users(id)`, `password_reset_tokens.user_id REFERENCES users(id)`, `gallery_photos.album_id REFERENCES gallery_albums(id)`, etc.
- [x] 🟠 Add `church_id UUID REFERENCES churches(id) ON DELETE CASCADE` column to: `refresh_tokens`, `password_reset_tokens`, `auth_audit_log`, `permissions`, `gallery_albums`, `gallery_photos`, `gallery_tags`, `gallery_photo_tags`, `gallery_comments`, `telegram_photos_cache`, `settings`
- [x] 🟠 Create a new migration file `009_add_church_id_to_all_tables.sql` that adds `church_id` columns and creates indexes on them for every table missing them
- [x] 🟠 Fix duplicate index definitions in `008_permissions_schema.sql` lines 27–28 — remove the duplicate `CREATE INDEX idx_role_permissions_permission_id`
- [x] 🟡 Update `backend/scripts/reset-db.js` to run migration files 004–009 after executing `complete_schema.sql` — currently migrations are never run during reset, making them orphaned

### 5.2 Settings Table — Global Instead of Per-Church

- [x] 🔴 Add `church_id UUID NOT NULL REFERENCES churches(id)` to the `settings` table
- [x] 🔴 Change the UNIQUE constraint from `UNIQUE(key)` to `UNIQUE(key, church_id)` so each church can have its own value for the same setting key
- [x] 🔴 Update all settings queries in `backend/repositories/SettingsRepository.js` (or equivalent) to add `WHERE church_id = $1`
- [ ] 🟠 Add a migration to copy the 30 default settings rows for each existing church (so no church loses its settings)
- [ ] 🟡 Add a settings inheritance model: if a church has no row for a key, fall back to the `default_settings` table (global defaults)

### 5.3 Orphaned Documents Table

- [x] 🟠 Confirm whether a `documents` table exists — it is referenced by `005_fix_missing_columns.sql` (adds `is_active` column) but no CREATE TABLE migration is present
- [x] 🟠 If missing, create `010_documents_schema.sql` with `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `church_id UUID REFERENCES churches(id)`, `title VARCHAR(255) NOT NULL`, `content TEXT`, `file_url VARCHAR(512)`, `is_active BOOLEAN DEFAULT true`, `created_by UUID REFERENCES users(id)`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- [x] 🟡 Add GIN index on `title` and `content` for full-text search

### 5.4 Gallery Schema Gaps

- [x] 🟠 Add ON DELETE CASCADE to `gallery_photos.album_id REFERENCES gallery_albums(id)` so deleting an album removes its photos
- [x] 🟠 Add ON DELETE CASCADE to `gallery_comments.photo_id REFERENCES gallery_photos(id)`
- [x] 🟠 Add ON DELETE CASCADE to `gallery_photo_tags.photo_id REFERENCES gallery_photos(id)`
- [ ] 🟡 Add `telegram_photos_cache` cleanup job: delete rows where `expires_at < NOW()` on a daily schedule

### 5.5 `complete_schema.sql` Verification

- [x] 🟠 Verify `generate_user_slug` function is defined in `complete_schema.sql` — used in `UserRepository.js` line 227; if missing, add it as a PostgreSQL function
- [x] 🟠 Verify `uuid_generate_v4()` is available — if using PostgreSQL 13+, replace with `gen_random_uuid()` which needs no extension
- [ ] 🟡 Add `created_at` and `updated_at` trigger on every table that doesn't already have `update_*_updated_at` triggers
- [ ] 🟢 Add a `db_version` table with a single row tracking the last applied migration version
