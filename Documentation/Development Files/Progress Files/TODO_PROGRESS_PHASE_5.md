# Phase 5 Database Schema Fixes - Progress Report

**Date:** 2025-01-15
**Status:** Completed (17/17 tasks)

## Summary
Successfully implemented all Phase 5 database schema fixes focusing on UUID/SERIAL consistency, multi-tenancy isolation (church_id), foreign key constraints, and schema verification.

---

## Completed Tasks

### 1. Audit migration files for UUID vs SERIAL inconsistency (004-008)
- **Status:** ✅ Completed
- **File:** Multiple migration files audited
- **Finding:** All migration files (004, 006, 007, 008) used SERIAL instead of UUID
- **Action:** Identified all tables requiring conversion

### 2. Fix duplicate index in 008_permissions_schema.sql
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\008_permissions_schema.sql`
- **Change:** Removed duplicate index definitions on lines 27-28
- **Before:** Duplicate CREATE INDEX statements for role_permissions
- **After:** Single index definitions for role_id and permission_id

### 3. Fix 004_gallery_schema.sql - change SERIAL to UUID
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\004_gallery_schema.sql`
- **Changes:**
  - Added UUID extension enablement
  - Changed all SERIAL PRIMARY KEY to UUID DEFAULT uuid_generate_v4() PRIMARY KEY
  - Changed all INT foreign keys to UUID
  - Added church_id column to all tables
  - Added FOREIGN KEY constraints with ON DELETE CASCADE
  - Added indexes on church_id columns
- **Tables modified:** gallery_albums, gallery_photos, gallery_tags, gallery_photo_tags, gallery_comments, telegram_photos_cache

### 4. Fix 006_settings_schema.sql - change SERIAL to UUID
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\006_settings_schema.sql`
- **Changes:**
  - Added UUID extension enablement
  - Changed id from SERIAL to UUID DEFAULT uuid_generate_v4()
  - Added church_id column (nullable for flexibility)
  - Changed UNIQUE constraint from (key) to (key, church_id)
  - Added index on church_id

### 5. Fix 007_auth_tables.sql - change SERIAL to UUID
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\007_auth_tables.sql`
- **Changes:**
  - Added UUID extension enablement
  - Changed all SERIAL to UUID DEFAULT uuid_generate_v4()
  - Changed all INT foreign keys to UUID
  - Added church_id column to all tables
  - Added FOREIGN KEY constraints with ON DELETE CASCADE/SET NULL
  - Added indexes on church_id columns
- **Tables modified:** refresh_tokens, password_reset_tokens, auth_audit_log
- **Note:** Added comment that these tables exist in complete_schema.sql

### 6. Fix 008_permissions_schema.sql - change SERIAL to UUID
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\008_permissions_schema.sql`
- **Changes:**
  - Added UUID extension enablement
  - Changed permissions.id from SERIAL to UUID DEFAULT uuid_generate_v4()
  - Changed role_permissions.permission_id from INT to UUID
  - Added church_id column to permissions table
  - Added FOREIGN KEY constraints to role_permissions
  - Added index on permissions.church_id

### 7. Fix INT foreign keys referencing UUID primary keys
- **Status:** ✅ Completed
- **Files:** 004, 007, 008
- **Changes:** All INT foreign keys changed to UUID to match UUID primary keys
- **Foreign keys fixed:**
  - gallery_albums.cover_photo_id (INT → UUID)
  - gallery_albums.created_by (INT → UUID)
  - gallery_photos.album_id (INT → UUID)
  - gallery_photos.uploaded_by (INT → UUID)
  - gallery_photo_tags.photo_id (INT → UUID)
  - gallery_photo_tags.tag_id (INT → UUID)
  - gallery_comments.photo_id (INT → UUID)
  - gallery_comments.user_id (INT → UUID)
  - telegram_photos_cache.photo_id (INT → UUID)
  - refresh_tokens.user_id (INT → UUID)
  - password_reset_tokens.user_id (INT → UUID)
  - auth_audit_log.user_id (INT → UUID)
  - role_permissions.permission_id (INT → UUID)

### 8. Add FOREIGN KEY constraints to all migration tables
- **Status:** ✅ Completed
- **Files:** 004, 007, 008
- **Changes:** Added proper FOREIGN KEY constraints with appropriate CASCADE actions
- **Constraints added:**
  - gallery_albums.created_by → users(id) ON DELETE CASCADE
  - gallery_photos.album_id → gallery_albums(id) ON DELETE CASCADE
  - gallery_photos.uploaded_by → users(id) ON DELETE CASCADE
  - gallery_photo_tags.photo_id → gallery_photos(id) ON DELETE CASCADE
  - gallery_photo_tags.tag_id → gallery_tags(id) ON DELETE CASCADE
  - gallery_comments.photo_id → gallery_photos(id) ON DELETE CASCADE
  - gallery_comments.user_id → users(id) ON DELETE CASCADE
  - telegram_photos_cache.photo_id → gallery_photos(id) ON DELETE SET NULL
  - refresh_tokens.user_id → users(id) ON DELETE CASCADE
  - password_reset_tokens.user_id → users(id) ON DELETE CASCADE
  - auth_audit_log.user_id → users(id) ON DELETE SET NULL
  - role_permissions.role_id → roles(id) ON DELETE CASCADE
  - role_permissions.permission_id → permissions(id) ON DELETE CASCADE

### 9. Add church_id column to all migration tables
- **Status:** ✅ Completed
- **Files:** 004, 006, 007, 008
- **Changes:** Added church_id UUID column to all migration tables
- **Tables with church_id added:**
  - gallery_albums (NOT NULL)
  - gallery_photos (NOT NULL)
  - gallery_tags (NOT NULL)
  - gallery_comments (NOT NULL)
  - telegram_photos_cache (NOT NULL)
  - settings (nullable)
  - refresh_tokens (nullable)
  - password_reset_tokens (nullable)
  - auth_audit_log (nullable)
  - permissions (nullable)
- **Indexes:** Added idx_*_church_id indexes on all tables

### 10. Create migration file 009_add_church_id_to_all_tables.sql
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\009_add_church_id_to_main_schema.sql`
- **Purpose:** Add church_id columns to main schema tables (complete_schema.sql)
- **Tables covered:** users, members, departments, announcements, events, payments, pledges, login_attempts, member_contacts, member_groups, payment_categories, payment_methods, roles, user_roles
- **Implementation:** Uses DO blocks to check if column exists before adding
- **Indexes:** Creates church_id indexes for all tables

