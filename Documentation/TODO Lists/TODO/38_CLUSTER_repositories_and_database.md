# CLUSTER — Repositories and Database
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: BaseRepository, all individual repositories (Search, User, Users, Dashboard, TaxStatement, Security, Approvals, Reconciliation), migrations 004-009, complete_schema.sql, reset-db.js, database.js config.

---

## From PHASE 1 — CRITICAL RUNTIME CRASHES

### Phase 1.6 — `backend/config/database.js` — SSL Misconfiguration

- [x] 🟠 Change `ssl: { rejectUnauthorized: false }` → `ssl: { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }` in the production block — `rejectUnauthorized: false` leaves you open to MITM attacks
- [x] 🟡 Add `connectionTimeoutMillis: 10000` and `idleTimeoutMillis: 30000` to the pool config to prevent hung connections
- [x] 🟢 Add a `pool.on('error', ...)` handler that logs the error with pino so unexpected pool errors don't silently swallow

---

## From PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION

### Phase 2.1 — `backend/repositories/BaseRepository.js` — SQL Injection via Column Names

- [x] 🔴 Go to `findAll()` line 36 — `key` from `Object.entries(filters)` is interpolated directly into SQL (`${key} = $n`); add a column whitelist check before using any filter key: `const allowedColumns = await this.getTableColumns(); if (!allowedColumns.includes(key)) continue;`
- [x] 🔴 Go to `create()` line 50 and `update()` line 66 — same column-name injection risk; add the same whitelist check for all keys from `Object.keys(data)`
- [x] 🟠 Add `church_id` support to `create(data, churchId)` — if `churchId` is provided, append it to the INSERT columns and values
- [x] 🟠 Make `church_id` parameter REQUIRED (not optional) in `findById`, `findAll`, `update`, and `delete` — change default `= null` to a required positional argument
- [x] 🟡 Add a `beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` method set to the base class so child repositories can do multi-step operations safely
- [x] 🟡 Add `softDelete(id, churchId)` method that sets `is_active = false, deleted_at = NOW()` instead of hard-deleting

### Phase 2.2 — `backend/repositories/SearchRepository.js` — No church_id on Any Query

- [x] 🔴 Add `churchId` parameter to ALL 15 search functions: `saveSearch`, `getSavedSearches`, `deleteSavedSearch`, `getMemberSuggestions`, `getContentSuggestions`, `getDepartmentSuggestions`, `searchMembers`, `searchContent`, `searchDepartments`, `searchDocuments`, `searchUsers`, `globalSearchMembers`, `globalSearchDocuments`, `globalSearchEvents`, `globalSearchAnnouncements`, `globalSearchDepartments`
- [x] 🔴 Add `AND church_id = $1` (or `AND m.church_id = $1`) to EVERY query in SearchRepository
- [x] 🔴 Fix line 125: `globalSearchMembers` queries the `users` table; change to `members` table — users are platform accounts, members are church-specific people
- [x] 🔴 Fix line 135: `globalSearchDocuments` uses `name` column; change to `title` column
- [x] 🔴 Fix ILIKE pattern — queries pass `searchTerm` directly without wrapping in `%`; change to `$1 = '%' || searchTerm || '%'`

### Phase 2.3 — `backend/repositories/UserRepository.js` — Missing church_id on Most Methods

- [x] 🔴 Add `churchId` param to `findByEmail(email, churchId)` and add `AND church_id = $2` when churchId is provided
- [x] 🔴 Add `churchId` param to `findByUsername(username, churchId)` and add `AND church_id = $2`
- [x] 🔴 Add `churchId` param to `findByPhone(phone, churchId)` and add `AND church_id = $2`
- [x] 🔴 Add `churchId` param to `findById(id, churchId)` and add `AND church_id = $2`
- [x] 🔴 Add `churchId` param to `findByResetToken(token, churchId)` — password reset tokens should be scoped to a church
- [x] 🔴 Add `churchId` as required first parameter to `getMemberDirectory(filters, churchId)` and add `WHERE u.church_id = $1` to the query
- [x] 🔴 Add `churchId` param to `getUserWithDepartments(id, churchId)` and add church filter to both user and department joins
- [x] 🔴 Add `churchId` param to `updateUserProfile(id, updates, churchId)` and add `AND church_id = $n` to the WHERE clause
- [x] 🔴 Add `churchId` param to `assignRole(userId, roleId, churchId)` — confirm user belongs to church before assigning role
- [x] 🔴 Add `churchId` param to `removeRole(userId, roleId, churchId)` — same check
- [x] 🔴 Add `churchId` param to `deactivateUser(id, churchId)` and `activateUser(id, churchId)` — add `AND church_id = $2`
- [x] 🟠 Fix line 96: validate `role` against an allowed list before interpolating into SQL
- [x] 🟡 Verify `generate_user_slug` PostgreSQL function exists in `complete_schema.sql`; if not, add it