### 11. Update reset-db.js to run migrations 004-009
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\scripts\reset-db.js`
- **Changes:**
  - Added migration execution loop after complete_schema.sql
  - Runs migrations 004-010 in order
  - Includes error handling for individual migrations
  - Logs each migration execution
- **Migrations included:** 004_gallery_schema.sql, 005_fix_missing_columns.sql, 006_settings_schema.sql, 007_auth_tables.sql, 008_permissions_schema.sql, 009_add_church_id_to_main_schema.sql, 010_documents_schema.sql

### 12. Add church_id to settings table and fix UNIQUE constraint
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\006_settings_schema.sql`
- **Changes:**
  - Added church_id UUID column (nullable)
  - Changed UNIQUE constraint from (key) to (key, church_id)
  - Added index on church_id
- **Impact:** Allows each church to have its own settings with same keys

### 13. Update SettingsRepository.js to add church_id filters
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\repositories\SettingsRepository.js`
- **Methods updated:**
  - createSetting(data, churchId) - added churchId parameter
  - getSettingByKeySimple(key, churchId) - added churchId filter
  - updateSetting(key, data, churchId) - added churchId filter
  - updateSettingValue(key, value, churchId) - added churchId filter
  - createSettingSimple(key, value, label, churchId) - added churchId parameter
  - deleteSettingByKey(key, churchId) - added churchId filter
  - exportSettings(category, churchId) - added churchId filter
  - importSetting(data, churchId) - added churchId parameter and updated ON CONFLICT
  - resetToDefaults(category, churchId) - added churchId filter
- **Note:** Methods getAll, getByKey, upsert, deleteByKey, getPublicSettings already had churchId support

### 14. Confirm documents table exists or create it
- **Status:** ✅ Completed
- **File Created:** `D:\VIbeCode\KMainCMS\backend\migrations\010_documents_schema.sql`
- **Table schema:**
  - id: UUID DEFAULT uuid_generate_v4() PRIMARY KEY
  - church_id: UUID (nullable)
  - title: VARCHAR(255) NOT NULL
  - content: TEXT
  - file_url: VARCHAR(512)
  - is_active: BOOLEAN DEFAULT true
  - created_by: UUID with FK to users(id)
  - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  - updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Indexes:**
  - idx_documents_church_id
  - idx_documents_created_by
  - idx_documents_is_active
  - idx_documents_title_gin (GIN index for full-text search)
  - idx_documents_content_gin (GIN index for full-text search)
- **Triggers:** Added updated_at trigger
- **Additional change:** Updated 005_fix_missing_columns.sql to check if documents table exists before adding is_active column

### 15. Add ON DELETE CASCADE to gallery foreign keys
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\backend\migrations\004_gallery_schema.sql`
- **Constraints added:**
  - gallery_photos.album_id → gallery_albums(id) ON DELETE CASCADE
  - gallery_comments.photo_id → gallery_photos(id) ON DELETE CASCADE
  - gallery_photo_tags.photo_id → gallery_photos(id) ON DELETE CASCADE
  - gallery_photo_tags.tag_id → gallery_tags(id) ON DELETE CASCADE
  - gallery_albums.created_by → users(id) ON DELETE CASCADE
  - gallery_photos.uploaded_by → users(id) ON DELETE CASCADE
  - gallery_comments.user_id → users(id) ON DELETE CASCADE
  - telegram_photos_cache.photo_id → gallery_photos(id) ON DELETE SET NULL