### Phase 2.4 — `backend/repositories/UsersRepository.js` — N+1 Query and Wrong Column

- [x] 🔴 Fix `createUser()` line 156: change `password` column → `password_hash` to match the actual schema column name
- [x] 🟠 Fix N+1 in `updateUserRoles()` (lines 120–127): replace per-role `SELECT id FROM roles WHERE name = $1` queries inside a loop with a single `SELECT id, name FROM roles WHERE name = ANY($1)` bulk query
- [x] 🟠 Add `church_id` check to the `DELETE FROM user_roles` statement (line 118) — currently deletes all roles without verifying church ownership
- [x] 🟠 Add `churchId` param to `findByEmail`, `findByUsername`, `findByResetToken` (lines 8–30) — currently missing church scope
- [x] 🟠 Add `churchId` param to `updateResetToken` and `updatePassword` (lines 32–46)
- [x] 🟡 Make `church_id` non-optional in `getActiveUsers`, `getAllWithRoles`, `getUserByIdWithRoles` — change `= null` defaults to required params

### Phase 2.6 — `backend/repositories/DashboardRepository.js` — All church_id Optional

- [x] 🟠 Make `churchId` required (not optional) in ALL 17 methods: `getSummary`, `getAnnouncementCount`, `getMemberCount`, `getEventCount`, `getFinancialSummary`, `getPendingApprovals`, `getRecentPaymentsActivity`, `getRecentAnnouncements`, `getUpcomingEvents`, `getRecentMembers`, `getUserDepartmentAssignments`, `getUserPendingApprovals`, `getUserUpcomingEvents`, `getUserContributions`, `getUserAttendanceRate`, `getUserContributionRate`, `getUserActivityLevel`
- [x] 🟠 In `getRecentPaymentsActivity` (line 104): add `AND m.church_id = p.church_id` to the members JOIN to prevent cross-church member name leakage
- [x] 🟠 In `getRecentAnnouncements` (line 125): add `AND u.church_id = a.church_id` to the users JOIN
- [x] 🟠 In `getUserDepartmentAssignments` (line 184): add `JOIN departments d ON dm.department_id = d.id AND d.church_id = $2` to scope department membership to the correct church

### Phase 2.8 — `backend/repositories/SecurityRepository.js` — All Global, No church_id

- [x] 🔴 Add `churchId` parameter to `getSecurityLogs(limit, churchId)` and add `WHERE church_id = $1`
- [x] 🔴 Add `churchId` parameter to `getFailedLoginAttempts(churchId)` and add `WHERE church_id = $1`
- [x] 🔴 Add `churchId` parameter to `getBlockedIPs(churchId)` — IP blocks should be per-church
- [x] 🔴 Add `churchId` parameter to `blockIP(ipAddress, reason, blockedBy, churchId)` and include it in the INSERT
- [x] 🔴 Add `churchId` parameter to `unblockIP(ipAddress, churchId)` and add `AND church_id = $2` to the DELETE
- [x] 🔴 Fix `getSecuritySettings(churchId)` (line 60): change hardcoded `WHERE id = 1` → `WHERE church_id = $1` — settings must be per-church
- [x] 🔴 Fix `getSecurityAnalytics(churchId)`: add church_id filter; remove line 84 hardcoded `85 as compliance_score` — replace with real calculation
- [x] 🔴 Fix line 93 `getRecentSecurityEvents`: change column `timestamp` → `created_at` to match actual column name
- [x] 🟠 Add `churchId` parameter to `getActiveSessions(userId, churchId)` and `revokeAllUserSessions(userId, churchId)` — session management must respect church scope

### Phase 2.9 — `backend/repositories/ApprovalsRepository.js` — SQL Injection and Missing church_id

- [x] 🔴 Fix SQL injection in `getAll()` line 22: validate `filters.sort` against an allowlist `['created_at','updated_at','status','priority']` before interpolating into ORDER BY
- [x] 🟠 Add `churchId` parameter to `createWorkflow(data, churchId)` and include church_id in the INSERT (line 148–158)
- [x] 🟠 Add `churchId` parameter to `getActiveWorkflows(churchId)` and add `WHERE church_id = $1` (line 160–163)
- [x] 🟠 Add `churchId` parameter to `getApprovalAnalytics(churchId)` and add `WHERE church_id = $1` (line 165–177)
- [x] 🟠 Make `church_id` required (not optional) in `getAll`, `getById`, `create`, `updateStatus`, `getPendingCount`, `getByRequester`, `getWithDetails`
- [x] 🟡 Add check in `updateStatus` that `approverId !== request.requester_id` to prevent self-approval

### Phase 2.10 — `backend/repositories/ReconciliationRepository.js`

- [x] 🔴 Add `churchId` to `verifyTransaction(id, status, notes, userId, editHistory, churchId)` and add `AND church_id = $6` to the WHERE clause
- [x] 🔴 Add `churchId` to `findById(id, churchId)` and add `AND church_id = $2`
- [x] 🟡 Verify `uuid_generate_v4()` function exists in the database schema; if not, replace with `gen_random_uuid()`

---

## From PHASE 5 — DATABASE SCHEMA FIXES

### Phase 5.1 — Migration Files — UUID vs SERIAL Inconsistency

- [x] 🔴 Audit every table in `007_auth_tables.sql`, `008_permissions_schema.sql`, `004_gallery_schema.sql`, `005_fix_missing_columns.sql`, `006_settings_schema.sql`: any table using `SERIAL` for `id` must be changed to `UUID DEFAULT gen_random_uuid()` to match the main schema
- [x] 🔴 Any INT foreign key that references a UUID primary key must be changed to UUID — check `refresh_tokens.user_id`, `password_reset_tokens.user_id`, `auth_audit_log.user_id`, `role_permissions.permission_id`
- [x] 🔴 Add FOREIGN KEY constraints to all migration tables — they currently have none: `refresh_tokens.user_id REFERENCES users(id)`, `password_reset_tokens.user_id REFERENCES users(id)`, `gallery_photos.album_id REFERENCES gallery_albums(id)`, etc.
- [x] 🟠 Add `church_id UUID REFERENCES churches(id) ON DELETE CASCADE` column to: `refresh_tokens`, `password_reset_tokens`, `auth_audit_log`, `permissions`, `gallery_albums`, `gallery_photos`, `gallery_tags`, `gallery_photo_tags`, `gallery_comments`, `telegram_photos_cache`, `settings`
- [x] 🟠 Create a new migration file `009_add_church_id_to_all_tables.sql` that adds `church_id` columns and creates indexes on them for every table missing them
- [x] 🟠 Fix duplicate index definitions in `008_permissions_schema.sql` lines 27–28 — remove the duplicate `CREATE INDEX idx_role_permissions_permission_id`
- [x] 🟡 Update `backend/scripts/reset-db.js` to run migration files 004–009 after executing `complete_schema.sql` — currently migrations are never run during reset, making them orphaned

### Phase 5.2 — Settings Table — Global Instead of Per-Church

- [x] 🔴 Add `church_id UUID NOT NULL REFERENCES churches(id)` to the `settings` table
- [x] 🔴 Change the UNIQUE constraint from `UNIQUE(key)` to `UNIQUE(key, church_id)` so each church can have its own value for the same setting key
- [x] 🔴 Update all settings queries in `backend/repositories/SettingsRepository.js` (or equivalent) to add `WHERE church_id = $1`
- [ ] 🟠 Add a migration to copy the 30 default settings rows for each existing church (so no church loses its settings)
- [ ] 🟡 Add a settings inheritance model: if a church has no row for a key, fall back to the `default_settings` table (global defaults)

### Phase 5.3 — Orphaned Documents Table