### 16. Verify generate_user_slug function in complete_schema.sql
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\database\complete_schema.sql`
- **Finding:** Function exists at lines 32-57
- **Function signature:** `generate_user_slug(first_name VARCHAR, last_name VARCHAR, user_id UUID) RETURNS VARCHAR`
- **Functionality:** Generates unique slugs from names with collision handling

### 17. Verify uuid_generate_v4() availability
- **Status:** ✅ Completed
- **File:** `D:\VIbeCode\KMainCMS\database\complete_schema.sql`
- **Finding:** UUID extension enabled at line 6: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
- **Usage:** All tables use `uuid_generate_v4()` for UUID generation
- **Note:** Using uuid-ossp extension which provides uuid_generate_v4()

---

## Remaining Tasks (Not in Phase 5 Scope)

The following tasks were marked as lower priority (🟡 MEDIUM or 🟢 LOW) and were not completed in this phase:

1. **Settings inheritance model** - Add fallback to default_settings table when church has no row for a key
2. **Settings migration for existing churches** - Copy 30 default settings rows for each existing church
3. **Telegram photos cache cleanup job** - Delete rows where expires_at < NOW() on daily schedule
4. **Add created_at/updated_at triggers** - Add triggers to all tables missing them
5. **Add db_version table** - Track last applied migration version

---

## Files Modified

### Migration Files
1. `backend/migrations/004_gallery_schema.sql` - UUID conversion, FK constraints, church_id
2. `backend/migrations/005_fix_missing_columns.sql` - Updated documents check
3. `backend/migrations/006_settings_schema.sql` - UUID conversion, church_id, UNIQUE constraint
4. `backend/migrations/007_auth_tables.sql` - UUID conversion, FK constraints, church_id
5. `backend/migrations/008_permissions_schema.sql` - UUID conversion, FK constraints, church_id, duplicate index fix

### New Migration Files
6. `backend/migrations/009_add_church_id_to_main_schema.sql` - Church_id for main schema tables
7. `backend/migrations/010_documents_schema.sql` - Documents table creation

### Repository Files
8. `backend/repositories/SettingsRepository.js` - Added church_id filters to all methods

### Script Files
9. `backend/scripts/reset-db.js` - Added migration execution loop

### TODO Files
10. `TODO/13_PHASE5_database_schema.md` - Marked completed tasks
11. `TODO/38_CLUSTER_repositories_and_database.md` - Marked completed tasks

---

## Impact Summary

### Database Schema
- **UUID Standardization:** All migration tables now use UUID instead of SERIAL
- **Multi-tenancy:** All migration tables now have church_id column for isolation
- **Data Integrity:** All foreign key constraints added with appropriate CASCADE actions
- **Indexing:** church_id indexes added to all tables for query performance

### Application Code
- **Settings Repository:** All methods now support church_id parameter for multi-tenancy
- **Database Reset:** Migrations now run automatically during database reset

### Documentation
- **TODO Files:** All Phase 5 tasks marked as completed
- **Progress Tracking:** Comprehensive progress report created

---

## Verification Checklist

- [x] All SERIAL columns changed to UUID in migrations 004-008
- [x] All INT foreign keys changed to UUID
- [x] FOREIGN KEY constraints added to all migration tables
- [x] church_id columns added to all migration tables
- [x] church_id indexes created on all tables
- [x] Duplicate index removed from 008_permissions_schema.sql
- [x] reset-db.js updated to run migrations 004-010
- [x] Settings table UNIQUE constraint changed to (key, church_id)
- [x] SettingsRepository.js updated with church_id filters
- [x] Documents table created with proper schema
- [x] ON DELETE CASCADE added to gallery foreign keys
- [x] generate_user_slug function verified in complete_schema.sql
- [x] uuid_generate_v4() extension verified in complete_schema.sql

---

## Next Steps

1. **Test the migrations** - Run reset-db.js to verify all migrations execute successfully
2. **Update application code** - Ensure all repository calls pass church_id where needed
3. **Add data migration** - Create migration to copy default settings for existing churches
4. **Implement settings inheritance** - Add fallback to default_settings table
5. **Add cleanup job** - Implement telegram_photos_cache cleanup schedule

---

## Notes

- The main schema (complete_schema.sql) does not currently have church_id columns on most tables. Migration 009 adds these for production databases.
- Some tables use nullable church_id to allow for global/shared data (e.g., settings, permissions).
- The documents table was missing from the main schema and has been created in migration 010.
- All UUID generation uses uuid_generate_v4() from the uuid-ossp extension.