- [x] 🟠 Confirm whether a `documents` table exists — it is referenced by `005_fix_missing_columns.sql` (adds `is_active` column) but no CREATE TABLE migration is present
- [x] 🟠 If missing, create `010_documents_schema.sql` with `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `church_id UUID REFERENCES churches(id)`, `title VARCHAR(255) NOT NULL`, `content TEXT`, `file_url VARCHAR(512)`, `is_active BOOLEAN DEFAULT true`, `created_by UUID REFERENCES users(id)`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- [x] 🟡 Add GIN index on `title` and `content` for full-text search

### Phase 5.4 — Gallery Schema Gaps

- [x] 🟠 Add ON DELETE CASCADE to `gallery_photos.album_id REFERENCES gallery_albums(id)` so deleting an album removes its photos
- [x] 🟠 Add ON DELETE CASCADE to `gallery_comments.photo_id REFERENCES gallery_photos(id)`
- [x] 🟠 Add ON DELETE CASCADE to `gallery_photo_tags.photo_id REFERENCES gallery_photos(id)`
- [ ] 🟡 Add `telegram_photos_cache` cleanup job: delete rows where `expires_at < NOW()` on a daily schedule

### Phase 5.5 — `complete_schema.sql` Verification

- [x] 🟠 Verify `generate_user_slug` function is defined in `complete_schema.sql` — used in `UserRepository.js` line 227; if missing, add it as a PostgreSQL function
- [x] 🟠 Verify `uuid_generate_v4()` is available — if using PostgreSQL 13+, replace with `gen_random_uuid()` which needs no extension
- [ ] 🟡 Add `created_at` and `updated_at` trigger on every table that doesn't already have `update_*_updated_at` triggers
- [ ] 🟢 Add a `db_version` table with a single row tracking the last applied migration version

---

## From PHASE 18 — ENVIRONMENT AND DEPLOYMENT

### Phase 18.3 — Database Migrations in CI

- [ ] 🟠 Add a migration runner step to `reset-db.js` that executes all SQL files in `backend/migrations/` in numeric order after `complete_schema.sql`
- [ ] 🟡 Add a migration version table `db_migrations(filename, applied_at)` and skip already-applied migrations
- [ ] 🟡 Add a `npm run migrate` script that runs only unapplied migrations (for production deployments without a full reset)

---

## From PHASE 1 (Second Pass — lines 1185+) — SQL Injection Risks

- [ ] 🔴 backend/controllers/customReport.controller.js — Remove all manual SQL string concatenation
- [ ] 🔴 backend/controllers/customReport.controller.js — Create backend/services/QueryBuilderService.js to safely build parameterized queries
- [ ] 🔴 backend/controllers/customReport.controller.js — Whitelist all allowed column names and table names
- [ ] 🔴 backend/controllers/customReport.controller.js — Use $1, $2, $n parameterized queries for all values

---

## From PHASE 2 (Second Pass — lines 1229+) — Database Schema Standardization

### Phase 2.1 — ID Type Standardization

- [ ] 🔴 backend/schema.sql — Document the current ID type used (UUID)
- [ ] 🔴 backend/migrations/001_auth_schema.sql — Change users.id from SERIAL to UUID DEFAULT gen_random_uuid()
- [ ] 🔴 backend/migrations/001_auth_schema.sql — Update all foreign keys referencing users.id to use UUID type
- [ ] 🔴 backend/migrations/003_members_schema.sql — Change members.user_id from INTEGER to UUID
- [ ] 🔴 backend/migrations/003_members_schema.sql — Update foreign key constraint to match new UUID type
- [ ] 🔴 All migration files — Run grep for SERIAL and evaluate whether to change to UUID
- [ ] 🟠 backend/scripts/setup-database.js — Verify setup script runs migrations in correct order
- [ ] 🟠 backend/scripts/migrate.js — Verify migrate script is compatible with setup-database.js

### Phase 2.4 — Missing Table & Column Fixes

- [ ] 🟠 backend/migrations/ — Create migration to add payment_methods table if it doesn't exist
- [ ] 🟠 backend/migrations/ — Create migration to standardize income_categories vs payment_categories naming
- [ ] 🟠 backend/schema.sql — Add members table definition if it is distinct from users
- [ ] 🟡 backend/migrations/ — Add GIN index on all JSONB columns (metadata, settings, permissions)
- [ ] 🟡 backend/migrations/ — Add composite index on (church_id, created_at) for all high-traffic tables
- [ ] 🟡 backend/migrations/ — Add composite index on (church_id, status) for approvals and documents

---

## From PHASE 3 (Second Pass — lines 1276+) — Backend Infrastructure

### Phase 3.3 — backend/config/database.js

- [ ] 🟠 backend/config/database.js — Change connectionTimeoutMillis from 2000 to 5000
- [ ] 🟠 backend/config/database.js — Change idleTimeoutMillis from current value to 30000
- [ ] 🟠 backend/config/database.js — Replace console.error in pool error handler with Pino logger
- [ ] 🟡 backend/config/database.js — Export a query(text, params) helper that logs query time
- [ ] 🟡 backend/config/database.js — Export a transaction(callback) helper for atomic operations
- [ ] 🟡 backend/config/database.js — Add max pool size config from environment variable DB_POOL_MAX

---

## From PHASE 6 (Second Pass — lines 1495+) — Backend Repositories Cleanup

### Phase 6.1 — backend/repositories/TreasuryRepository.js (splitting)

- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/AssetRepository.js and move all asset methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/VendorRepository.js and move all vendor methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/FundRepository.js and move all fund methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/AccountRepository.js and move all account methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/BudgetLineRepository.js and move all budget line methods
- [ ] 🟠 Update all references to TreasuryRepository throughout controllers and services
- [ ] 🟠 Confirm all new split repositories still add church_id filters
- [ ] 🟡 Delete original TreasuryRepository.js once all methods are migrated

### Phase 6.2 — backend/repositories/UserRepository.js & UsersRepository.js

- [ ] 🟠 Consolidate into single UserRepository.js
- [ ] 🟠 Confirm all methods in both files are preserved in the consolidated file
- [ ] 🟠 Update all imports throughout the codebase
- [ ] 🟠 Delete the duplicate file
- [ ] 🟡 Add findByChurchId(churchId) method

### Phase 6.3 — backend/repositories/DepartmentRepository.js & DepartmentsRepository.js

- [ ] 🟠 Consolidate into single DepartmentRepository.js
- [ ] 🟠 Fix N+1 query patterns (correlated subqueries)
- [ ] 🟠 Replace non-atomic role update (DELETE + INSERT loop) with single UPSERT
- [ ] 🟠 Update all imports throughout the codebase
- [ ] 🟡 Delete the duplicate file

### Phase 6.4 — backend/repositories/DashboardRepository.js

- [ ] 🔴 Implement getMinistryHealth(churchId) — SQL: JOIN members WITH attendance_records over 4 weeks
- [ ] 🔴 Implement getFinancialSummary(churchId) — SQL: SUM transactions by type for current month
- [ ] 🔴 Implement getSystemMetrics() — use process.memoryUsage() + SELECT 1 ping
- [ ] 🟠 Move all activity feed logic from dashboard.controller.js to here
- [ ] 🟡 Add caching on getFinancialSummary (invalidate on new transaction)

### Phase 6.5 — backend/repositories/SearchRepository.js

- [ ] 🔴 Add church_id filter to every single search method (currently zero isolation)
- [ ] 🔴 Add churchId parameter to all method signatures
- [ ] 🟠 Ensure full-text search uses indexed tsvector columns for performance
- [ ] 🟡 Add relevance scoring to results

### Phase 6.7 — backend/repositories/NotificationRepository.js

- [ ] 🟡 Add church_id filter to all queries
- [ ] 🟡 Add bulk insert method for batch notifications
- [ ] 🟡 Add cleanup method for old/read notifications

---

## From PHASE 1 (Second Pass — Destructive Script Safety, lines 1216+)

- [ ] 🔴 backend/scripts/reset-db.js — Add --confirm flag requirement before DROP SCHEMA executes
- [ ] 🔴 backend/scripts/reset-db.js — Add NODE_ENV check — block execution if NODE_ENV === 'production'
- [ ] 🔴 backend/scripts/reset-db.js — Add interactive readline prompt: "Type RESET to confirm database destruction:"
- [ ] 🔴 backend/scripts/reset-db.js — Add backup reminder message before execution
- [ ] 🔴 backend/scripts/check-documentation.js — Remove table creation logic — rename to setup-documentation.js or create separately
- [ ] 🔴 backend/scripts/delete-test-user.js — Add confirmation prompt before DELETE query runs
- [ ] 🔴 backend/scripts/delete-test-user.js — Add NODE_ENV check to block accidental production execution

---

## From APPENDIX A — QUICK-WIN TASKS

- [ ] 🟠 `UsersRepository.js` line 156: change `password` column → `password_hash`
- [ ] 🟠 `SecurityRepository.js` line 93: change `timestamp` column → `created_at`
- [ ] 🟠 `SearchRepository.js` line 125: change `FROM users` → `FROM members` in `globalSearchMembers`
- [ ] 🟠 `SearchRepository.js` line 135: change `name` column → `title` in `globalSearchDocuments`
- [ ] 🟠 `008_permissions_schema.sql` lines 27–28: remove duplicate index definition
- [ ] 🟠 `database.js` line 13: change `rejectUnauthorized: false` → `true`
