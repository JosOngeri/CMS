# KMainCMS Master Todo List — Hyper-Granular Implementation Tasks
**Generated:** 2026-07-09 (Deep Code Audit Edition)
**Sources:** Live subagent analysis of actual source files — controllers, repositories, middleware, migrations, models, routes, frontend hooks, contexts, and components
**Total Tasks:** 2000+
**Priority Levels:** 🔴 CRITICAL (runtime crash / security breach) | 🟠 HIGH (data leak / broken feature) | 🟡 MEDIUM (tech debt / partial stub) | 🟢 LOW (polish / optimization)

---

## HOW TO READ THIS LIST

Each task is one checkbox. Tasks are grouped by file or subsystem. Do them top-to-bottom within each phase — later tasks sometimes depend on earlier ones. Tasks marked 🔴 CRITICAL should be done before anything else in that file.

---

## PHASE 1 — CRITICAL RUNTIME CRASHES (Fix Before Anything Else)

### 1.1 `backend/middleware/auth.js` — Missing Import Crash

- [ ] 🔴 Open `backend/middleware/auth.js` and add `const { pool } = require('../config/database');` at line 1 (currently missing, causes crash at runtime when `requireDepartmentPermission` is called)
- [ ] 🔴 Locate line 150 in `auth.js` — the `permissions[permission]` check uses bracket notation but `permissions` is an array, not an object; change to `permissions.includes(permission)` to fix the always-failing check
- [ ] 🔴 Test `requireDepartmentPermission` middleware by calling a department-scoped route and confirming 200 for valid permission, 403 for invalid
- [ ] 🟠 Change in-memory LRU cache (lines 7–11, using `Map`) to track `timestamp` per entry so eviction is true LRU, not FIFO
- [ ] 🟠 Add `invalidateUserCache(userId)` export function that deletes the user's entry from `identityCache` — call this from any code that changes a user's roles or permissions
- [ ] 🟡 Move `MAX_CACHE_SIZE` to an env var `AUTH_CACHE_SIZE` with default 1000 so it can be tuned without a code deploy
- [ ] 🟡 Add a cache hit/miss log line at `debug` level so you can monitor cache effectiveness without affecting performance

### 1.2 `backend/services/reconciliationService.js` — Wrong Variable Name

- [ ] 🔴 Open `backend/services/reconciliationService.js`, go to line 188, change `pool.query(query, pending)` → `pool.query(query, params)` — `pending` is not defined in that scope; this crashes every call to `getUnreconciledPayments`
- [ ] 🔴 Go to line 220 in the same file, change `WHERE reconciled IS NULL` → `WHERE reconciled_at IS NULL` — the column name is `reconciled_at`, not `reconciled`; wrong name causes SQL error
- [ ] 🟠 Add `church_id` parameter to `getPaymentDetails(paymentId, churchId)` and add `AND church_id = $2` to the query so cross-tenant payment lookup is impossible
- [ ] 🟠 Wrap the reconciliation update in a `BEGIN / COMMIT / ROLLBACK` transaction block to prevent partial state if the process crashes mid-reconciliation
- [ ] 🟡 Add an `audit_log` INSERT inside `reconcilePayment()` that records `(payment_id, church_id, reconciled_by, reconciled_at, action='reconcile')` for financial audit trail
- [ ] 🟡 Add row-level locking (`SELECT ... FOR UPDATE`) before modifying a payment's reconcile state to prevent race conditions when two users reconcile simultaneously

### 1.3 `backend/services/IdentityService.js` — Require Inside Function

- [ ] 🔴 Open `backend/services/IdentityService.js`, move `const speakeasy = require('speakeasy');` from inside `validateMFA()` (line 144) to the top of the file — requiring inside a function works but is non-standard and will fail if module caching behaves unexpectedly under test
- [ ] 🟠 Change line 68 (`mfaVerified: false`) to read from the session: `mfaVerified: req.session?.mfaVerified || false` so the hardcoded false doesn't override a valid MFA session
- [ ] 🟡 Add rate limiting inside `validateMFA()`: track failed attempts per userId in Redis/memory, lock out after 5 failures for 15 minutes

### 1.4 `backend/middleware/tenantResolver.js` — SQL Injection

- [ ] 🔴 Open `backend/middleware/tenantResolver.js`, go to line 65, change `SET LOCAL app.current_church_id = '${req.church_id}'` → `pool.query('SET LOCAL app.current_church_id = $1', [req.church_id])` — string interpolation into SQL is an injection vector
- [ ] 🔴 Go to line 89 in the same file, apply the same parameterized fix for `SET LOCAL app.current_church_id = '${churchId}'`
- [ ] 🟠 Tighten slug validation regex on line 38: change `/^[a-z0-9-]+$/` → `/^[a-z0-9]+(-[a-z0-9]+)*$/` to disallow leading/trailing/consecutive hyphens
- [ ] 🟠 After fetching the church by slug (line 79), check `result.rows[0].status !== 'active'` and return 403 with `{ success: false, error: 'Church account is suspended' }` so suspended churches are blocked
- [ ] 🟡 Add a `tenantCache` Map with 10-minute TTL to cache slug→church_id lookups and avoid a DB hit on every request

### 1.5 `backend/config/passport.js` — Null-Pointer Crashes

- [ ] 🔴 Change line 19 `profile.emails[0].value` → `profile.emails?.[0]?.value || null` — crashes if Google returns no email
- [ ] 🔴 Change line 48 (Facebook strategy) with same optional chaining fix on emails array
- [ ] 🟠 Change `serializeUser` to store only `user.id` (not the whole object) — `done(null, user.id)`
- [ ] 🟠 Change `deserializeUser` to query the DB by id: `pool.query('SELECT * FROM users WHERE id = $1', [id])` and call `done(null, result.rows[0])`
- [ ] 🟡 Add `try/catch` around the deserialize DB query so a DB error calls `done(err, null)` instead of crashing

### 1.6 `backend/config/database.js` — SSL Misconfiguration

- [ ] 🟠 Change `ssl: { rejectUnauthorized: false }` → `ssl: { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }` in the production block — `rejectUnauthorized: false` leaves you open to MITM attacks
- [ ] 🟡 Add `connectionTimeoutMillis: 10000` and `idleTimeoutMillis: 30000` to the pool config to prevent hung connections
- [ ] 🟢 Add a `pool.on('error', ...)` handler that logs the error with pino so unexpected pool errors don't silently swallow

### 1.7 `backend/config/logging.js` — pino-pretty in Production

- [ ] 🟠 Wrap the `pino-pretty` transport in `process.env.NODE_ENV === 'development'` check so production logs are plain JSON (faster, easier to ship to log aggregators)
- [ ] 🟡 Add `pino.destination({ sync: false })` for async log flushing in production to avoid blocking the event loop

### 1.8 `backend/config/env-validation.js` — Wrong Variable Name

- [ ] 🟠 Change `criticalSecrets` array on line 48: replace `'DB_PASSWORD'` with `'PGPASSWORD'` — the required env vars use `PGPASSWORD` so the check was silently not working
- [ ] 🟠 Change `defaultPatterns` array (lines 49–55): replace broad `'secret'` and `'password'` entries with `'default_secret'`, `'default_password'`, `'example_secret'` to avoid false positives on legitimate variable names
- [ ] 🟡 Add validation for `GEMINI_API_KEY`, `REDIS_URL`, `SMTP_HOST`, `FRONTEND_URL` as required vars
- [ ] 🟡 Add validation that `JWT_SECRET` length is at least 32 characters

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.1 `backend/repositories/BaseRepository.js` — SQL Injection via Column Names

- [ ] 🔴 Go to `findAll()` line 36 — `key` from `Object.entries(filters)` is interpolated directly into SQL (`${key} = $n`); add a column whitelist check before using any filter key: `const allowedColumns = await this.getTableColumns(); if (!allowedColumns.includes(key)) continue;`
- [ ] 🔴 Go to `create()` line 50 and `update()` line 66 — same column-name injection risk; add the same whitelist check for all keys from `Object.keys(data)`
- [ ] 🟠 Add `church_id` support to `create(data, churchId)` — if `churchId` is provided, append it to the INSERT columns and values
- [ ] 🟠 Make `church_id` parameter REQUIRED (not optional) in `findById`, `findAll`, `update`, and `delete` — change default `= null` to a required positional argument
- [ ] 🟡 Add a `beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` method set to the base class so child repositories can do multi-step operations safely
- [ ] 🟡 Add `softDelete(id, churchId)` method that sets `is_active = false, deleted_at = NOW()` instead of hard-deleting

### 2.2 `backend/repositories/SearchRepository.js` — No church_id on Any Query

- [ ] 🔴 Add `churchId` parameter to ALL 15 search functions: `saveSearch`, `getSavedSearches`, `deleteSavedSearch`, `getMemberSuggestions`, `getContentSuggestions`, `getDepartmentSuggestions`, `searchMembers`, `searchContent`, `searchDepartments`, `searchDocuments`, `searchUsers`, `globalSearchMembers`, `globalSearchDocuments`, `globalSearchEvents`, `globalSearchAnnouncements`, `globalSearchDepartments`
- [ ] 🔴 Add `AND church_id = $1` (or `AND m.church_id = $1`) to EVERY query in SearchRepository
- [ ] 🔴 Fix line 125: `globalSearchMembers` queries the `users` table; change to `members` table — users are platform accounts, members are church-specific people
- [ ] 🔴 Fix line 135: `globalSearchDocuments` uses `name` column; change to `title` column
- [ ] 🔴 Fix ILIKE pattern — queries pass `searchQuery` directly; wrap in wildcards: `$2` value should be `%${query}%` not just `query`
- [ ] 🟠 Replace hardcoded `LIMIT 5` and `LIMIT 20` with a `limit` parameter defaulting to 20
- [ ] 🟡 Add a `search_history` table insert in `saveSearch` that records `(user_id, church_id, query, created_at)` for search analytics

### 2.3 `backend/repositories/UserRepository.js` — No church_id Anywhere

- [ ] 🔴 Add `churchId` param to `findByEmail(email, churchId)` and add `AND church_id = $2` when churchId is provided
- [ ] 🔴 Add `churchId` param to `findByUsername(username, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findByPhone(phone, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findByResetToken(token, churchId)` — password reset tokens should be scoped to a church
- [ ] 🔴 Add `churchId` as required first parameter to `getMemberDirectory(filters, churchId)` and add `WHERE u.church_id = $1` to the query
- [ ] 🔴 Add `churchId` param to `getUserWithDepartments(id, churchId)` and add church filter to both user and department joins
- [ ] 🔴 Add `churchId` param to `updateUserProfile(id, updates, churchId)` and add `AND church_id = $n` to the WHERE clause
- [ ] 🔴 Add `churchId` param to `assignRole(userId, roleId, churchId)` — confirm user belongs to church before assigning role
- [ ] 🔴 Add `churchId` param to `removeRole(userId, roleId, churchId)` — same check
- [ ] 🔴 Add `churchId` param to `deactivateUser(id, churchId)` and `activateUser(id, churchId)` — add `AND church_id = $2`
- [ ] 🟠 Fix line 96: validate `role` against an allowed list before interpolating into SQL
- [ ] 🟡 Verify `generate_user_slug` PostgreSQL function exists in `complete_schema.sql`; if not, add it

### 2.4 `backend/repositories/UsersRepository.js` — N+1 Query and Wrong Column

- [ ] 🔴 Fix `createUser()` line 156: change `password` column → `password_hash` to match the actual schema column name
- [ ] 🟠 Fix N+1 in `updateUserRoles()` (lines 120–127): replace per-role `SELECT id FROM roles WHERE name = $1` queries inside a loop with a single `SELECT id, name FROM roles WHERE name = ANY($1)` bulk query
- [ ] 🟠 Add `church_id` check to the `DELETE FROM user_roles` statement (line 118) — currently deletes all roles without verifying church ownership
- [ ] 🟠 Add `churchId` param to `findByEmail`, `findByUsername`, `findByResetToken` (lines 8–30) — currently missing church scope
- [ ] 🟠 Add `churchId` param to `updateResetToken` and `updatePassword` (lines 32–46)
- [ ] 🟡 Make `church_id` non-optional in `getActiveUsers`, `getAllWithRoles`, `getUserByIdWithRoles` — change `= null` defaults to required params

### 2.5 `backend/repositories/TreasuryRepository.js` — Optional church_id Everywhere

- [ ] 🔴 Fix `getAccountBalance(accountId, churchId)`: add `AND church_id = $2` — currently can access any church's account balance by ID
- [ ] 🔴 Fix `createAccount(data, churchId)`: complete the incomplete function (lines 193–200) and add `church_id` to the INSERT columns
- [ ] 🟠 Make `church_id` required (remove `= null` defaults) in: `getAccounts`, `getIncomeCategories`, `getExpenseCategories`, `getFinancialSummary`, `getTotalBalance`
- [ ] 🟠 Fix line 163: parameter numbering uses `params.length + 1` inside a loop which can produce wrong `$n` numbers — use a `paramCount` counter variable instead
- [ ] 🟡 Add UNIQUE constraint check before `createAccount` to prevent duplicate account numbers per church

### 2.6 `backend/repositories/DashboardRepository.js` — All church_id Optional

- [ ] 🟠 Make `churchId` required (not optional) in ALL 17 methods: `getSummary`, `getAnnouncementCount`, `getMemberCount`, `getEventCount`, `getFinancialSummary`, `getPendingApprovals`, `getRecentPaymentsActivity`, `getRecentAnnouncements`, `getUpcomingEvents`, `getRecentMembers`, `getUserDepartmentAssignments`, `getUserPendingApprovals`, `getUserUpcomingEvents`, `getUserContributions`, `getUserAttendanceRate`, `getUserContributionRate`, `getUserActivityLevel`
- [ ] 🟠 In `getRecentPaymentsActivity` (line 104): add `AND m.church_id = p.church_id` to the members JOIN to prevent cross-church member name leakage
- [ ] 🟠 In `getRecentAnnouncements` (line 125): add `AND u.church_id = a.church_id` to the users JOIN
- [ ] 🟠 In `getUserDepartmentAssignments` (line 184): add `JOIN departments d ON dm.department_id = d.id AND d.church_id = $2` to scope department membership to the correct church

### 2.7 `backend/repositories/TaxStatementRepository.js` — All Methods Missing church_id

- [ ] 🔴 Add `churchId` parameter to `getAllTaxStatements(filters, churchId)` and add `WHERE ts.church_id = $1` to the query
- [ ] 🔴 Add `churchId` parameter to `getTaxStatementById(id, churchId)` and add `AND ts.church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getTaxDeductiblePayments(memberId, taxYear, churchId)` and add `AND p.church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getMemberById(memberId, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `generateTaxStatement(memberId, taxYear, generatedBy, churchId)` and propagate it through all sub-calls
- [ ] 🟠 Fix line 157 variable name bug: `totalAmount` → `total_amount` to match the destructured parameter name
- [ ] 🟡 Add a check in `checkExistingStatement(memberId, taxYear, churchId)`: if statement already exists, return it instead of allowing a duplicate insert

### 2.8 `backend/repositories/SecurityRepository.js` — All Global, No church_id

- [ ] 🔴 Add `churchId` parameter to `getSecurityLogs(limit, churchId)` and add `WHERE church_id = $1`
- [ ] 🔴 Add `churchId` parameter to `getFailedLoginAttempts(churchId)` and add `WHERE church_id = $1`
- [ ] 🔴 Add `churchId` parameter to `getBlockedIPs(churchId)` — IP blocks should be per-church
- [ ] 🔴 Add `churchId` parameter to `blockIP(ipAddress, reason, blockedBy, churchId)` and include it in the INSERT
- [ ] 🔴 Add `churchId` parameter to `unblockIP(ipAddress, churchId)` and add `AND church_id = $2` to the DELETE
- [ ] 🔴 Fix `getSecuritySettings(churchId)` (line 60): change hardcoded `WHERE id = 1` → `WHERE church_id = $1` — settings must be per-church
- [ ] 🔴 Fix `getSecurityAnalytics(churchId)`: add church_id filter; remove line 84 hardcoded `85 as compliance_score` — replace with real calculation
- [ ] 🔴 Fix line 93 `getRecentSecurityEvents`: change column `timestamp` → `created_at` to match actual column name
- [ ] 🟠 Add `churchId` parameter to `getActiveSessions(userId, churchId)` and `revokeAllUserSessions(userId, churchId)` — session management must respect church scope

### 2.9 `backend/repositories/ApprovalsRepository.js` — SQL Injection and Missing church_id

- [ ] 🔴 Fix SQL injection in `getAll()` line 22: validate `filters.sort` against an allowlist `['created_at','updated_at','status','priority']` before interpolating into ORDER BY
- [ ] 🟠 Add `churchId` parameter to `createWorkflow(data, churchId)` and include church_id in the INSERT (line 148–158)
- [ ] 🟠 Add `churchId` parameter to `getActiveWorkflows(churchId)` and add `WHERE church_id = $1` (line 160–163)
- [ ] 🟠 Add `churchId` parameter to `getApprovalAnalytics(churchId)` and add `WHERE church_id = $1` (line 165–177)
- [ ] 🟠 Make `church_id` required (not optional) in `getAll`, `getById`, `create`, `updateStatus`, `getPendingCount`, `getByRequester`, `getWithDetails`
- [ ] 🟡 Add check in `updateStatus` that `approverId !== request.requester_id` to prevent self-approval

### 2.10 `backend/repositories/ReconciliationRepository.js` — Missing church_id on Updates

- [ ] 🔴 Add `churchId` to `verifyTransaction(id, status, notes, userId, editHistory, churchId)` and add `AND church_id = $6` to the WHERE clause — otherwise any user can verify any church's transactions
- [ ] 🔴 Add `churchId` to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🟡 Verify `uuid_generate_v4()` function exists in the database schema; if not, replace with `gen_random_uuid()` (available without extension in PostgreSQL 13+)

### 2.11 `backend/models/User.js` — Zero church_id Filtering

- [ ] 🔴 Add `churchId` parameter to `findByEmail(email, churchId)` and add `AND church_id = $2` when churchId is provided
- [ ] 🔴 Add `churchId` parameter to `findByUsername(username, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getAll(limit, offset, churchId)` and add `WHERE church_id = $3`
- [ ] 🔴 Add `churchId` parameter to `getDepartmentMembers(departmentId, churchId)` and add department's church_id join check
- [ ] 🟠 Add soft delete support: add `deletedAt` field to UPDATE instead of hard DELETE
- [ ] 🟡 Add `create(userData, churchId)` — include `church_id` in every INSERT so new users always belong to a church

---

## PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### 3.1 `backend/controllers/security.controller.js` — No Auth on Any Endpoint

- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `blockIP` route — currently ANY authenticated user can block IPs
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `unblockIP` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `revokeAllUserSessions` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `updateSecuritySettings` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `getSecuritySettings` route
- [ ] 🟠 Add `req.user.church_id` to all repository calls in this controller so security operations are scoped per church
- [ ] 🟠 Add input validation on `blockIP`: verify `ipAddress` matches `^(\d{1,3}\.){3}\d{1,3}$` before passing to repository
- [ ] 🟠 Add `church_id` filter to `getSecurityLogs`, `getFailedLoginAttempts`, `getBlockedIPs` calls
- [ ] 🟡 Add audit log entry to every security action (block/unblock/settings change) recording `(action, performed_by, ip_affected, church_id, timestamp)`

### 3.2 `backend/controllers/notifications.controller.js` — Anyone Can Create Notifications

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'First Elder'])` middleware to `createNotification` route — currently any user can create notifications for any other user
- [ ] 🔴 In `markAsRead(notificationId)`: add `AND user_id = req.user.id` to the query so users can only mark their own notifications as read
- [ ] 🔴 In `deleteNotification(notificationId)`: add `AND user_id = req.user.id` to the query — ownership check
- [ ] 🟠 Add input validation on `limit` parameter in `getNotifications` — cap at 100, reject negative values
- [ ] 🟠 Sanitize notification `title` and `message` fields to prevent stored XSS
- [ ] 🟡 Add rate limiting on `createNotification` endpoint (max 50 notifications per minute per user)

### 3.3 `backend/controllers/approvals.controller.js` — Delegation Stub and No Auth

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer'])` to `approveRequest` and `rejectRequest` routes — currently any user can approve any request
- [ ] 🔴 Implement `delegateRequest()` properly (line 199 is a stub): save `delegateTo` to the approval record's `delegated_to` column, send a notification to the delegate, update status to `'delegated'`
- [ ] 🔴 Add self-approval prevention: in `approveRequest`, check `approval.requester_id !== req.user.id` — if equal, return 403 `{ success: false, error: 'Cannot approve your own request' }`
- [ ] 🟠 Add church_id scope to all repository calls: pass `req.user.church_id` to every `ApprovalsRepository` method
- [ ] 🟠 Add input validation on `createApproval`: require `title` (string, 3–255 chars), `description` (string, 10–5000 chars), `request_type` (enum check)
- [ ] 🟠 Fire a notification when approval status changes — call `NotificationService.sendRealTimeNotification(requester_id, {...})` inside `approveRequest` and `rejectRequest`
- [ ] 🟡 Wire the workflow engine that is already imported (line 1) — on `createWorkflow`, actually call the engine to register the workflow steps

### 3.4 `backend/controllers/payments.controller.js` — No Role Check on Payment Creation

- [ ] 🔴 Verify `POST /` in `payments.routes.js` has a role check — currently any authenticated user can create payment records; add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` or at minimum `authenticateToken`
- [ ] 🔴 Add `church_id` scoping to all `getPayments`, `createPayment`, `updatePaymentStatus`, `getPledges`, `createPledge`, `addPledgePayment` calls — pass `req.user.church_id` to every repository method
- [ ] 🔴 In `updatePaymentStatus`: add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` — currently any user can change a payment's status
- [ ] 🟠 Add input validation on `createPayment`: require `amount` > 0 (number), `payment_date` (ISO date), `phone_number` matches E.164 format if provided, `payment_items` is non-empty array
- [ ] 🟠 Add validation that `status` in `updatePaymentStatus` is one of `['pending','completed','failed','cancelled','refunded']`
- [ ] 🟠 Add M-Pesa webhook signature verification: validate `X-Safaricom-Signature` header before processing any M-Pesa callback
- [ ] 🟡 Add duplicate payment prevention: check for identical `(member_id, amount, payment_date, church_id)` within a 5-minute window before inserting
- [ ] 🟡 Encrypt `phone_number` field at rest using `pgcrypto` or application-level AES before storing

### 3.5 `backend/controllers/members.controller.js` — No Auth on Delete

- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to `deleteMember` route — currently any authenticated user can delete any member
- [ ] 🔴 Change `deleteMember` to a SOFT delete: set `is_active = false, deleted_at = NOW()` instead of `DELETE FROM` — prevents permanent data loss
- [ ] 🟠 Add `church_id` filter to ALL member queries: `getAllMembers`, `getMemberById`, `createMember`, `updateMember` — pass `req.user.church_id`
- [ ] 🟠 Add input validation on `createMember`: require `first_name` and `last_name` (strings, 1–100 chars), validate `email` format, validate `phone` against E.164 pattern
- [ ] 🟠 Add duplicate check on `createMember`: query for existing member with same `(email, church_id)` or `(phone, church_id)` and return 409 if found
- [ ] 🟡 Add audit log insert on every member create/update/soft-delete recording `(member_id, changed_by, change_type, church_id, timestamp)`

### 3.6 `backend/controllers/users.controller.js` — Inconsistent Repository and No Auth

- [ ] 🔴 Fix inconsistent repository naming: pick ONE (`UserRepository` or `UsersRepository`) and use it everywhere — line 24 uses `UsersRepository` while line 189 uses `UserRepository`
- [ ] 🔴 Remove duplicate code blocks in `getUserById` (lines 59–80) and `createUser` (lines 116–126) — these appear to be copy-paste errors; consolidate into single implementation paths
- [ ] 🔴 Add `requireRole(['Super Admin'])` to `createUser`, `deleteUser`, `updateUser` routes — currently any user can manage other users
- [ ] 🟠 Add validation on `createUser`: require `email` (valid format), `password` (min 12 chars, complexity check), `role` (must be in allowed enum)
- [ ] 🟠 Add privilege escalation prevention: a user cannot assign a role higher than their own — if requester is `First Elder`, they cannot create `Super Admin` or `Pastor` users
- [ ] 🟠 Pass `req.user.church_id` to all repository calls in `getAllUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`
- [ ] 🟡 Add audit log on role assignment: record `(target_user_id, role_assigned, assigned_by, church_id, timestamp)`

### 3.7 `backend/controllers/search.controller.js` — SQL Injection and No church_id

- [ ] 🔴 Validate `query` length in `globalSearch`: add maximum 200 characters check alongside the existing 2-character minimum
- [ ] 🔴 Pass `req.user.church_id` to ALL search repository calls — currently searches return results from all churches
- [ ] 🟠 Add rate limiting specifically to `globalSearch` and `advancedSearch`: max 30 requests per minute per user
- [ ] 🟠 Add validation on `advancedSearch` filters: validate each filter key against an allowlist before passing to repository
- [ ] 🟡 Add search query sanitization: strip SQL metacharacters before constructing ILIKE queries
- [ ] 🟡 Log search queries to a `search_history` table `(user_id, church_id, query, result_count, created_at)` for analytics

### 3.8 `backend/controllers/auth.controller.js` — Multiple Critical Gaps

- [ ] 🔴 Wire up `validatePasswordStrength` on registration: it is imported on line 12 but never called; call it in `register()` before creating the user and return 400 if it fails
- [ ] 🔴 Replace direct SQL query in `register()` (lines 117–124) with the appropriate repository method — using raw queries bypasses validation layers
- [ ] 🔴 Add account lockout: after 5 failed login attempts for the same email, set `locked_until = NOW() + INTERVAL '15 minutes'` and return 429
- [ ] 🟠 Add check in `login()`: if `user.locked_until > NOW()`, return 429 with remaining lockout time
- [ ] 🟠 Validate `email` and `password` are present in `login()` before querying DB — return 400 if either is missing
- [ ] 🟠 On successful login, reset `failed_login_attempts` counter to 0
- [ ] 🟠 Add email verification flow: on `register()`, set `email_verified = false` and send a verification email with a signed token; add `POST /verify-email` handler that sets `email_verified = true`
- [ ] 🟡 In `logout()`: invalidate the refresh token in the DB (set `used = true`) not just clear the cookie — otherwise the refresh token can still be used after logout
- [ ] 🟡 Add `church_id` to the registration flow: require `church_id` or `church_slug` in the registration body and associate the new user with that church

### 3.9 `backend/controllers/dashboard.controller.js` — Stubs and No church_id

- [ ] 🔴 Add validation that `req.user.church_id` exists before any dashboard query — return 403 if missing
- [ ] 🟠 Pass `req.user.church_id` to ALL `DashboardRepository` method calls (currently missing in `getStats`, `getActivity`, `getPersonalStats`, `getPersonalStatus`, `getPersonalActivity`)
- [ ] 🟠 Fix line 115: change `activities.splice(limit)` → `activities.slice(0, limit)` — `splice` mutates the array in place and removes items; `slice` is the correct non-mutating version
- [ ] 🟠 Add `limit` validation in `getActivity` and `getPersonalActivity`: clamp between 1 and 100, reject negative values
- [ ] 🟠 Implement `getSystemHealth()` fully: instead of hardcoded stub values, query real metrics: DB connection pool status, last migration run date, memory usage, uptime, error rate from logs
- [ ] 🟡 Add Redis caching to `getStats()` with 60-second TTL — these aggregation queries are expensive and run on every dashboard load

### 3.10 `backend/controllers/treasury.controller.js` — No Authorization on Financial Data

- [ ] 🔴 Add `hasTreasuryAccess()` middleware from `treasurySecurity.js` to ALL treasury routes — currently treasury endpoints have no authorization guard beyond `identityGuard`
- [ ] 🔴 Add validation on `createTransaction`: require `amount` > 0, `transaction_type` in `['income','expense','transfer']`, `account_id` present
- [ ] 🔴 Add `church_id` to all repository calls — pass `req.user.church_id` to every `TreasuryRepository` call
- [ ] 🟠 Add double-entry validation on `createTransaction`: every income must credit an account, every expense must debit — reject if the accounting equation doesn't balance
- [ ] 🟠 Add audit logging to every financial write: INSERT into `audit_log` `(table_name, record_id, action, performed_by, church_id, old_value, new_value, timestamp)`
- [ ] 🟡 Add approval requirement for transactions above a configurable threshold (default `KES 50,000`): auto-create an approval request instead of directly committing the transaction

---

## PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

### 4.1 `backend/app.js` — Routes Missing identityGuard

- [ ] 🔴 Add `identityGuard` to `/api/announcements` route — currently mounted with only `generalLimiter`, no authentication
- [ ] 🔴 Add `identityGuard` to `/api/events` route — currently no identity guard
- [ ] 🔴 Add `identityGuard` to `/api/settings` route — settings should be authenticated
- [ ] 🔴 Add `identityGuard` to `/api/gallery` route — gallery content should be authenticated
- [ ] 🔴 Add `identityGuard` to `/api/comments` route — comments should require login
- [ ] 🔴 Add `identityGuard` to `/api/content` route — CMS content management requires auth
- [ ] 🔴 Add `identityGuard` to `/api/mpesa` route — M-Pesa callbacks need to be validated (add signature check instead of identity guard for webhooks)
- [ ] 🔴 Add `identityGuard` to `/api/department-features` route
- [ ] 🔴 Add `identityGuard` to `/api/palettes` route
- [ ] 🟠 Add `requireRole` middleware to sensitive admin routes that currently only have `identityGuard`: `/api/security`, `/api/audit-logs`, `/api/field-permissions`
- [ ] 🟠 Remove hardcoded `https://api.example.com` from CSP `connectSrc` (line 39) — replace with `process.env.API_ORIGIN`
- [ ] 🟠 Remove hardcoded IP `http://192.168.1.178:5180` from CORS allowed origins (line 78) — move to `process.env.DEV_IP_ADDRESS`
- [ ] 🟠 Remove hardcoded `'kmaincms.org'` from cookie domain (line 128) — replace with `process.env.BASE_DOMAIN`
- [ ] 🟠 Remove `'unsafe-inline'` from `styleSrc` CSP directive (line 35) — use nonces or hashes instead
- [ ] 🟡 Add request ID middleware (`uuid` per request) and attach to `req.requestId` for distributed tracing

### 4.2 `backend/routes/payments.routes.js` — No Role on POST /

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'Treasurer', 'First Elder'])` to `POST /` — any authenticated user currently can create a payment record
- [ ] 🟠 Add church_id filter note in comments for all routes so future developers know it must be passed from controller

### 4.3 `backend/routes/auth.routes.js` — Registration Without Church Context

- [ ] 🟠 Update `POST /register` to require `church_id` or `church_slug` in the body validation
- [ ] 🟠 Add `POST /verify-email` route and handler to complete the email verification flow
- [ ] 🟡 Scope `/audit-log` to return only the requesting user's own church's audit data

### 4.4 `backend/middleware/identityGuard.js` — Property Name Mismatch

- [ ] 🔴 Fix line 44: change `req.churchId` → `req.church_id` — `tenantResolver` sets `req.church_id` (underscore) but `identityGuard` reads `req.churchId` (camelCase), so the cross-tenant check never fires
- [ ] 🟠 Add session activity tracking after line 41: call `IdentityService.updateLastActivity(req.user.id, req.ip, req.headers['user-agent'])` to track last seen time
- [ ] 🟡 Add concurrent session limit check: if user already has 3 active sessions, reject new login with 429

### 4.5 `backend/middleware/treasurySecurity.js` — Deprecated API and Memory Rate Limiter

- [ ] 🟠 Fix line 31 and 119: change `req.connection.remoteAddress` → `req.socket.remoteAddress || req.ip` — `req.connection` is removed in Node 17+
- [ ] 🟠 Replace the in-memory rate limiter Map (lines 116–143) with a call to the existing `rateLimiter.js` `strictLimiter` to avoid divergent implementations
- [ ] 🟠 Move hardcoded treasury roles `['Super Admin', 'Pastor', 'First Elder', 'Treasurer']` (line 8) to `process.env.TREASURY_ROLES?.split(',')` with that array as fallback
- [ ] 🟠 Add CIDR range support to `ipWhitelist()` (line 33) using the `ipaddr.js` library — current exact-match only approach blocks legitimate office subnets with DHCP
- [ ] 🟡 Add a table existence check before `logTreasuryAction()` INSERT (line 60): query `information_schema.tables` for `audit_log` and log a warning if missing instead of crashing

### 4.6 `backend/middleware/rateLimiter.js` — In-Memory Only

- [ ] 🟠 Install `rate-limit-redis` package and configure a Redis store for ALL six limiters (`authLimiter`, `generalLimiter`, `strictLimiter`, `apiLimiter`, `passwordResetLimiter`, `uploadLimiter`) — in-memory only works for single-instance servers
- [ ] 🟠 Add a `skip` function to each limiter that bypasses rate limiting for IP addresses in `process.env.TRUSTED_IPS`
- [ ] 🟡 Add standardized rate-limit response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] 🟡 Add separate rate limits for authenticated vs anonymous users: authenticated users get 3× the anonymous limit

### 4.7 `backend/middleware/csrf.js` — Tokens Not Session-Bound

- [ ] 🟠 Bind CSRF tokens to the user session: incorporate `userId` and a timestamp into the token hash so stolen tokens can't be replayed across sessions
- [ ] 🟠 Add token regeneration after successful login (call `getCsrfToken` in the auth controller after `setUser`)
- [ ] 🟡 Move `maxAge: 7200000` to `process.env.CSRF_MAX_AGE` with 2-hour default
- [ ] 🟡 Move `EXEMPT_PATHS` array to `process.env.CSRF_EXEMPT_PATHS?.split(',')` with current list as fallback

### 4.8 `backend/middleware/roleGuard.js` — No Audit on Denial

- [ ] 🟡 Add `logger.warn(...)` log line in `hasRole()`, `hasPermission()`, `requireSuperAdmin()` when authorization fails — include `user.id`, `required roles/permissions`, `req.path`, and `req.ip` for security monitoring
- [ ] 🟡 Add hierarchical role support: define a role hierarchy map (`Super Admin > Pastor > First Elder > Treasurer > Department Head > Member`) and automatically satisfy lower-level role checks when a higher role is present

### 4.9 `backend/middleware/pagination.js` — DoS via Large Offset

- [ ] 🟠 Clamp `page` to `Math.max(1, Math.min(parseInt(req.query.page) || 1, 10000))` — unbounded page numbers cause PostgreSQL to compute huge OFFSET values, degrading DB performance
- [ ] 🟠 Enforce minimum `limit` of 1 and cap at `maxLimit` (default 100) — currently `Math.max(limit, 1)` allows limit=1 which can cause 1000s of DB calls for paginated data
- [ ] 🟡 Add a `validateSort(allowedFields)` middleware export that checks `req.query.sortBy` against a whitelist to prevent ORDER BY injection

### 4.10 `backend/middleware/validation.js` — Incomplete Security

- [ ] 🟠 Change `isMobilePhone('any')` on line 46 to a regex `^[+]?[1-9]\d{1,14}$` (E.164) for stricter phone validation
- [ ] 🟠 Add magic byte file validation to `validateFile()` (line 178): read the first 4 bytes of `req.file.buffer` and verify they match the declared MIME type — prevents MIME spoofing attacks
- [ ] 🟠 Extend `sanitizeInput()` (line 126) to strip JavaScript protocol URIs (`javascript:`) and event handler patterns (`onerror=`, `onload=`) in addition to HTML entity escaping
- [ ] 🟡 Add UUID validation helper to `commonValidations`: `id: param('id').isUUID(4).withMessage('Invalid ID format')`
- [ ] 🟡 Add password strength validation to `commonValidations.password`: require uppercase, lowercase, number, and special character in addition to 12-char minimum

---

## PHASE 5 — DATABASE SCHEMA FIXES

### 5.1 Migration Files — UUID vs SERIAL Inconsistency

- [ ] 🔴 Audit every table in `007_auth_tables.sql`, `008_permissions_schema.sql`, `004_gallery_schema.sql`, `005_fix_missing_columns.sql`, `006_settings_schema.sql`: any table using `SERIAL` for `id` must be changed to `UUID DEFAULT gen_random_uuid()` to match the main schema
- [ ] 🔴 Any INT foreign key that references a UUID primary key must be changed to UUID — check `refresh_tokens.user_id`, `password_reset_tokens.user_id`, `auth_audit_log.user_id`, `role_permissions.permission_id`
- [ ] 🔴 Add FOREIGN KEY constraints to all migration tables — they currently have none: `refresh_tokens.user_id REFERENCES users(id)`, `password_reset_tokens.user_id REFERENCES users(id)`, `gallery_photos.album_id REFERENCES gallery_albums(id)`, etc.
- [ ] 🟠 Add `church_id UUID REFERENCES churches(id) ON DELETE CASCADE` column to: `refresh_tokens`, `password_reset_tokens`, `auth_audit_log`, `permissions`, `gallery_albums`, `gallery_photos`, `gallery_tags`, `gallery_photo_tags`, `gallery_comments`, `telegram_photos_cache`, `settings`
- [ ] 🟠 Create a new migration file `009_add_church_id_to_all_tables.sql` that adds `church_id` columns and creates indexes on them for every table missing them
- [ ] 🟠 Fix duplicate index definitions in `008_permissions_schema.sql` lines 27–28 — remove the duplicate `CREATE INDEX idx_role_permissions_permission_id`
- [ ] 🟡 Update `backend/scripts/reset-db.js` to run migration files 004–009 after executing `complete_schema.sql` — currently migrations are never run during reset, making them orphaned

### 5.2 Settings Table — Global Instead of Per-Church

- [ ] 🔴 Add `church_id UUID NOT NULL REFERENCES churches(id)` to the `settings` table
- [ ] 🔴 Change the UNIQUE constraint from `UNIQUE(key)` to `UNIQUE(key, church_id)` so each church can have its own value for the same setting key
- [ ] 🔴 Update all settings queries in `backend/repositories/SettingsRepository.js` (or equivalent) to add `WHERE church_id = $1`
- [ ] 🟠 Add a migration to copy the 30 default settings rows for each existing church (so no church loses its settings)
- [ ] 🟡 Add a settings inheritance model: if a church has no row for a key, fall back to the `default_settings` table (global defaults)

### 5.3 Orphaned Documents Table

- [ ] 🟠 Confirm whether a `documents` table exists — it is referenced by `005_fix_missing_columns.sql` (adds `is_active` column) but no CREATE TABLE migration is present
- [ ] 🟠 If missing, create `010_documents_schema.sql` with `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `church_id UUID REFERENCES churches(id)`, `title VARCHAR(255) NOT NULL`, `content TEXT`, `file_url VARCHAR(512)`, `is_active BOOLEAN DEFAULT true`, `created_by UUID REFERENCES users(id)`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] 🟡 Add GIN index on `title` and `content` for full-text search

### 5.4 Gallery Schema Gaps

- [ ] 🟠 Add ON DELETE CASCADE to `gallery_photos.album_id REFERENCES gallery_albums(id)` so deleting an album removes its photos
- [ ] 🟠 Add ON DELETE CASCADE to `gallery_comments.photo_id REFERENCES gallery_photos(id)`
- [ ] 🟠 Add ON DELETE CASCADE to `gallery_photo_tags.photo_id REFERENCES gallery_photos(id)`
- [ ] 🟡 Add `telegram_photos_cache` cleanup job: delete rows where `expires_at < NOW()` on a daily schedule

### 5.5 `complete_schema.sql` Verification

- [ ] 🟠 Verify `generate_user_slug` function is defined in `complete_schema.sql` — used in `UserRepository.js` line 227; if missing, add it as a PostgreSQL function
- [ ] 🟠 Verify `uuid_generate_v4()` is available — if using PostgreSQL 13+, replace with `gen_random_uuid()` which needs no extension
- [ ] 🟡 Add `created_at` and `updated_at` trigger on every table that doesn't already have `update_*_updated_at` triggers
- [ ] 🟢 Add a `db_version` table with a single row tracking the last applied migration version

---

## PHASE 6 — BACKEND SERVICES FIXES

### 6.1 `backend/services/aiContentService.js` — No API Key Validation

- [ ] 🟠 Add startup validation: if `process.env.GEMINI_API_KEY` is not set, throw `new Error('GEMINI_API_KEY is required')` in the constructor instead of crashing at first use
- [ ] 🟠 Add null check on line 39: `Array.isArray(keyPoints) ? keyPoints.map(...) : []` before calling `.map()` to prevent crash on null/undefined input
- [ ] 🟠 Add prompt injection sanitization: before sending user content to Gemini, strip `ignore previous instructions`, `system:`, and other injection patterns
- [ ] 🟡 Add response caching: for identical inputs (`hash(prompt)`), return the cached response for 10 minutes to reduce API costs
- [ ] 🟡 Add retry with exponential backoff: wrap the Gemini API call in up to 3 retries with 1s, 2s, 4s delays on `429 Too Many Requests`
- [ ] 🟡 Add per-church API usage tracking: increment a counter in Redis for `gemini_usage:{church_id}:{date}` and reject if over a configurable daily limit
- [ ] 🟢 Add content moderation step: after receiving Gemini response, check for prohibited content categories before returning to the caller

### 6.2 `backend/services/notificationService.js` — Memory Leak and Crash

- [ ] 🔴 Fix line 210: add empty array guard before accessing `notifications[0].church_id` — `if (!notifications || notifications.length === 0) return;`
- [ ] 🟠 Fix line 178 `setInterval` without cleanup: store the interval reference and add a `cleanup()` method that calls `clearInterval(this.batchTimer)` — without this, restarting the service spawns multiple intervals
- [ ] 🟠 Add notification content length validation: reject `title` > 255 chars and `message` > 2000 chars to prevent DB errors
- [ ] 🟡 Add notification preferences check: before creating a notification, query `user_notification_preferences` and skip if the user has disabled that notification type
- [ ] 🟡 Add notification grouping: if the same `type_id` notification already exists unread for the user, increment a counter instead of creating a new row
- [ ] 🟢 Add notification expiration: auto-delete notifications older than 90 days via a scheduled job

### 6.3 `backend/services/IdentityService.js` — Cache and Session Issues

- [ ] 🟠 Add `updateLastActivity(userId, ip, userAgent)` method that upserts into a `user_sessions` table — needed by identityGuard
- [ ] 🟡 Add an in-process cache to `getIdentity()` with 60-second TTL to avoid querying the DB on every authenticated request
- [ ] 🟡 Add `invalidateIdentityCache(userId)` method and call it when user roles or permissions change

### 6.4 `backend/server.js` — Global Variable Anti-Pattern

- [ ] 🟠 Remove `global.io = io;` (line 96) and instead export `io` via `module.exports.io = io;` — global variables cause issues in tests and multi-instance deployments
- [ ] 🟠 Update all files that reference `global.io` to instead `require('../server').io`
- [ ] 🟠 Add file existence check before serving `index.html` SPA fallback (lines 68–73): `if (fs.existsSync(indexPath)) res.sendFile(indexPath); else res.status(503).json({ success: false, error: 'Frontend not built' })`
- [ ] 🟡 Add WebSocket connection authentication: on `connection` event, verify the socket's handshake auth token before allowing it to join rooms
- [ ] 🟡 Add WebSocket rate limiting: use `socket.io-redis-adapter` to track message rates per socket and disconnect abusive clients

---

## PHASE 7 — FRONTEND HOOKS FIXES

### 7.1 `frontend/src/hooks/useActivityFeed.js` — Empty useEffects (Completely Non-Functional)

- [ ] 🔴 Implement lines 92–96 (empty `autoFetch` useEffect): call `fetchActivities(api)` inside the effect when `autoFetch && departmentId` — without this the hook never loads data automatically
- [ ] 🔴 Implement lines 99–107 (empty polling useEffect): call `setInterval(() => fetchActivities(api), pollInterval)` inside and return a cleanup `clearInterval`
- [ ] 🔴 Get `api` from `useAuth()` inside the hook itself instead of requiring callers to pass it as a parameter — prevents callers from forgetting
- [ ] 🟠 Add error retry logic in `fetchActivities`: on failure, retry up to 2 times with a 1-second delay before setting the error state
- [ ] 🟡 Add optimistic update: immediately append a new activity to the local state before the server confirms, then revert on error

### 7.2 `frontend/src/hooks/useDataFetch.js` — Memory Leak

- [ ] 🟠 Add `AbortController` to `fetchData`: create `const controller = new AbortController()` before the fetch, pass `signal: controller.signal`, and return `() => controller.abort()` from the `useEffect` cleanup — without this, unmounted components still process responses
- [ ] 🟠 Fix URL construction bug on line 73: the current `${url}${url.includes('?') ? '&' : '?'}page=${page}` fails if the URL already has a `?page=` param — parse the URL properly or use `URLSearchParams`
- [ ] 🟡 Add retry logic with exponential backoff for network errors (not 4xx)
- [ ] 🟡 Add request deduplication: if an identical URL is already in-flight, return the same promise rather than firing a second request

### 7.3 `frontend/src/hooks/useFieldPermissions.js` — Dependency Array Bug

- [ ] 🟠 Wrap `fetchPermissions` in `useCallback([module, api])` so it has a stable reference
- [ ] 🟠 Add `fetchPermissions` to the `useEffect` dependency array (line 12) — the current empty-ish deps causes ESLint exhaustive-deps warning and can miss updates
- [ ] 🟡 Add a fallback: if the API call fails, return an empty permissions object with all fields readable but none writable
- [ ] 🟡 Add permissions cache with 5-minute TTL per `module` key to avoid fetching on every render

### 7.4 `frontend/src/hooks/usePermission.js` — Hardcoded Admin Roles

- [ ] 🟡 Move hardcoded `['Super Admin', 'Pastor', 'First Elder']` list (lines 59–61) to a constant in a shared config file `frontend/src/config/roles.js` so it's changed in one place
- [ ] 🟡 Add permission hierarchy: if user `hasPermission('manage_members')`, automatically also satisfy `hasPermission('view_members')` without needing explicit permission assignment
- [ ] 🟢 Add `useMemo` around expensive permission-check results that get called in render functions

---

## PHASE 8 — FRONTEND CONTEXT FIXES

### 8.1 `frontend/src/contexts/AuthContext.jsx` — No Token Refresh

- [ ] 🟠 Add token refresh logic: when the `api` interceptor receives a 401, call `POST /api/auth/refresh-token` with the refresh token cookie before clearing the user — currently a 401 immediately logs out the user even if the refresh token is valid
- [ ] 🟠 Add inactivity timeout: start a 30-minute timer on each API request; if it expires, call `logout()` and redirect to login
- [ ] 🟠 Improve cache key generation on line 46: use `JSON.stringify({method, url, params, data})` and hash it with a simple `djb2` function to prevent key collisions from URL/param ambiguity
- [ ] 🟡 Add request deduplication: if `api.get('/dashboard/stats')` is in-flight and another component calls the same endpoint, return the same promise rather than a second request
- [ ] 🟡 Add offline detection using `navigator.onLine` and a `window 'online'/'offline'` event listener — queue requests while offline and flush when connection resumes
- [ ] 🟢 Add request timeout: configure `axios` `timeout: 30000` (30 seconds) so hung requests don't block the UI forever

### 8.2 `frontend/src/contexts/ContentContext.jsx` — Uses Plain Axios

- [ ] 🟠 Replace all `axios.get`, `axios.post`, `axios.put`, `axios.delete` calls with `const { api } = useAuth()` and use `api.get`, `api.post`, etc. — plain axios bypasses CSRF token injection, auth headers, and the response cache
- [ ] 🟠 Add per-operation loading states: `isCreating`, `isUpdating`, `isDeleting` booleans in addition to the global `isLoading`
- [ ] 🟡 Add optimistic updates for `deleteContent`: immediately remove from local `content` state, then revert if the API call fails
- [ ] 🟡 Add pagination support: add `page`, `limit`, `totalCount` state and a `fetchPage(page)` function
- [ ] 🟡 Add content draft support: allow saving with `status: 'draft'` and separate draft list from published list

### 8.3 `frontend/src/contexts/TelegramContext.jsx` — Uses Plain Axios

- [ ] 🟠 Replace all plain `axios.*` calls with the AuthContext `api` instance (same fix as ContentContext)
- [ ] 🟠 Add per-operation loading states: `isPosting`, `isSyncing`, `isUpdating` per channel
- [ ] 🟡 Add message history state and a `fetchChannelHistory(channelId, limit)` function
- [ ] 🟡 Add channel analytics state and a `fetchChannelAnalytics(channelId)` function
- [ ] 🟡 Add webhook management: `createWebhook(channelId, url)` and `deleteWebhook(channelId)` functions

### 8.4 `frontend/src/contexts/ToastContext.jsx` — Hardcoded Timeout

- [ ] 🟡 Make timeout configurable per toast: `showToast(message, type, { duration: 5000 })` instead of always 3000ms
- [ ] 🟡 Add toast position configuration: accept `position: 'top-right' | 'bottom-center' | 'top-center'` and apply Tailwind class accordingly
- [ ] 🟡 Add stacking limit: automatically dismiss the oldest toast when more than 5 are queued
- [ ] 🟡 Add toast deduplication: if the same message is already visible, don't show it again
- [ ] 🟢 Replace inline styles (lines 36–58) with Tailwind CSS classes for consistency with the rest of the app
- [ ] 🟢 Add enter/exit CSS transition animations using Tailwind `transition`, `opacity`, `translate-y`

---

## PHASE 9 — FRONTEND COMPONENT FIXES

### 9.1 `frontend/src/components/common/DataTable.jsx` — Broken Selection and Stubbed Export

- [ ] 🔴 Fix row selection: change from index-based `Set(paginatedData.map((_, index) => index))` to ID-based `Set(paginatedData.map(row => row.id))` — index-based selection breaks when pagination changes the visible rows
- [ ] 🟠 Implement Excel export (line 109 stub): install `xlsx` package, add `XLSX.utils.json_to_sheet(data)` and `XLSX.writeFile(wb, 'export.xlsx')` in the Excel handler
- [ ] 🟠 Implement PDF export (line 109 stub): install `jspdf` and `jspdf-autotable`, add `doc.autoTable({ columns, body: data })` in the PDF handler
- [ ] 🟡 Add server-side sorting: when `onSortChange` prop is provided, call it with `{ key, direction }` instead of sorting locally so the parent can re-fetch
- [ ] 🟡 Add column visibility toggle: add a gear icon dropdown that shows/hides columns, storing the selection in `localStorage`
- [ ] 🟡 Add keyboard navigation: arrow keys to move between rows, Enter to activate row action
- [ ] 🟢 Add row expansion: accept an `expandedRowComponent` prop that renders below a row when it is clicked

### 9.2 `frontend/src/components/ErrorBoundary.jsx` — No Error Reporting

- [ ] 🟠 Replace `console.error(...)` in `componentDidCatch` (line 16) with a call to an error reporting API: `api.post('/api/logs/client-error', { error: error.message, stack: errorInfo.componentStack, url: window.location.href })`
- [ ] 🟡 Add `resetErrorBoundary` prop callback so parent components can trigger a recovery
- [ ] 🟡 Add `fallback` prop to accept a custom fallback UI instead of the hardcoded one
- [ ] 🟡 Fix `import.meta.env.DEV` check (line 31) — also check `process.env.NODE_ENV === 'development'` for non-Vite build compatibility

### 9.3 `frontend/src/components/ProtectedRoute.jsx` — Console Logs in Production

- [ ] 🟠 Remove or wrap all `console.log` statements (lines 10, 24, 37, 42) in `import.meta.env.DEV &&` conditions — these leak routing logic and auth state in production browser consoles
- [ ] 🟡 Make redirect paths configurable via props: `<ProtectedRoute redirectTo="/login">` instead of hardcoded `"/"`
- [ ] 🟡 Preserve the intended path as a `?redirect=` query param so after login the user is sent back to where they were going
- [ ] 🟢 Add role-based protection: accept a `requiredRoles` prop in addition to `permission` and `permissions`

### 9.4 `frontend/src/components/common/ProtectedComponent.jsx` — Stubbed Access Request

- [ ] 🟠 Implement `RequestAccessButton` `onClick` handler (line 119 `console.log` stub): call `api.post('/api/access-requests', { feature, requested_by: user.id })` and show a toast on success
- [ ] 🟡 Add loading state to `RequestAccessButton`: disable and show spinner after clicking until API responds
- [ ] 🟡 Track request status: store the pending request ID in state and change button text to `"Request Sent"` so users can't double-submit

### 9.5 `frontend/src/components/common/Loading.jsx` — Hardcoded Columns

- [ ] 🟡 Make `TableLoading` columns configurable: add `columns` prop (default 5) so the skeleton matches the actual table structure
- [ ] 🟢 Make `withLoading` HOC accept a `LoadingComponent` prop instead of always using `FullPageLoading`
- [ ] 🟢 Add `progress` prop to `FullPageLoading` for showing percentage on long operations

### 9.6 `frontend/src/components/common/StatsCard.jsx` — No States

- [ ] 🟡 Add `isLoading` prop: when true, show a skeleton pulse instead of the actual value
- [ ] 🟡 Add `error` prop: when set, show an error indicator with a retry button
- [ ] 🟡 Add `subtitle` prop for secondary description text below the value
- [ ] 🟢 Add `trendPeriod` prop (e.g., `"vs last week"`) to display alongside the change indicator

---

## PHASE 10 — DASHBOARD PAGES (Stubbed / Incomplete)

### 10.1 `frontend/src/pages/dashboard/` — Pastor Dashboard

- [ ] 🟠 Verify `PastorDashboard.jsx` fetches from `GET /api/dashboard/stats` with `church_id` in the request — confirm church data doesn't bleed across tenants
- [ ] 🟠 Add real attendance trend chart using fetched data — not hardcoded mock arrays
- [ ] 🟠 Add real giving trend chart using `GET /api/treasury/summary` data
- [ ] 🟠 Display pending approvals count badge (fetch from `GET /api/approvals/pending-count`)
- [ ] 🟡 Add real-time notification badge that updates via WebSocket when new approvals arrive
- [ ] 🟡 Add quick-action buttons: `Add Announcement`, `Create Event`, `Record Offering` — each navigating to the correct form

### 10.2 `frontend/src/pages/dashboard/` — Treasurer Dashboard

- [ ] 🟠 Verify `TreasuryDashboard.jsx` (or `TreasurerDashboard.jsx`) fetches all data from `GET /api/treasury/*` endpoints with proper church_id scoping
- [ ] 🟠 Implement real budget vs. actual chart using `GET /api/treasury/budgets` and `GET /api/treasury/summary` data
- [ ] 🟠 Implement fund balance table with live data from `GET /api/treasury/funds`
- [ ] 🟠 Show unreconciled transaction count badge from `GET /api/reconciliation/pending-count`
- [ ] 🟡 Add export button for financial summary PDF using `jsPDF`
- [ ] 🟡 Add date range picker for filtering all treasury widgets

### 10.3 `frontend/src/pages/dashboard/` — Super Admin Dashboard

- [ ] 🟠 Implement system health panel using `GET /api/dashboard/system-health` — display DB status, uptime, memory usage
- [ ] 🟠 Add cross-church stats view (Super Admin only): total churches, total users, total revenue
- [ ] 🟠 Display security events feed from `GET /api/security/logs?limit=10`
- [ ] 🟡 Add user activity heatmap (7-day rolling) using `GET /api/analytics/user-activity`

### 10.4 `frontend/src/pages/dashboard/` — Member Dashboard

- [ ] 🟠 Implement personal giving history using `GET /api/payments/my-payments`
- [ ] 🟠 Implement personal attendance record using user-specific dashboard endpoint
- [ ] 🟠 Show upcoming events the member is registered for
- [ ] 🟡 Add pledge progress bar: `pledged amount vs. paid amount` from `GET /api/payments/pledges`

### 10.5 `frontend/src/pages/dashboard/` — Department Head Dashboard

- [ ] 🟠 Implement department member list using `GET /api/departments/:id/members`
- [ ] 🟠 Implement department activity feed using `useActivityFeed` hook (after fixing the empty useEffects in Phase 7.1)
- [ ] 🟠 Display department pending approvals count
- [ ] 🟡 Add quick-add member to department button

---

## PHASE 11 — SEO AND TELEGRAM INTEGRATION

### 11.1 SEO Component / Page

- [ ] 🟠 Locate `SEO.jsx` or `SEOManager.jsx` and verify `react-helmet-async` is properly configured — confirm `<HelmetProvider>` wraps `<App>` in `main.jsx`
- [ ] 🟠 Ensure SEO meta tags are dynamically populated from `ContentContext.websiteSettings` for title, description, OG image
- [ ] 🟡 Add JSON-LD structured data for church events using `schema.org/Event`
- [ ] 🟡 Add canonical URL tag to prevent duplicate content indexing
- [ ] 🟢 Add automatic `og:image` dimension check (should be at least 1200×630px) and warn in dev mode if not met

### 11.2 Telegram Integration

- [ ] 🟠 Verify `backend/routes/telegram.routes.js` and `backend/controllers/telegram.controller.js` exist and are fully implemented
- [ ] 🟠 Implement `POST /channels/:id/post` to send a message via the Telegram Bot API using `process.env.TELEGRAM_BOT_TOKEN`
- [ ] 🟠 Implement `POST /channels/:id/sync` to fetch recent channel messages and store in `gallery_photos` or a `telegram_messages` table
- [ ] 🟠 Implement the Telegram webhook handler: verify `X-Telegram-Bot-Api-Secret-Token` header before processing incoming updates
- [ ] 🟡 Add photo upload to Telegram: when a gallery photo is marked `share_to_telegram: true`, use `sendPhoto` Telegram API method
- [ ] 🟡 Add scheduled post support: allow a `scheduled_at` datetime on channel posts and use a job scheduler (e.g., `node-cron`) to fire them

### 11.3 `frontend/src/components/WebSocketManager.jsx`

- [ ] 🟠 Add authentication to WebSocket connection: pass `auth: { token: csrfToken }` in the `socket.io-client` connect options
- [ ] 🟠 Add reconnection logic with exponential backoff: configure `reconnectionDelay: 1000`, `reconnectionDelayMax: 10000`, `reconnectionAttempts: 5`
- [ ] 🟠 Join church-specific rooms on connection: `socket.emit('join-church', { church_id: user.church_id })` so broadcasts are scoped
- [ ] 🟡 Add connection status indicator: expose `isConnected` boolean to the parent so UI can show a red/green dot
- [ ] 🟡 Add message queue: buffer outgoing messages while disconnected and flush on reconnect

### 11.4 `frontend/src/components/RealTimeActivityFeed.jsx`

- [ ] 🟠 Connect to WebSocket `activity` event: listen for `socket.on('new-activity', callback)` and prepend to the feed array
- [ ] 🟠 Add church_id room filtering: only process activities that match `activity.church_id === user.church_id`
- [ ] 🟡 Add virtual scrolling for long feeds using `react-window` or `react-virtual` to prevent DOM bloat
- [ ] 🟡 Add "X new activities" banner that appears when new items arrive while the user is scrolled down

---

## PHASE 12 — M-PESA AND PAYMENT INTEGRATION

### 12.1 M-Pesa Webhook Security

- [ ] 🔴 Add signature verification to `POST /api/mpesa/callback`: verify `X-Safaricom-Signature` header using Safaricom's public key before processing any callback data
- [ ] 🔴 Add `identityGuard` or IP whitelist to M-Pesa callback endpoint — only Safaricom IPs should be able to hit this endpoint
- [ ] 🟠 Store raw callback payload in `mpesa_raw_logs` table before processing so failed processing can be retried
- [ ] 🟠 Add idempotency: check `merchant_request_id` against existing records before inserting to prevent duplicate processing
- [ ] 🟡 Add M-Pesa STK push result handler: update payment status when push succeeds or fails

### 12.2 Payment Analytics

- [ ] 🟠 Implement `GET /api/payments/analytics` endpoint using real DB aggregations grouped by month
- [ ] 🟠 Implement `GET /api/payments/trends` endpoint returning 12-month giving trend data
- [ ] 🟡 Add `GET /api/payments/summary` breakdown by payment category (tithe, offering, building fund, etc.)
- [ ] 🟡 Implement refund flow: `POST /:paymentId/refund` → creates pending refund, `POST /refunds/:id/approve` → marks original payment as refunded and updates account balance

---

## PHASE 13 — REPORTS AND ANALYTICS

### 13.1 Treasury Reports

- [ ] 🟠 Implement `GET /api/treasury/reports/trial-balance` with real double-entry accounting query: debit total = credit total assertion
- [ ] 🟠 Implement `GET /api/treasury/reports/income-statement` grouped by category for a date range
- [ ] 🟠 Implement `GET /api/treasury/reports/balance-sheet` showing assets, liabilities, and equity
- [ ] 🟠 Implement `GET /api/treasury/reports/cash-flow` showing operating, investing, and financing cash flows
- [ ] 🟠 Implement `GET /api/treasury/reports/fund-balance` per fund/campaign
- [ ] 🟡 Add PDF export for each report using `pdfkit` or `puppeteer` on the backend
- [ ] 🟡 Add Excel export for each report using `exceljs`

### 13.2 Member Reports

- [ ] 🟠 Implement `GET /api/reports/membership-growth` returning month-over-month member count with `church_id` filter
- [ ] 🟠 Implement `GET /api/reports/attendance-trend` returning weekly attendance for the past 52 weeks
- [ ] 🟡 Implement `GET /api/reports/member-demographics` returning age group, gender, and location breakdowns
- [ ] 🟡 Add birthday report: `GET /api/members?filter=birthday_this_month` for pastoral care

### 13.3 Analytics Dashboard

- [ ] 🟠 Implement `GET /api/analytics/user-activity` returning daily active users for the past 30 days
- [ ] 🟠 Implement `GET /api/analytics/content-views` returning page view counts per content item
- [ ] 🟡 Add heatmap data endpoint: `GET /api/analytics/heatmap?period=7d` returning hourly activity counts

---

## PHASE 14 — SMS INTEGRATION

### 14.1 SMS Controller and Service

- [ ] 🟠 Verify `backend/controllers/sms.controller.js` exists and is fully implemented (not stubbed)
- [ ] 🟠 Verify `POST /api/sms/send` validates `recipients` (array of phone numbers, E.164 format), `message` (1–160 chars for single SMS), `church_id`
- [ ] 🟠 Add SMS delivery status tracking: after sending, poll the SMS gateway for delivery receipts and update `sms_messages.status`
- [ ] 🟠 Add SMS opt-out support: check `members.sms_opt_out = true` before sending and skip those recipients
- [ ] 🟡 Add bulk SMS batching: split large recipient lists into batches of 100 to avoid gateway timeouts
- [ ] 🟡 Add SMS templates: `GET /api/sms/templates` and `POST /api/sms/send-template` endpoints

### 14.2 SMS Hub

- [ ] 🟡 Verify `backend/routes/sms-hub.routes.js` aggregates multiple SMS providers (Africa's Talking, Twilio, etc.) behind a single interface
- [ ] 🟡 Add provider fallback: if primary SMS provider fails, automatically retry via secondary provider

---

## PHASE 15 — DOCUMENT MANAGEMENT

### 15.1 Document Upload and Approval

- [ ] 🟠 Verify `backend/routes/documents.routes.js` uses `uploadLimiter` and `multer` middleware correctly
- [ ] 🟠 Add file type validation on upload: allow only `pdf`, `doc`, `docx`, `xlsx`, `pptx` — reject other types
- [ ] 🟠 Add file size limit: reject files > 25MB before writing to disk/cloud storage
- [ ] 🟠 Add `church_id` to all document queries so documents from other churches are invisible
- [ ] 🟠 Implement `POST /api/document-approval/:id/approve` and `/:id/reject` — verify they create an audit entry
- [ ] 🟡 Add document versioning: on `PUT /api/documents/:id`, save the old content to `document_versions` table before overwriting
- [ ] 🟡 Add document search: add a full-text search index on `title` and `content` using PostgreSQL `to_tsvector`

---

## PHASE 16 — AUDIT LOGGING (Missing Everywhere)

### 16.1 Create Centralized Audit Service

- [ ] 🟠 Create `backend/services/auditService.js` with a `log(churchId, userId, action, tableName, recordId, oldValue, newValue)` function that inserts into `audit_log`
- [ ] 🟠 Create the `audit_log` table if not already in schema: `id UUID`, `church_id UUID`, `user_id UUID`, `action VARCHAR(50)`, `table_name VARCHAR(100)`, `record_id UUID`, `old_value JSONB`, `new_value JSONB`, `ip_address INET`, `user_agent TEXT`, `created_at TIMESTAMPTZ`
- [ ] 🟠 Add indexes on `audit_log`: `(church_id, created_at)`, `(user_id, created_at)`, `(table_name, record_id)`

### 16.2 Wire Audit Service into Controllers

- [ ] 🟠 Call `auditService.log(...)` in `members.controller.js` `createMember`, `updateMember`, `deleteMember`
- [ ] 🟠 Call `auditService.log(...)` in `users.controller.js` `createUser`, `updateUser`, `deleteUser`
- [ ] 🟠 Call `auditService.log(...)` in `treasury.controller.js` `createTransaction`, `approveTransaction`
- [ ] 🟠 Call `auditService.log(...)` in `approvals.controller.js` `approveRequest`, `rejectRequest`, `delegateRequest`
- [ ] 🟠 Call `auditService.log(...)` in `security.controller.js` `blockIP`, `unblockIP`, `updateSecuritySettings`
- [ ] 🟠 Call `auditService.log(...)` in `payments.controller.js` `createPayment`, `updatePaymentStatus`
- [ ] 🟡 Expose audit log to authorized users: `GET /api/audit-logs?table=members&recordId=xxx` — already mounted in `app.js`, verify the controller and repository are implemented

---

## PHASE 17 — TESTING

### 17.1 Backend Unit Tests

- [ ] 🟠 Write unit test for `auth.middleware.js` `requireDepartmentPermission`: test correct permission (200), wrong permission (403), missing pool (should not crash after fix)
- [ ] 🟠 Write unit test for `tenantResolver.js`: test valid slug (sets `req.church_id`), invalid slug (404), suspended church (403)
- [ ] 🟠 Write unit test for `reconciliationService.js` `getUnreconciledPayments`: confirm `params` variable is used (regression test for the `pending` bug)
- [ ] 🟠 Write unit test for `BaseRepository.js` `findAll`: confirm column name injection is blocked (SQL returns error for disallowed column names)
- [ ] 🟠 Write unit test for `SearchRepository.js` `globalSearchMembers`: confirm results only include records from the provided `church_id`
- [ ] 🟠 Write unit test for `auth.controller.js` `login`: test account lockout after 5 failed attempts
- [ ] 🟠 Write unit test for `payments.controller.js` `createPayment`: test that `amount <= 0` is rejected with 400
- [ ] 🟡 Write unit test for `treasurySecurity.js` `ipWhitelist`: test exact match allowed, non-listed IP blocked, CIDR range after fix

### 17.2 Backend Integration Tests

- [ ] 🟠 Write integration test: login as church A user, attempt to read church B member — confirm 403
- [ ] 🟠 Write integration test: create a payment as a regular member (should fail with 403 after fix)
- [ ] 🟠 Write integration test: create a security action (blockIP) as a non-admin — confirm 403 after fix
- [ ] 🟠 Write integration test: approve your own approval request — confirm 403 after fix
- [ ] 🟡 Write integration test: full registration flow including email verification
- [ ] 🟡 Write integration test: full treasury transaction with approval workflow

### 17.3 Frontend Unit Tests

- [ ] 🟠 Write test for `useActivityFeed.js`: mount hook, confirm `fetchActivities` is called on mount (tests the auto-fetch useEffect fix)
- [ ] 🟠 Write test for `DataTable.jsx`: select all rows on page 1, go to page 2 — confirm selection is by ID not index (after fix)
- [ ] 🟠 Write test for `ProtectedRoute.jsx`: confirm no `console.log` calls in production build
- [ ] 🟡 Write test for `AuthContext.jsx`: mock a 401 response and confirm token refresh is attempted before logout (after fix)

---

## PHASE 18 — ENVIRONMENT AND DEPLOYMENT

### 18.1 Environment Variables

- [ ] 🔴 Add `DB_CA_CERT` to `.env.example` — required for the SSL fix in `database.js`
- [ ] 🟠 Add `REDIS_URL` to `.env.example` — required for Redis rate limiter fix
- [ ] 🟠 Add `TELEGRAM_BOT_TOKEN` to `.env.example`
- [ ] 🟠 Add `TELEGRAM_WEBHOOK_SECRET` to `.env.example`
- [ ] 🟠 Add `GEMINI_API_KEY` to `.env.example`
- [ ] 🟠 Add `TRUSTED_IPS` to `.env.example` with a comment explaining format (`comma-separated IP list`)
- [ ] 🟠 Add `TREASURY_ROLES` to `.env.example` with default value
- [ ] 🟠 Add `DEV_IP_ADDRESS` to `.env.example` to replace hardcoded IP in `app.js`
- [ ] 🟠 Add `BASE_DOMAIN` to `.env.example` to replace hardcoded `kmaincms.org`
- [ ] 🟡 Add `CSRF_MAX_AGE` and `CSRF_COOKIE_NAME` to `.env.example`
- [ ] 🟡 Add `AUTH_CACHE_SIZE` to `.env.example`

### 18.2 Docker and CI

- [ ] 🟡 Add a Docker health check in `Dockerfile` that hits `GET /api/health` every 30 seconds
- [ ] 🟡 Add a GitHub Actions workflow step that runs `npm test` before allowing merges to main
- [ ] 🟡 Add a `docker-compose.yml` Redis service for local development rate-limiting and caching
- [ ] 🟢 Add `NODE_ENV` enforcement in start scripts: `production` start must not allow `NODE_ENV=development`

### 18.3 Database Migrations in CI

- [ ] 🟠 Add a migration runner step to `reset-db.js` that executes all SQL files in `backend/migrations/` in numeric order after `complete_schema.sql`
- [ ] 🟡 Add a migration version table `db_migrations(filename, applied_at)` and skip already-applied migrations
- [ ] 🟡 Add a `npm run migrate` script that runs only unapplied migrations (for production deployments without a full reset)

---

## PHASE 19 — CODE QUALITY AND TECH DEBT

### 19.1 Console.log Cleanup

- [ ] 🟡 Search codebase for all `console.log(` calls in frontend production code: `grep -r "console.log" frontend/src --include="*.jsx" --include="*.js"` — replace all with `import.meta.env.DEV && console.log(...)` guards
- [ ] 🟡 Search backend for debug `console.log` calls: replace with `logger.debug(...)` from the pino logger

### 19.2 Hardcoded Values

- [ ] 🟡 Search for all `'Super Admin'`, `'Pastor'`, `'First Elder'`, `'Treasurer'` string literals across the entire codebase — move to a shared `backend/config/roles.js` and `frontend/src/config/roles.js` constant files
- [ ] 🟡 Search for all hardcoded `LIMIT 5`, `LIMIT 10`, `LIMIT 20` in repository SQL queries — replace with a `limit` parameter

### 19.3 Error Messages

- [ ] 🟡 Audit all `catch (err)` blocks in controllers — ensure they call `next(err)` or return a structured `{ success: false, error: ... }` response, not an empty catch
- [ ] 🟡 Standardize all error response shapes to `{ success: false, error: string, details?: object, code?: string }` across all controllers

### 19.4 Dead Code

- [ ] 🟢 Remove commented-out blocks in `DataTable.jsx` lines 109 after implementing real Excel/PDF export
- [ ] 🟢 Search for any `// TODO`, `// FIXME`, `// HACK` comments across the codebase and file them as separate tasks

---

## PHASE 20 — FINAL VERIFICATION CHECKLIST

### 20.1 Security Verification

- [ ] 🔴 Confirm `pool` is imported in `auth.js` — check line 1 or 2 of the file after the fix
- [ ] 🔴 Confirm `req.church_id` (not `req.churchId`) is used in `identityGuard.js` line 44
- [ ] 🔴 Confirm `tenantResolver.js` uses parameterized queries for `SET LOCAL app.current_church_id`
- [ ] 🔴 Test that a user from Church A cannot see members of Church B after all church_id fixes
- [ ] 🔴 Test that any unauthenticated request to a previously unguarded route (`/api/settings`, `/api/gallery`, `/api/events`) now returns 401
- [ ] 🔴 Test that a regular member cannot approve an approval request
- [ ] 🔴 Test that a regular member cannot create a payment status change
- [ ] 🔴 Test that the `reconciliationService.getUnreconciledPayments` function does not crash (was `pending` bug)

### 20.2 Data Integrity Verification

- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM members WHERE church_id IS NULL` — should be 0 after fixes
- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM payments WHERE church_id IS NULL` — should be 0
- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM settings WHERE church_id IS NULL` — should be 0 after settings fix
- [ ] 🟠 Verify all 30 default settings exist for each church after the migration
- [ ] 🟡 Run `EXPLAIN ANALYZE` on the most common search query to confirm `church_id` index is being used

### 20.3 Frontend Verification

- [ ] 🟠 Open the Network tab and confirm no frontend API calls use plain `axios` (all should go through AuthContext `api` instance)
- [ ] 🟠 Confirm DataTable row selection persists correctly across page changes after the ID-based fix
- [ ] 🟠 Confirm `useActivityFeed` auto-loads data on mount (console should not show empty effects)
- [ ] 🟡 Check browser console for zero React `exhaustive-deps` warnings after dependency array fixes
- [ ] 🟡 Verify `ProtectedRoute` logs nothing to console in a production build

---

## APPENDIX A — QUICK-WIN TASKS (< 10 minutes each)

- [ ] 🔴 `auth.js` line 1: add `const { pool } = require('../config/database');`
- [ ] 🔴 `auth.js` line 150: change `permissions[permission]` → `permissions.includes(permission)`
- [ ] 🔴 `reconciliationService.js` line 188: change `pending` → `params`
- [ ] 🔴 `reconciliationService.js` line 220: change `reconciled IS NULL` → `reconciled_at IS NULL`
- [ ] 🔴 `tenantResolver.js` line 65: wrap church_id in parameterized query
- [ ] 🔴 `tenantResolver.js` line 89: same fix
- [ ] 🔴 `passport.js` line 19: add optional chaining to `profile.emails?.[0]?.value`
- [ ] 🔴 `identityGuard.js` line 44: change `req.churchId` → `req.church_id`
- [ ] 🟠 `dashboard.controller.js` line 115: change `activities.splice(limit)` → `activities.slice(0, limit)`
- [ ] 🟠 `env-validation.js` line 48: change `'DB_PASSWORD'` → `'PGPASSWORD'`
- [ ] 🟠 `logging.js` line 9: wrap pino-pretty in `NODE_ENV === 'development'` check
- [ ] 🟠 `IdentityService.js` line 144: move `require('speakeasy')` to top of file
- [ ] 🟠 `notificationService.js` line 210: add `if (!notifications?.length) return;` guard
- [ ] 🟠 `database.js` line 13: change `rejectUnauthorized: false` → `true`
- [ ] 🟠 `UsersRepository.js` line 156: change `password` column → `password_hash`
- [ ] 🟠 `TaxStatementRepository.js` line 157: change `totalAmount` → `total_amount`
- [ ] 🟠 `SecurityRepository.js` line 93: change `timestamp` column → `created_at`
- [ ] 🟠 `SearchRepository.js` line 125: change `FROM users` → `FROM members` in `globalSearchMembers`
- [ ] 🟠 `SearchRepository.js` line 135: change `name` column → `title` in `globalSearchDocuments`
- [ ] 🟠 `server.js` line 96: change `global.io = io` → `module.exports.io = io`
- [ ] 🟠 `payments.routes.js`: add role check to `POST /`
- [ ] 🟠 `008_permissions_schema.sql` lines 27–28: remove duplicate index definition
- [ ] 🟠 `useActivityFeed.js` lines 92–96: implement the empty auto-fetch useEffect
- [ ] 🟠 `useActivityFeed.js` lines 99–107: implement the empty polling useEffect
- [ ] 🟠 `ProtectedRoute.jsx` lines 10, 24, 37, 42: wrap console.logs in `import.meta.env.DEV &&`

---

## APPENDIX B — PHASE ORDER SUMMARY

| Phase | Focus | Risk if Skipped |
|-------|-------|-----------------|
| 1 | Runtime crash fixes | App crashes on those code paths |
| 2 | church_id isolation in repositories | Any user sees all churches' data |
| 3 | Controller authorization | Any user performs any action |
| 4 | Route security | Unauthenticated access to CMS, gallery, events |
| 5 | Schema fixes | Migrations never run; settings are global |
| 6 | Service bug fixes | Reconciliation crashes; memory leaks |
| 7 | Frontend hook fixes | Activity feed never loads; memory leaks |
| 8 | Frontend context fixes | CSRF not sent; no token refresh |
| 9 | Component fixes | Broken export; broken selection |
| 10 | Dashboard pages | Dashboards show stale/hardcoded data |
| 11 | SEO + Telegram | Broken Telegram integration |
| 12 | M-Pesa security | Webhook spoofing possible |
| 13 | Reports | Treasury reports return empty/wrong data |
| 14 | SMS | Bulk SMS to opt-out users |
| 15 | Documents | Upload with no type validation |
| 16 | Audit logging | No trail of who changed what |
| 17 | Testing | Regressions go undetected |
| 18 | Environment/Deploy | Config errors in production |
| 19 | Code quality | Technical debt compounds |
| 20 | Final verification | Unfixed issues shipped |

---

## PHASE 21 — DASHBOARD PAGES: CONCRETE FIXES FROM LIVE CODE AUDIT

### 21.1 `DepartmentHeadDashboard.jsx` — Two Backend Endpoints Missing

- [ ] 🔴 Create `GET /api/dashboard/department-health` route in `dashboard.routes.js` — this endpoint is called on line 54 of `DepartmentHeadDashboard.jsx` but does not exist in the backend; without it the health metrics always fall back to hardcoded zeros
- [ ] 🔴 Create the corresponding `getDepartmentHealth()` controller method in `dashboard.controller.js` that queries: average task completion rate, member participation count, and budget utilization percentage for the requesting user's department
- [ ] 🔴 Create `GET /api/dashboard/department-activity` route in `dashboard.routes.js` — called on line 62 of `DepartmentHeadDashboard.jsx` but does not exist in backend
- [ ] 🔴 Create the corresponding `getDepartmentActivity()` controller method that returns recent activity items filtered by `req.user.church_id` and the user's department(s)
- [ ] 🟠 Fix hardcoded `76%` health indicator on line 172 of `DepartmentHeadDashboard.jsx` — replace with calculated value from the new `department-health` endpoint response
- [ ] 🟠 Implement the `members` tab content in `DepartmentHeadDashboard.jsx` (currently empty) — fetch from `GET /api/departments/:id/members` and render a member list with role badges
- [ ] 🟠 Implement the `events` tab content — fetch from `GET /api/events?department=:id` and render upcoming event cards
- [ ] 🟠 Implement the `tasks` tab content — fetch from `GET /api/approvals?department=:id&status=pending` and render a task list with approve/reject buttons
- [ ] 🟠 Implement the `budget` tab content — fetch from `GET /api/treasury/budgets?department=:id` and render budget vs actual chart
- [ ] 🟡 Fix quick-action link `/departments/members/add` — verify this route exists in `dashboard.routes.jsx`; if not, create it or point to the correct existing route

### 21.2 `TreasuryDashboard.jsx` — Hardcoded Mock Financial Stats

- [ ] 🔴 Remove hardcoded mock stats on lines 53–60 of `TreasuryDashboard.jsx` (comment says "Use mock data for now since treasury stats endpoint doesn't exist") — replace with a real `GET /api/treasury/summary` call that returns `{ totalIncome, totalExpenses, netIncome, fundBalance }`
- [ ] 🔴 Implement `GET /api/treasury/summary` backend endpoint if it doesn't exist — should aggregate totals from `transactions` table filtered by `church_id` and optionally a date range
- [ ] 🟠 Fix hardcoded financial stats: `totalIncome`, `totalExpenses`, `netIncome`, `fundBalance`, `pendingExpenses`, `budgetVariance` must all come from the API, not literals
- [ ] 🟠 Implement `transactions` tab content in `TreasuryDashboard.jsx` — fetch from `GET /api/treasury/transactions` and render a filterable, paginated table
- [ ] 🟠 Implement `budgets` tab content — fetch from `GET /api/treasury/budgets` and render budget cards with progress bars
- [ ] 🟠 Implement `collections` tab content — fetch from `GET /api/payments?status=completed` grouped by category
- [ ] 🟠 Implement `reports` tab content — render links to trial balance, income statement, balance sheet reports with date range pickers
- [ ] 🟡 Fix quick-action links: `/dashboard/payments/process` and `/treasury/budgets/create` — verify these routes exist in `dashboard.routes.jsx` or update to correct paths

### 21.3 `TreasurerDashboard.jsx` — Backend Returns All Zeros

- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialStats()` method (lines 285–292) — it returns hardcoded zeros; replace with real queries: `SELECT SUM(amount) FROM payments WHERE church_id = $1 AND payment_date >= date_trunc('month', NOW())`
- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialHealth()` method (lines 305–308) — returns hardcoded zeros; implement real calculation: `budget_utilization = actual_spend / budget_total * 100`, `collection_rate = collected / expected * 100`
- [ ] 🔴 Fix `dashboard.controller.js` transactions endpoint (returns empty array) — implement `getRecentTransactions()` using `DashboardRepository.getRecentPaymentsActivity(10, churchId)`
- [ ] 🟠 Fix hardcoded `75%` health indicator on line 171 of `TreasurerDashboard.jsx` — calculate from real `financialHealth` API response: `Math.round((budgetUtilization + collectionRate) / 2)`
- [ ] 🟠 Implement `transactions` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `budgets` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `reports` tab with PDF/Excel export buttons

### 21.4 `PastorDashboard.jsx` — Missing Tab Content and Hardcoded Indicator

- [ ] 🟠 Fix hardcoded `85%` ministry health indicator on line 178 — calculate from real `ministryHealth` API response fields (`memberEngagement`, `departmentActivity`, `spiritualGrowth`)
- [ ] 🟠 Fix `GET /api/dashboard/ministry-health` response: the backend returns hardcoded `85, 92, 78` — implement real calculation using attendance records, department meeting logs, and small group participation
- [ ] 🟠 Implement `departments` tab content in `PastorDashboard.jsx` — fetch from `GET /api/departments` and render department health cards
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?status=pending` and render approval queue
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?upcoming=true` and render event calendar or list
- [ ] 🟠 Implement `members` tab content — fetch from `GET /api/members?status=active&limit=20` and render member highlights
- [ ] 🟡 Fix quick-action link `/reports/ministry` (line 146) — verify this route exists; if not, point to `/reports` instead
- [ ] 🟡 Add permission enforcement on quick action buttons: check `hasPermission('view_approvals')` etc. before rendering each button

### 21.5 `SuperAdminDashboard.jsx` — System Health Always Shows Healthy

- [ ] 🔴 Fix `dashboard.controller.js` `getSystemHealth()` (lines 237–242) — currently returns hardcoded `{ database: 'healthy', api: 'healthy', lastSync: new Date(), activeUsers: 0 }`; replace with real checks:
  - DB health: `SELECT 1` query with timeout check
  - API health: measure response time of the last 100 requests from logs
  - Active users: count sessions active in the last 15 minutes from `user_sessions` table
  - Last sync: query most recent entry in `audit_log`
- [ ] 🟠 Fix hardcoded system health display in `SuperAdminDashboard.jsx` — replace static `"healthy"` text with dynamic status from the API, colored red/yellow/green based on actual values
- [ ] 🟠 Implement `members` tab content in `SuperAdminDashboard.jsx` — fetch from `GET /api/members` and render paginated member table with filters
- [ ] 🟠 Implement `departments` tab content — fetch from `GET /api/departments` and render department status cards
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals` and render full approval queue with approve/reject buttons
- [ ] 🟠 Implement `analytics` tab content — render user activity chart, content views chart, payment trends chart
- [ ] 🟡 Fix quick-action link `/dashboard/admin/settings` — verify this route exists in `dashboard.routes.jsx`

### 21.6 `AdminDashboard.jsx` — API Path Missing `/api/` Prefix

- [ ] 🔴 Fix line 26 in `AdminDashboard.jsx`: change `GET /dashboard/stats` → `GET /api/dashboard/stats` — the missing `/api/` prefix will cause a 404 against the Express router
- [ ] 🟠 Replace hardcoded recent activity placeholder section (lines 220–261) with a real `GET /api/dashboard/activity?limit=10` call and render the returned items
- [ ] 🟡 Fix duplicate Tailwind class conflict on lines 120–124: `text-[var(--color-text)] text-white` — pick one; `text-white` overrides the CSS variable class

### 21.7 `MemberDashboard.jsx` — Mostly Real but Tab Content Missing

- [ ] 🟠 Fix hardcoded `85%` personal status indicator on line 165 — calculate from real `personalStatus` API response: `Math.round((attendanceRate + contributionRate + activityLevel) / 3)`
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?registered=me` and render upcoming events the member has joined
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?requester=me` and render the member's own approval requests with status
- [ ] 🟠 Implement `profile` tab content — render member's profile form using `GET /api/auth/profile` and allow editing name, phone, photo
- [ ] 🟡 Fix quick-action link `/approvals/submit` (verify route exists) and `/payments/my` (verify route exists)

### 21.8 `SEO.jsx` — Completely Stubbed, Needs Integration

- [ ] 🔴 Replace the stub placeholder in `frontend/src/pages/seo/SEO.jsx` with the actual `<SEOManager />` component from `frontend/src/components/seo/SEOManager.jsx` — the manager component is fully built but not connected to the page
- [ ] 🟠 Fix API prefix in `SEOManager.jsx`: confirm `GET /seo/settings`, `POST /seo/analyze`, `PUT /seo/settings` are mounted under `/api/seo/` in `app.js`; if not, update the URL strings

### 21.9 `Telegram.jsx` (frontend page) — Completely Stubbed Despite Full Backend

- [ ] 🔴 Rewrite `frontend/src/pages/telegram/Telegram.jsx` to use the existing `TelegramContext` — the backend has full Telegram endpoints but the frontend page just shows placeholder text for all tabs
- [ ] 🔴 Implement `campaigns` tab: fetch from `GET /api/telegram/channels` and render channel list with `Post to Channel` button per channel
- [ ] 🔴 Implement `templates` tab: fetch from `GET /api/sms/templates` (or a Telegram-specific endpoint) and render editable message templates
- [ ] 🟠 Implement `history` tab: fetch from `GET /api/telegram/channels/:id/history` (create if needed) and render message history per channel
- [ ] 🟠 Implement `analytics` tab: fetch from `GET /api/telegram/channels/:id/analytics` (create if needed) and render subscriber count, message open rate, reach

### 21.10 `WebSocketManager.jsx` — Completely Simulated

- [ ] 🔴 Replace the simulated connection (lines 12–16) in `WebSocketManager.jsx` with a real `socket.io-client` connection: `const socket = io(process.env.REACT_APP_API_URL, { auth: { token: csrfToken } })`
- [ ] 🔴 Replace the random `activeUsers` count (line 15) with a real value from the WebSocket server: listen for `server:active-users` event emitted by the backend
- [ ] 🟠 Implement room join on connect: `socket.emit('join-church', { church_id: user.church_id })` so the component only receives events for the correct church
- [ ] 🟠 Handle disconnect and reconnect: show a `Connection lost — reconnecting...` banner when `socket.on('disconnect')` fires
- [ ] 🟡 Expose `isConnected` boolean to parent components via the context or a returned value
- [ ] 🟡 Add connection status indicator dot (green = connected, red = disconnected, yellow = reconnecting) in the component UI

### 21.11 `RealTimeActivityFeed.jsx` — Fix API Prefix

- [ ] 🟠 Fix API path on line 24: change `GET /dashboard/activity` → `GET /api/dashboard/activity` — missing prefix causes 404
- [ ] 🟡 Replace `setInterval` auto-refresh (lines 16–19) with a WebSocket `socket.on('new-activity', ...)` listener once `WebSocketManager` is real — polling is less efficient than push
- [ ] 🟡 Add "X new items since last refresh" banner instead of silently replacing the feed when new data arrives

---

## PHASE 22 — ADDITIONAL CONCRETE FIXES (From All Subagents Combined)

### 22.1 Backend Dashboard Controller — Implement All Stub Methods

- [ ] 🔴 Implement `getSystemHealth()` in `dashboard.controller.js`: run `SELECT 1` query to verify DB, measure response latency, count active sessions, return structured health object
- [ ] 🔴 Implement `getFinancialStats()` in `dashboard.controller.js`: aggregate `SUM(amount) FROM payments WHERE church_id AND month = current_month` for income; `SUM(amount) FROM transactions WHERE type='expense' AND church_id AND month = current_month` for expenses
- [ ] 🔴 Implement `getFinancialHealth()` in `dashboard.controller.js`: calculate `budgetUtilization`, `collectionRate`, `expenseRatio` from real DB queries
- [ ] 🔴 Add `GET /api/dashboard/department-stats` response body: currently returns all zeros (lines 254–259); implement real query `SELECT COUNT(*) FROM department_members WHERE department_id = ANY(user_departments) AND church_id = $1`
- [ ] 🔴 Add `GET /api/dashboard/ministry-health` response body: implement real calculation using attendance data from `attendance_records`, department meeting completions, and giving participation rates

### 22.2 Dashboard Repository — Add Missing Query Methods

- [ ] 🟠 Add `getDepartmentHealth(userId, churchId)` to `DashboardRepository.js`: query task completion percentage, active member count, and budget utilization for the user's departments
- [ ] 🟠 Add `getDepartmentActivityFeed(userId, churchId, limit)` to `DashboardRepository.js`: query recent department events, member joins/leaves, budget changes
- [ ] 🟠 Add `getFinancialStatsSummary(churchId, startDate, endDate)` to `DashboardRepository.js`: aggregate income and expense totals from `payments` and `transactions` tables
- [ ] 🟠 Add `getMinistryHealth(churchId)` to `DashboardRepository.js`: calculate percentage of members with attendance in the last 4 weeks, departments with recent activity, and giving participation rate

### 22.3 Routing Verification

- [ ] 🟠 Verify `/reports/ministry` route exists in `frontend/src/router/dashboard.routes.jsx` — used as a quick-action link in `PastorDashboard.jsx`; if missing, create the route and a stub `MinistryReports.jsx` page
- [ ] 🟠 Verify `/dashboard/payments/process` route exists — used in `TreasuryDashboard.jsx`; if missing, point to `/payments/create` or the correct route
- [ ] 🟠 Verify `/dashboard/admin/settings` route exists — used in `SuperAdminDashboard.jsx`; if missing, point to `/settings` or create the route
- [ ] 🟠 Verify `/approvals/submit` route exists — used in `MemberDashboard.jsx`; if missing, point to `/approvals/new`
- [ ] 🟠 Verify `/payments/my` route exists — used in `MemberDashboard.jsx`; verify or alias to `/payments?filter=mine`
- [ ] 🟡 Add a `RouteGuard` that checks if a quick-action route exists before rendering the button — avoids dead links showing to users

### 22.4 Dashboard Health Indicators — Make All Dynamic

- [ ] 🟠 `PastorDashboard.jsx` line 178: replace hardcoded `85` with `Math.round((ministryHealth.memberEngagement + ministryHealth.departmentActivity + ministryHealth.spiritualGrowth) / 3)`
- [ ] 🟠 `TreasurerDashboard.jsx` line 171: replace hardcoded `75` with `Math.round((financialHealth.budgetUtilization + financialHealth.collectionRate) / 2)`
- [ ] 🟠 `DepartmentHeadDashboard.jsx` line 172: replace hardcoded `76` with `Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)`
- [ ] 🟠 `MemberDashboard.jsx` line 165: replace hardcoded `85` with `Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)`

### 22.5 Permission Enforcement on Quick Actions

- [ ] 🟡 In `PastorDashboard.jsx`: wrap each quick-action button in `<ProtectedComponent permission="...">` — the `permission` prop is defined in the actions array but never enforced in the render loop
- [ ] 🟡 In `TreasurerDashboard.jsx`: add `hasPermission('create_transaction')` check before rendering `Process Payment` quick action
- [ ] 🟡 In `SuperAdminDashboard.jsx`: add `requireRole('Super Admin')` check before rendering admin quick actions
- [ ] 🟡 In `DepartmentHeadDashboard.jsx`: add `hasPermission('manage_department')` check before rendering department management actions

---

## APPENDIX C — COMPLETE STUB INVENTORY (All Files Confirmed Stubbed)

| File | Stub Type | What's Missing |
|------|-----------|----------------|
| `SEO.jsx` | Full placeholder | No functionality — just text |
| `Telegram.jsx` | Full placeholder | All tabs are placeholder text |
| `WebSocketManager.jsx` | Simulated | Fake random data, no real socket |
| `TreasuryDashboard.jsx` stats | Mock data comment | Real treasury summary endpoint |
| `TreasurerDashboard.jsx` backend | All-zero returns | Real financial queries |
| `DepartmentHeadDashboard.jsx` | Missing endpoints | `department-health` and `department-activity` routes |
| `getSystemHealth()` backend | Hardcoded healthy | Real DB + API health checks |
| `getFinancialStats()` backend | Hardcoded zeros | Real payment aggregations |
| `getFinancialHealth()` backend | Hardcoded zeros | Real budget/collection calculations |
| `dashboard.controller.js getSystemHealth` | Hardcoded | Real system metrics |
| All dashboard tab content (except overview) | Empty | Full tab implementations |
| `approvals.controller.js delegateRequest()` | console.log | Real delegation logic |
| `ProtectedComponent RequestAccessButton` | console.log | Real API call |
| `DataTable.jsx` Excel/PDF export | Comment placeholder | xlsx and jsPDF implementation |

---

## APPENDIX D — UPDATED QUICK-WIN LIST (From Dashboard Audit)

- [ ] 🔴 `AdminDashboard.jsx` line 26: change `/dashboard/stats` → `/api/dashboard/stats`
- [ ] 🔴 `RealTimeActivityFeed.jsx` line 24: change `/dashboard/activity` → `/api/dashboard/activity`
- [ ] 🔴 Replace `SEO.jsx` placeholder body with `<SEOManager />` component
- [ ] 🟠 `PastorDashboard.jsx` line 178: replace `85` with calculated value
- [ ] 🟠 `TreasurerDashboard.jsx` line 171: replace `75` with calculated value
- [ ] 🟠 `DepartmentHeadDashboard.jsx` line 172: replace `76` with calculated value
- [ ] 🟠 `MemberDashboard.jsx` line 165: replace `85` with calculated value
- [ ] 🟠 `dashboard.controller.js` `getFinancialStats()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `dashboard.controller.js` `getFinancialHealth()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `dashboard.controller.js` `getDepartmentStats()` lines 254–259: replace zeros with real SQL

---

*Last updated: 2026-07-09 — Generated from deep live code analysis of actual source files (controllers, repositories, middleware, migrations, models, routes, hooks, contexts, components, and dashboard pages)*

KMainCMS Master Todo List — Hyper-Granular Implementation Tasks
Generated: 2026-07-08
Sources: Master_Audit_map_refactored, GRANULAR_AUDIT_CLUSTERS.md, GRANULAR_AUDIT_CLUSTERS - Copy.md, GRANULAR_AUDIT_CLUSTERS - Copy (2).md, CODEBASE_AUDIT_PROTOCOL.md, LEAN_ARCHITECTURE_REPORT.md, DEEP_GAP_ANALYSIS.md, GRANULAR_TASK_LIST.md, IMPLEMENTATION_PLAN.md, AUDIT_RESULTS.md
Total Tasks: 2000+
Priority Levels: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

HOW TO USE THIS LIST
Tasks are grouped by file so you know exactly where to make each change
Priority: 🔴 = fix today, 🟠 = fix this week, 🟡 = fix this month, 🟢 = fix when possible
Check off tasks with [x] as you complete them
Each task tells you the file name and exactly what to do
═══════════════════════════════════════════
PHASE 1 — CRITICAL SECURITY FIXES
Fix these first — they are real security risks
═══════════════════════════════════════════
1.1 Multi-Tenant Isolation (church_id enforcement)
These files don't filter data by church — meaning one church could see another church's data

[ ] 🔴 backend/repositories/SearchRepository.js — Add AND church_id = $n to ALL SELECT queries — currently zero tenant isolation
[ ] 🔴 backend/repositories/SearchRepository.js — Add churchId parameter to searchAll() method signature
[ ] 🔴 backend/repositories/SearchRepository.js — Add churchId parameter to searchMembers() method signature
[ ] 🔴 backend/repositories/SearchRepository.js — Add churchId parameter to searchDepartments() method signature
[ ] 🔴 backend/repositories/SearchRepository.js — Add churchId parameter to searchEvents() method signature
[ ] 🔴 backend/repositories/SearchRepository.js — Add churchId parameter to searchDocuments() method signature
[ ] 🔴 backend/repositories/TaxStatementRepository.js — Add AND church_id = $n to all queries
[ ] 🔴 backend/repositories/TaxStatementRepository.js — Add churchId to getByMember() method
[ ] 🔴 backend/repositories/TaxStatementRepository.js — Add churchId to getByYear() method
[ ] 🔴 backend/repositories/TaxStatementRepository.js — Add churchId to getAll() method
[ ] 🔴 backend/repositories/SecurityRepository.js — Add AND church_id = $n to all queries
[ ] 🔴 backend/repositories/SecurityRepository.js — Add churchId to getSecurityLogs() method
[ ] 🔴 backend/repositories/SecurityRepository.js — Add churchId to getFailedLogins() method
[ ] 🔴 backend/repositories/SecurityRepository.js — Add churchId to getSuspiciousActivity() method
[ ] 🔴 backend/models/Transaction.js — Add church_id column to model definition
[ ] 🔴 backend/models/Transaction.js — Add church_id to all INSERT queries
[ ] 🔴 backend/models/Transaction.js — Add church_id filter to all SELECT queries
[ ] 🔴 backend/models/Budget.js — Add church_id column to model definition
[ ] 🔴 backend/models/Budget.js — Add church_id to all INSERT queries
[ ] 🔴 backend/models/Budget.js — Add church_id filter to all SELECT queries
[ ] 🔴 backend/models/FixedAsset.js — Add church_id to model definition and all queries
[ ] 🔴 backend/models/Vendor.js — Add church_id to model definition and all queries
[ ] 🔴 backend/models/JournalEntry.js — Add church_id to model definition and all queries
[ ] 🔴 backend/models/Fund.js — Add church_id to model definition and all queries
[ ] 🔴 backend/models/Account.js — Add church_id to model definition and all queries
[ ] 🔴 backend/models/TaxStatement.js — Add church_id to model definition and all queries
[ ] 🔴 backend/repositories/BaseRepository.js — Add mandatory church_id enforcement — throw error if churchId not passed to any SELECT/INSERT/UPDATE/DELETE
[ ] 🔴 backend/repositories/BaseRepository.js — Add helper method withChurch(query, churchId) that appends the AND church_id = $n clause automatically
[ ] 🔴 backend/migrations/007_auth_tables.sql — Add church_id column to refresh_tokens table
[ ] 🔴 backend/migrations/007_auth_tables.sql — Add church_id column to password_reset_tokens table
[ ] 🔴 backend/migrations/007_auth_tables.sql — Add church_id column to mfa_codes table
[ ] 🔴 backend/migrations/007_auth_tables.sql — Add foreign key constraint REFERENCES churches(id) on all three new church_id columns
[ ] 🔴 backend/repositories/TreasuryRepository.js — Add churchId enforcement to all 40+ methods
[ ] 🔴 backend/repositories/TreasuryDashboardRepository.js — Confirm all CTE queries filter by church_id
[ ] 🔴 backend/repositories/ReconciliationRepository.js — Add church_id to all queries
1.2 Authentication & Authorization Vulnerabilities
[ ] 🔴 backend/middleware/treasurySecurity.js — Replace MFA placeholder with real enforcement logic
[ ] 🔴 backend/middleware/treasurySecurity.js — Add if (!mfaVerified) return res.status(403).json({ error: 'MFA required' }) before passing to next()
[ ] 🔴 backend/middleware/treasurySecurity.js — Read MFA status from database, not from a flag in memory
[ ] 🔴 backend/middleware/treasurySecurity.js — Add audit log entry when MFA check is triggered
[ ] 🔴 backend/middleware/treasurySecurity.js — Test that treasury routes are actually blocked without MFA
[ ] 🔴 frontend/src/hooks/useDataFetch.js — Replace native fetch with the existing auth-api axios instance
[ ] 🔴 frontend/src/hooks/useDataFetch.js — Ensure auth token is automatically attached on every request
[ ] 🔴 frontend/src/hooks/useDataFetch.js — Ensure CSRF token is automatically attached on every request
[ ] 🔴 frontend/src/hooks/useDataFetch.js — Add 401 auto-logout handler
[ ] 🔴 frontend/src/hooks/useDataFetch.js — Add request/response error logging
[ ] 🔴 backend/middleware/csrf.js — Remove automatic Bearer token exemption that bypasses CSRF check
[ ] 🔴 backend/middleware/csrf.js — Validate that both Bearer token AND CSRF token are present for mutation endpoints
[ ] 🔴 backend/middleware/auth.js — Add church_id to the identity object returned by getIdentity()
[ ] 🔴 backend/middleware/auth.js — Implement Redis LRU cache for getIdentity() with 5-minute TTL
[ ] 🔴 backend/middleware/auth.js — Add cache invalidation when user role changes
[ ] 🔴 backend/middleware/auth.js — Add cache invalidation on logout
[ ] 🔴 frontend/src/components/common/ProtectedRoute.jsx — Add role-based enforcement (currently only checks authenticated)
[ ] 🔴 frontend/src/components/common/ProtectedComponent.jsx — Add role-based enforcement (currently only checks authenticated)
[ ] 🔴 frontend/src/router/dashboard.routes.jsx — Add roles property to every route definition
[ ] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /treasury/* routes in RoleGuard(['Treasurer', 'Super Admin'])
[ ] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /admin/* routes in RoleGuard(['Super Admin'])
[ ] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /departments/* routes in RoleGuard(['Dept Head', 'Super Admin'])
[ ] 🔴 Create frontend/src/components/common/RoleGuard.jsx — Component that reads user role and redirects if unauthorized
[ ] 🔴 frontend/src/pages/treasury/TreasuryDashboard.jsx — Add role guard check at page level
[ ] 🔴 frontend/src/pages/treasury/Transactions.jsx — Add role guard check at page level
[ ] 🔴 frontend/src/pages/treasury/Budgets.jsx — Add role guard check at page level
[ ] 🔴 frontend/src/pages/treasury/Reports.jsx — Add role guard check at page level
1.3 SQL Injection Risks
[ ] 🔴 backend/controllers/customReport.controller.js — Remove all manual SQL string concatenation
[ ] 🔴 backend/controllers/customReport.controller.js — Create backend/services/QueryBuilderService.js to safely build parameterized queries
[ ] 🔴 backend/controllers/customReport.controller.js — Whitelist all allowed column names and table names
[ ] 🔴 backend/controllers/customReport.controller.js — Use $1, $2, $n parameterized format for all user input
[ ] 🔴 backend/repositories/ApprovalsRepository.js — Replace string interpolation with $1 parameterized queries
[ ] 🔴 backend/repositories/TreasuryDashboardRepository.js — Replace string interpolation with $1 parameterized queries
[ ] 🔴 backend/controllers/userSettings.controller.js — Remove raw SQL building; move to UserSettingsRepository
1.4 Hardcoded Credentials & Secrets
[ ] 🔴 backend/scripts/add-sample-gallery-data.js — Remove hardcoded host: 'localhost', user: 'postgres', password: 'postgres'
[ ] 🔴 backend/scripts/add-sample-gallery-data.js — Replace with process.env.DATABASE_URL or env variable lookups
[ ] 🔴 backend/scripts/add-telegram-channel.js — Remove hardcoded host: 'localhost', user: 'postgres', password: 'postgres'
[ ] 🔴 backend/scripts/add-telegram-channel.js — Replace with process.env.DATABASE_URL or env variable lookups
[ ] 🔴 Grep entire backend/scripts/ directory for password: 'postgres' and fix all occurrences
[ ] 🔴 Grep entire codebase for password: ' and audit each occurrence
1.5 Runtime Crash Risks
[ ] 🔴 backend/services/reconciliationService.js — Fix line 188: variable pending is used but never defined
[ ] 🔴 backend/services/reconciliationService.js — Trace what pending was supposed to be (likely the result of a DB query) and define it
[ ] 🔴 backend/services/reconciliationService.js — Add try/catch wrapper around the full reconciliation logic
[ ] 🔴 backend/services/reconciliationService.js — Add unit test to confirm reconciliation no longer crashes
[ ] 🔴 backend/controllers/dashboard.controller.js — Fix line 78: change p.user_id to p.member_id in payments join query
[ ] 🔴 backend/controllers/payments.controller.js — Fix line 22: join against users table if members table doesn't exist yet
[ ] 🔴 backend/controllers/payments.controller.js — Fix line 257: change income_categories to payment_categories
[ ] 🔴 backend/controllers/payments.controller.js — Add guard for missing payment_methods table
1.6 PII Exposure
[ ] 🔴 backend/services/aiContentService.js — Add PII masking before sending data to Gemini API
[ ] 🔴 backend/services/aiContentService.js — Create maskPII(text) helper that replaces names, emails, phone numbers with [REDACTED]
[ ] 🔴 backend/services/aiContentService.js — Log masked version, not original, to any logs
[ ] 🔴 backend/config/logging.js — Add redact array: ['password', 'token', 'authorization', 'email', 'phone', 'national_id']
[ ] 🔴 backend/config/logging.js — Set conditional transport: pino-pretty only when NODE_ENV === 'development'
[ ] 🔴 backend/config/passport.js — Add PII scrubbing utility for OAuth profile objects before any logging
1.7 Destructive Script Safety
[ ] 🔴 backend/scripts/reset-db.js — Add --confirm flag requirement before DROP SCHEMA executes
[ ] 🔴 backend/scripts/reset-db.js — Add NODE_ENV check — block execution if NODE_ENV === 'production'
[ ] 🔴 backend/scripts/reset-db.js — Add interactive readline prompt: "Type RESET to confirm database destruction:"
[ ] 🔴 backend/scripts/reset-db.js — Add backup reminder message before execution
[ ] 🔴 backend/scripts/check-documentation.js — Remove table creation logic — rename to setup-documentation.js or create separately
[ ] 🔴 backend/scripts/delete-test-user.js — Add confirmation prompt before DELETE query runs
[ ] 🔴 backend/scripts/delete-test-user.js — Add NODE_ENV check to block accidental production execution
═══════════════════════════════════════════
PHASE 2 — DATABASE SCHEMA STANDARDIZATION
Fix structural issues that cause crashes
═══════════════════════════════════════════
2.1 ID Type Standardization
[ ] 🔴 backend/schema.sql — Document the current ID type used (UUID)
[ ] 🔴 backend/migrations/001_auth_schema.sql — Change users.id from SERIAL to UUID DEFAULT gen_random_uuid()
[ ] 🔴 backend/migrations/001_auth_schema.sql — Update all foreign keys referencing users.id to use UUID type
[ ] 🔴 backend/migrations/003_members_schema.sql — Change members.user_id from INTEGER to UUID
[ ] 🔴 backend/migrations/003_members_schema.sql — Update foreign key constraint to match new UUID type
[ ] 🔴 All migration files — Run grep for SERIAL and evaluate whether to change to UUID
[ ] 🟠 backend/scripts/setup-database.js — Verify setup script runs migrations in correct order
[ ] 🟠 backend/scripts/migrate.js — Verify migrate script is compatible with setup-database.js
2.2 Dead Route Registration
[ ] 🟠 backend/app.js — Register payment.routes.js OR delete if fully replaced
[ ] 🟠 backend/app.js — Register members.routes.js OR delete if fully replaced by users routes
[ ] 🟠 backend/routes/payment.routes.js — Confirm if this should be merged with payments.routes.js
[ ] 🟠 backend/routes/members.routes.js — Confirm if this should be merged with users.routes.js
[ ] 🟠 backend/app.js — Audit full route list for duplicates and overlapping paths
[ ] 🟠 backend/routes/ — Remove all route files that are not registered in app.js
2.3 Duplicate Endpoint Cleanup
[ ] 🟡 backend/routes/users.routes.js — Remove POST /change-password if PUT /api/auth/password does the same thing
[ ] 🟡 backend/routes/auth.routes.js — Document which password endpoint is canonical
[ ] 🟡 Create backend/routes/index.js — Single router that imports and mounts all route modules
[ ] 🟡 backend/app.js — Replace 40+ individual app.use() calls with single app.use('/api', require('./routes/index'))
2.4 Missing Table & Column Fixes
[ ] 🟠 backend/migrations/ — Create migration to add payment_methods table if it doesn't exist
[ ] 🟠 backend/migrations/ — Create migration to standardize income_categories vs payment_categories naming
[ ] 🟠 backend/schema.sql — Add members table definition if it is distinct from users
[ ] 🟡 backend/migrations/ — Add GIN index on all JSONB columns (metadata, settings, permissions)
[ ] 🟡 backend/migrations/ — Add composite index on (church_id, created_at) for all high-traffic tables
[ ] 🟡 backend/migrations/ — Add composite index on (church_id, status) for approvals and documents
═══════════════════════════════════════════
PHASE 3 — BACKEND INFRASTRUCTURE
Clean up server.js, app.js, config files
═══════════════════════════════════════════
3.1 backend/app.js
[ ] 🟠 backend/app.js — Remove static serving block (it is duplicated in server.js — keep only in server.js)
[ ] 🟠 backend/app.js — Remove manual security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection (Helmet already handles these)
[ ] 🟠 backend/app.js — Remove manual Access-Control-Allow-* headers if cors() middleware already handles CORS
[ ] 🟠 backend/app.js — Replace 40+ individual route app.use() calls with single index router
[ ] 🟡 backend/app.js — Add request timing middleware that logs slow requests (> 500ms)
[ ] 🟡 backend/app.js — Add global 404 handler at the bottom of the middleware chain
[ ] 🟡 backend/app.js — Ensure global error handler sends consistent {success: false, error: '...'} format
3.2 backend/server.js
[ ] 🔴 backend/server.js — Add process.exit(1) inside uncaughtException handler after logging (prevents zombie processes)
[ ] 🔴 backend/server.js — Add process.exit(1) inside unhandledRejection handler after logging
[ ] 🟠 backend/server.js — Replace global.io = io with app.set('io', io)
[ ] 🟠 backend/server.js — Anywhere global.io is read, replace with req.app.get('io')
[ ] 🟠 backend/server.js — Remove duplicate SPA fallback (express.static) since it is in app.js
[ ] 🟡 backend/server.js — Add graceful shutdown handler for SIGTERM and SIGINT
[ ] 🟡 backend/server.js — On shutdown: close DB pool, close Redis, close HTTP server, then exit
3.3 backend/config/database.js
[ ] 🟠 backend/config/database.js — Change connectionTimeoutMillis from 2000 to 5000
[ ] 🟠 backend/config/database.js — Change idleTimeoutMillis from current value to 30000
[ ] 🟠 backend/config/database.js — Replace console.error in pool error handler with Pino logger
[ ] 🟡 backend/config/database.js — Export a query(text, params) helper that logs query time
[ ] 🟡 backend/config/database.js — Export a transaction(callback) helper for atomic operations
[ ] 🟡 backend/config/database.js — Add max pool size config from environment variable DB_POOL_MAX
3.4 backend/config/env-validation.js
[ ] 🟠 backend/config/env-validation.js — Replace all console.log with logger.info from logging.js
[ ] 🟠 backend/config/env-validation.js — Replace all console.error with logger.error from logging.js
[ ] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGHOST missing, check DB_HOST
[ ] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGUSER missing, check DB_USER
[ ] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGPASSWORD missing, check DB_PASSWORD
[ ] 🟡 backend/config/env-validation.js — Add validation for REDIS_URL environment variable
3.5 backend/config/logging.js
[ ] 🔴 backend/config/logging.js — Add redact: ['password', 'token', 'authorization', 'email', 'phone'] to Pino config
[ ] 🟠 backend/config/logging.js — Wrap pino-pretty in NODE_ENV !== 'production' guard
[ ] 🟠 backend/config/logging.js — Set level: process.env.LOG_LEVEL || 'info' for configurable log level
[ ] 🟡 backend/config/logging.js — Add serializers for req and res objects to standardize request logging
3.6 backend/config/passport.js
[ ] 🟠 backend/config/passport.js — Add logger.info('Auth attempt for strategy: google') to Google strategy callback
[ ] 🟠 backend/config/passport.js — Add logger.error for failed auth attempts
[ ] 🟠 backend/config/passport.js — Create scrubProfile(profile) helper that removes raw tokens from profile before logging
[ ] 🟡 backend/config/passport.js — Add JWT strategy logging for token validation failures
3.7 backend/config/telegram.js
[ ] 🟠 backend/config/telegram.js — Replace hardcoded timeout values with process.env.TELEGRAM_TIMEOUT || 30000
[ ] 🟠 backend/config/telegram.js — Replace hardcoded file size limits with process.env.TELEGRAM_MAX_FILE_SIZE || 50000000
[ ] 🟡 backend/config/telegram.js — Add validation that required Telegram env vars exist on startup
═══════════════════════════════════════════
PHASE 4 — BACKEND CONTROLLERS CLEANUP
Controllers should only handle HTTP, not business logic
═══════════════════════════════════════════
4.1 backend/controllers/BaseController.js
[ ] 🟠 backend/controllers/BaseController.js — Remove this.pool property (gives controllers direct DB access)
[ ] 🟠 backend/controllers/BaseController.js — Remove this.query() method
[ ] 🟠 backend/controllers/BaseController.js — Remove this.transaction() method
[ ] 🟠 backend/controllers/BaseController.js — Keep only HTTP helpers: sendSuccess(), sendError(), paginate()
[ ] 🟡 backend/controllers/BaseController.js — Add sendCreated(res, data) helper
[ ] 🟡 backend/controllers/BaseController.js — Add sendNotFound(res, message) helper
[ ] 🟡 backend/controllers/BaseController.js — Add hasRole(req, roles[]) helper
4.2 backend/controllers/auth.controller.js
[ ] 🟠 backend/controllers/auth.controller.js — Move all direct SQL from register() to UserRepository.create()
[ ] 🟠 backend/controllers/auth.controller.js — Fix line 398: add actual email dispatch using emailService.js for password reset
[ ] 🟠 backend/controllers/auth.controller.js — Replace manual res.json calls with ResponseHandler
[ ] 🟠 backend/controllers/auth.controller.js — Replace hardcoded MFA role list with centralized ROLES constant
[ ] 🟡 backend/controllers/auth.controller.js — Add rate limiting on login endpoint (max 5 attempts per minute per IP)
[ ] 🟡 backend/controllers/auth.controller.js — Add audit log on successful login with IP and user agent
4.3 backend/controllers/users.controller.js
[ ] 🟠 backend/controllers/users.controller.js — Remove all raw SQL — move to UserRepository
[ ] 🟠 backend/controllers/users.controller.js — Remove methods that duplicate members.controller.js
[ ] 🟠 backend/controllers/users.controller.js — Consolidate with members.controller.js or clearly document split
[ ] 🟡 backend/controllers/users.controller.js — Standardize all responses to {success, data, message} format
[ ] 🟡 backend/controllers/users.controller.js — Add church_id to all queries that retrieve user lists
4.4 backend/controllers/members.controller.js
[ ] 🟠 backend/controllers/members.controller.js — Move pagination math (offset = (page-1) * limit) to BaseController or helper
[ ] 🟠 backend/controllers/members.controller.js — Move bulk contact creation to MembersRepository.bulkCreate()
[ ] 🟡 backend/controllers/members.controller.js — Add bulkImport endpoint that accepts CSV data
[ ] 🟡 backend/controllers/members.controller.js — Add bulkExport endpoint that returns CSV/PDF
4.5 backend/controllers/church.controller.js
[ ] 🟠 backend/controllers/church.controller.js — Move slug validation logic to ChurchService.validateSlug()
[ ] 🟠 backend/controllers/church.controller.js — Move user count check to ChurchRepository.getMemberCount()
[ ] 🟠 backend/controllers/church.controller.js — Move dynamic update object assembly to ChurchRepository.update()
[ ] 🟡 backend/controllers/church.controller.js — Standardize all responses
4.6 backend/controllers/department.controller.js & departments.controller.js
[ ] 🟠 backend/controllers/department.controller.js — Consolidate with departments.controller.js into one file
[ ] 🟠 Move Multer config from both files to backend/helpers/multerConfig.js
[ ] 🟠 Move dashboard object assembly to DepartmentRepository.getDashboard()
[ ] 🟠 Remove manual filter mapping (string to boolean) — move to repository
[ ] 🟡 Create backend/routes/departments.routes.js as the single authoritative route file
4.7 backend/controllers/dashboard.controller.js
[ ] 🔴 backend/controllers/dashboard.controller.js — Replace all 6 hardcoded/fake return values with real SQL queries
[ ] 🔴 backend/controllers/dashboard.controller.js — Implement getSystemHealth() to run real SELECT 1 ping on DB
[ ] 🔴 backend/controllers/dashboard.controller.js — Implement getMinistryHealth() from DashboardRepository
[ ] 🔴 backend/controllers/dashboard.controller.js — Implement getFinancialStats() from DashboardRepository
[ ] 🟠 backend/controllers/dashboard.controller.js — Move activity feed aggregation/sorting to DashboardRepository
[ ] 🟡 backend/controllers/dashboard.controller.js — Add WebSocket push for system health updates
4.8 backend/controllers/treasury.controller.js
[ ] 🔴 backend/controllers/treasury.controller.js — DEPRECATE this file — do not add new code here
[ ] 🔴 backend/controllers/treasury.controller.js — Migrate asset methods to backend/modules/treasury/controllers/asset.controller.js
[ ] 🔴 backend/controllers/treasury.controller.js — Migrate vendor methods to backend/modules/treasury/controllers/vendor.controller.js
[ ] 🔴 backend/controllers/treasury.controller.js — Migrate reconciliation methods to backend/modules/treasury/controllers/reconciliation.controller.js
[ ] 🟠 backend/routes/treasury.routes.js — Update all route imports to point to new module controllers
[ ] 🟠 backend/modules/treasury/controllers/account.controller.js — Move totaling logic to AccountRepository
[ ] 🟠 backend/modules/treasury/controllers/budget.controller.js — Move balance calculation to BudgetRepository
[ ] 🟠 backend/modules/treasury/controllers/expense.controller.js — Move expense category logic to ExpenseRepository
[ ] 🟠 backend/modules/treasury/controllers/fund.controller.js — Move fund balancing to FundRepository
[ ] 🟠 backend/modules/treasury/controllers/journalEntry.controller.js — Move double-entry validation to JournalEntryService
4.9 backend/controllers/payments.controller.js & payment.controller.js
[ ] 🟠 Merge payment.controller.js and payments.controller.js into single file
[ ] 🟠 Create backend/services/PaymentGatewayService.js — move all KopoKopo-specific logic here
[ ] 🟠 Move refund logic from controller to PaymentGatewayService.refund()
[ ] 🟠 Remove duplicate pledge handling — keep only in one place
[ ] 🟡 Add POST /payments/bulk-export endpoint for generating payment reports
4.10 backend/controllers/approvals.controller.js
[ ] 🟠 backend/controllers/approvals.controller.js — Add POST /approvals/bulk-approve endpoint
[ ] 🟠 backend/controllers/approvals.controller.js — Add POST /approvals/bulk-reject endpoint
[ ] 🟠 backend/controllers/approvals.controller.js — Replace all res.json() with ResponseHandler
[ ] 🟡 backend/controllers/approvals.controller.js — Implement auto-reject for requests older than 30 days (cron job)
[ ] 🟡 backend/controllers/approvals.controller.js — Add email notification on approval/rejection via emailService.js
4.11 backend/controllers/reconciliation.controller.js
[ ] 🟠 Move forensic audit history assembly to AuditingService or ReconciliationRepository
[ ] 🟠 Controller should only call reconciliationService.reconcile() and return result
[ ] 🟡 Add GET /reconciliation/history endpoint that returns audit trail
4.12 backend/controllers/budgets.controller.js
[ ] 🟠 backend/controllers/budgets.controller.js — DELETE this file (redundant with treasury module)
[ ] 🟠 Update any routes pointing to budgets.controller.js to point to treasury module
[ ] 🟠 Implement real-time budget utilization check in backend/modules/treasury/controllers/budget.controller.js
4.13 backend/controllers/fixedAssets.controller.js
[ ] 🟠 Create backend/services/FixedAssetService.js
[ ] 🟠 Move all depreciation math from controller to FixedAssetService.calculateDepreciation()
[ ] 🟠 Controller should call service and return result only
4.14 backend/controllers/activityFeed.controller.js
[ ] 🟠 Move WebSocket broadcasting logic to backend/services/ActivityFeedService.js
[ ] 🟠 Replace hardcoded role checks with centralized permission checker
[ ] 🟡 Add pagination to activity feed endpoint
4.15 backend/controllers/gallery.controller.js & galleryAlbums.controller.js
[ ] 🟠 Consolidate both gallery controllers into one
[ ] 🟠 Move SQL pagination cursor logic to GalleryRepository
[ ] 🟠 Move bulk image loops to GalleryRepository.bulkCreate()
[ ] 🟡 Add church_id filter to all gallery queries
4.16 backend/controllers/sms.controller.js & smsAutomation.controller.js
[ ] 🟠 Move template variable interpolation from controller to SmsAutomationService
[ ] 🟠 Replace analytics stubs with real data from SmsRepository
[ ] 🟡 Add bulk SMS campaign endpoint
[ ] 🟡 Add SMS delivery status tracking
4.17 backend/controllers/telegram.controller.js & telegramAuth.controller.js
[ ] 🟠 Remove demo mode "accept all" auth — enforce real code validation
[ ] 🟠 Move all auth flow logic to TelegramService
[ ] 🟠 Move PII masking coordination to TelegramService
[ ] 🟡 Add rate limiting on Telegram auth endpoints
4.18 backend/controllers/content.controller.js & seo.controller.js
[ ] 🟠 Move slug generation from controller to ContentService.generateSlug()
[ ] 🟠 Move revision numbering to ContentRepository.getNextRevision()
[ ] 🟠 Move lock expiration logic to ContentService.checkLock()
[ ] 🟠 Move SEO analysis logic to SEOService.analyze()
[ ] 🟡 frontend/src/pages/seo/SEO.jsx — Implement real meta tag management (currently non-functional stub)
[ ] 🟡 frontend/src/pages/seo/SEO.jsx — Add Open Graph tag editor
[ ] 🟡 frontend/src/pages/seo/SEO.jsx — Add Twitter Card tag editor
[ ] 🟡 frontend/src/pages/seo/SEO.jsx — Add sitemap generation trigger
[ ] 🟡 frontend/src/pages/seo/SEO.jsx — Add robots.txt editor
4.19 backend/controllers/accessibility.controller.js
[ ] 🟠 Replace hardcoded "simulated" audit return value with real WCAG audit logic
[ ] 🟠 Add role-based access (admin only)
[ ] 🟠 Replace res.json with ResponseHandler
4.20 backend/controllers/chartOfAccounts.controller.js
[ ] 🟡 Move hierarchy tree building to ChartOfAccountsRepository.getTree()
[ ] 🟡 Move balance calculation to AccountingService.calculateBalances()
[ ] 🟡 Controller should call service and return flat response
4.21 backend/controllers/chat.controller.js
[ ] 🟠 Remove global.io usage — replace with req.app.get('io')
[ ] 🟠 Replace res.json with ResponseHandler
[ ] 🟡 Create backend/services/ChatService.js to handle broadcast logic
4.22 backend/controllers/comments.controller.js
[ ] 🟡 Move ownership verification (isOwner) to a middleware
[ ] 🟡 Move role check (isAdmin) to centralized permission checker
[ ] 🟡 Standardize responses
4.23 backend/controllers/documents.controller.js & documentVersions.controller.js
[ ] 🟠 Replace simulated cloud upload with real cloud storage (S3/Azure/GCS)
[ ] 🟠 Move Multer config to backend/helpers/multerConfig.js
[ ] 🟠 Move tag mapping/splitting logic to DocumentService
[ ] 🟠 Consolidate with documentVersions.controller.js where appropriate
[ ] 🟡 Add file type validation middleware
4.24 backend/controllers/ai.controller.js
[ ] 🟡 Move rate limiting coordination to AIContentService
[ ] 🟡 Move usage logging to AIContentService
[ ] 🟡 Controller should only validate request and delegate
4.25 backend/controllers/analytics.controller.js
[ ] 🟡 Move date filtering/period calculation to AnalyticsRepository
[ ] 🟡 Move manual JSON assembly to AnalyticsRepository
[ ] 🟡 Add church_id filter to all analytics queries
4.26 backend/controllers/announcements.controller.js
[ ] 🟡 Move manual role checks to BaseController.hasRole()
[ ] 🟡 Move department membership logic to AnnouncementsRepository
[ ] 🟡 Replace res.json with ResponseHandler
4.27 backend/controllers/socialAuth.controller.js
[ ] 🟡 Move account linking business logic to IdentityService.linkAccount()
[ ] 🟡 Controller should only handle OAuth callback and delegate to service
4.28 backend/controllers/search.controller.js
[ ] 🟡 Move multi-entity search coordination to SearchRepository.searchAll()
[ ] 🟡 Add church_id filter (currently has zero tenant isolation)
4.29 backend/controllers/treasuryDashboard.controller.js
[ ] 🟠 Move complex financial aggregations to TreasuryDashboardRepository using CTEs
[ ] 🟠 Replace mock/hardcoded stats with real SQL queries
[ ] 🟡 Add caching for dashboard stats (5-minute TTL)
═══════════════════════════════════════════
PHASE 5 — BACKEND MIDDLEWARE CLEANUP
═══════════════════════════════════════════
5.1 backend/middleware/auth.js
[ ] 🔴 Implement Redis/LRU identity cache — stop hitting DB on every single request
[ ] 🔴 Cache key: identity:${userId} with 5-minute TTL
[ ] 🔴 Invalidate cache on logout, role change, and password reset
[ ] 🟠 Include church_id in cached identity object
[ ] 🟡 Add req.identity shorthand for downstream controllers
5.2 backend/middleware/csrf.js
[ ] 🔴 Remove auto-exemption of Bearer tokens from CSRF check
[ ] 🔴 Require CSRF token for all state-changing requests (POST/PUT/DELETE)
[ ] 🟠 Add CSRF token rotation on login
5.3 backend/middleware/validation.js
[ ] 🟠 Audit all validation schemas for missing church_id in request body validation
[ ] 🟠 Add church_id validation to all treasury-related request schemas
[ ] 🟡 Add common reusable validators: isUUID, isPhoneNumber, isKenyanPhone
[ ] 🟡 Ensure all validation errors return consistent {field, message} format
5.4 backend/middleware/tenantResolver.js
[ ] 🟠 Confirm church_id is resolved from JWT and attached to req.church_id
[ ] 🟠 Add fallback: if JWT is missing church_id, look up from users table
[ ] 🟡 Add logging when church_id cannot be resolved
5.5 backend/middleware/securityMiddleware.js
[ ] 🟠 Add rate limiting per-user (not just per-IP) for sensitive endpoints
[ ] 🟡 Replace in-memory rate limiter with Redis-backed limiter (for multi-process support)
[ ] 🟡 Add rate limit headers to all responses (X-RateLimit-Limit, X-RateLimit-Remaining)
5.6 backend/middleware/roleGuard.js
[ ] 🟠 Confirm middleware correctly returns 403 when role is insufficient
[ ] 🟠 Add support for array of allowed roles: roleGuard(['Treasurer', 'Super Admin'])
[ ] 🟡 Log unauthorized access attempts with user ID and route
5.7 backend/middleware/fieldPermissionService.js
[ ] 🟠 Fix N+1 query risk — batch permission lookups into single query
[ ] 🟠 Cache field permissions per role (they rarely change)
[ ] 🟡 Add unit tests for field permission logic
═══════════════════════════════════════════
PHASE 6 — BACKEND REPOSITORIES CLEANUP
═══════════════════════════════════════════
6.1 backend/repositories/TreasuryRepository.js (938 lines — needs splitting)
[ ] 🔴 TreasuryRepository.js — Create backend/repositories/AssetRepository.js and move all asset methods
[ ] 🔴 TreasuryRepository.js — Create backend/repositories/VendorRepository.js and move all vendor methods
[ ] 🔴 TreasuryRepository.js — Create backend/repositories/FundRepository.js and move all fund methods
[ ] 🔴 TreasuryRepository.js — Create backend/repositories/AccountRepository.js and move all account methods
[ ] 🔴 TreasuryRepository.js — Create backend/repositories/BudgetLineRepository.js and move all budget line methods
[ ] 🟠 Update all references to TreasuryRepository throughout controllers and services
[ ] 🟠 Confirm all new split repositories still add church_id filters
[ ] 🟡 Delete original TreasuryRepository.js once all methods are migrated
6.2 backend/repositories/UserRepository.js & UsersRepository.js
[ ] 🟠 Consolidate into single UserRepository.js
[ ] 🟠 Confirm all methods in both files are preserved in the consolidated file
[ ] 🟠 Update all imports throughout the codebase
[ ] 🟠 Delete the duplicate file
[ ] 🟡 Add findByChurchId(churchId) method
6.3 backend/repositories/DepartmentRepository.js & DepartmentsRepository.js
[ ] 🟠 Consolidate into single DepartmentRepository.js
[ ] 🟠 Fix N+1 query patterns (correlated subqueries)
[ ] 🟠 Replace non-atomic role update (DELETE + INSERT loop) with single UPSERT
[ ] 🟠 Update all imports throughout the codebase
[ ] 🟡 Delete the duplicate file
6.4 backend/repositories/DashboardRepository.js
[ ] 🔴 Implement getMinistryHealth(churchId) — SQL: JOIN members WITH attendance_records over 4 weeks
[ ] 🔴 Implement getFinancialSummary(churchId) — SQL: SUM transactions by type for current month
[ ] 🔴 Implement getSystemMetrics() — use process.memoryUsage() + SELECT 1 ping
[ ] 🟠 Move all activity feed logic from dashboard.controller.js to here
[ ] 🟡 Add caching on getFinancialSummary (invalidate on new transaction)
6.5 backend/repositories/SearchRepository.js
[ ] 🔴 Add church_id filter to every single search method (currently zero isolation)
[ ] 🔴 Add churchId parameter to all method signatures
[ ] 🟠 Ensure full-text search uses indexed tsvector columns for performance
[ ] 🟡 Add relevance scoring to results
6.6 backend/repositories/MemberGivingRepository.js
[ ] 🟠 Fix N+1 query patterns — consolidate correlated subqueries into JOINs
[ ] 🟠 Add church_id filter to all queries
[ ] 🟡 Add getTopGivers(churchId, year, limit) method
6.7 backend/repositories/NotificationRepository.js
[ ] 🟡 Add church_id filter to all queries
[ ] 🟡 Add bulk insert method for batch notifications
[ ] 🟡 Add cleanup method for old/read notifications
═══════════════════════════════════════════
PHASE 7 — BACKEND SERVICES CLEANUP
═══════════════════════════════════════════
7.1 backend/services/reconciliationService.js
[ ] 🔴 Fix line 188 — define pending variable (likely missing DB query result)
[ ] 🔴 Add try/catch around full reconciliation flow
[ ] 🔴 Write unit test for reconciliation logic
[ ] 🟠 Add rollback mechanism if reconciliation fails midway
7.2 backend/services/aiContentService.js
[ ] 🔴 Add maskPII(text) function before sending to Gemini API
[ ] 🔴 Mask: email addresses, phone numbers, national IDs, proper names in sensitive context
[ ] 🟠 Add rate limiting (track usage per church per day)
[ ] 🟠 Add logging of API calls (masked content only)
[ ] 🟡 Add fallback if Gemini API is unavailable
7.3 backend/services/kopokopo.js
[ ] 🟠 Fix undefined model/service references that cause runtime errors
[ ] 🟠 Replace any require() for non-existent files
[ ] 🟠 Move to backend/services/PaymentGatewayService.js and register KopoKopo as a provider
7.4 Telegram Service Consolidation
[ ] 🟠 Identify all functionality in backend/services/telegramClient.js
[ ] 🟠 Identify all functionality in backend/services/telegramMTProto.js
[ ] 🟠 Merge into single backend/services/TelegramService.js
[ ] 🟠 Update all controllers and routes to use the consolidated service
[ ] 🟡 Document which Telegram API (Bot vs MTProto) is used for each feature
7.5 New Services to Create
[ ] 🟠 Create backend/services/AuditingService.js — centralized audit trail for all financial changes
[ ] 🟠 Create backend/services/ActivityFeedService.js — WebSocket broadcasting logic from activityFeed.controller
[ ] 🟠 Create backend/services/ContentService.js — slug generation, revision numbering, lock expiration
[ ] 🟠 Create backend/services/SEOService.js — SEO analysis logic from seo.controller
[ ] 🟠 Create backend/services/PaymentGatewayService.js — abstraction layer for KopoKopo and M-Pesa
[ ] 🟡 Create backend/services/FixedAssetService.js — depreciation math
[ ] 🟡 Create backend/services/SmsAutomationService.js — template interpolation
[ ] 🟡 Create backend/services/JournalEntryService.js — double-entry validation logic
═══════════════════════════════════════════
PHASE 8 — FRONTEND ROUTING & NAVIGATION
═══════════════════════════════════════════
8.1 frontend/src/router/dashboard.routes.jsx
[ ] 🔴 Remove duplicate payments path entry
[ ] 🔴 Add roles property to every route object
[ ] 🟠 Restructure from flat array to grouped objects: pastorRoutes, treasuryRoutes, adminRoutes, memberRoutes
[ ] 🟠 Rename treasury/reports to treasury/financial-reports to distinguish from general reports
[ ] 🟠 Wrap treasury routes with <RoleGuard roles={['Treasurer', 'Super Admin']}>
[ ] 🟠 Wrap admin routes with <RoleGuard roles={['Super Admin']}>
[ ] 🟠 Wrap department head routes with <RoleGuard roles={['Dept Head', 'Super Admin']}>
[ ] 🟡 Add title property to all routes for browser tab and breadcrumb use
8.2 frontend/src/components/layout/Sidebar.jsx
[ ] 🟠 Create frontend/src/config/navigation.js with SIDEBAR_CONFIG object
[ ] 🟠 Move all hardcoded nav links from Sidebar.jsx to SIDEBAR_CONFIG
[ ] 🟠 Add children array support for nested sub-menu items
[ ] 🟠 Implement filterRoutesByPermission(routes, userRole) helper
[ ] 🟠 Replace hardcoded hex color for active links with var(--color-primary-500)
[ ] 🟠 Create frontend/src/components/layout/SidebarAccordion.jsx for Treasury/Admin sub-menus
[ ] 🟡 Add mobile "Action Bar" at bottom with Search, Home, Profile shortcuts
[ ] 🟡 Add keyboard navigation support (arrow keys through menu items)
[ ] 🟡 Save sidebar open/collapsed state to localStorage
═══════════════════════════════════════════
PHASE 9 — FRONTEND DESIGN SYSTEM
═══════════════════════════════════════════
9.1 Design Token Migration
[ ] 🟠 frontend/tailwind.config.js — Add CSS variable mappings for all semantic tokens
[ ] 🟠 frontend/tailwind.config.js — Add: success, warning, error, surface, border, muted
[ ] 🟠 frontend/src/index.css — Add utility classes: .text-success, .bg-success-light, .text-error, .bg-error-light, .text-warning, .bg-warning-light
[ ] 🟠 frontend/src/pages/dashboard/PastorDashboard.jsx — Replace bg-green-100 with bg-success-light
[ ] 🟠 frontend/src/pages/dashboard/PastorDashboard.jsx — Replace bg-purple-100 with bg-secondary-light
[ ] 🟠 frontend/src/pages/dashboard/PastorDashboard.jsx — Replace text-green-600 with text-success
[ ] 🟠 frontend/src/components/common/StatsCard.jsx — Replace all literal Tailwind color classes with semantic tokens
[ ] 🟠 frontend/src/components/common/Card.jsx — Inherit border color from var(--color-border)
[ ] 🟡 frontend/src/components/common/QuickActionsPanel.jsx — Audit and replace all hardcoded color values
[ ] 🟡 frontend/src/contexts/ColorPaletteContext.jsx — Export full semantic scale including Success, Warning, Error, Surface, Border
[ ] 🟡 Grep entire frontend/src/ for text-green- and replace with semantic classes
[ ] 🟡 Grep entire frontend/src/ for text-red- and replace with semantic classes
[ ] 🟡 Grep entire frontend/src/ for text-yellow- and replace with semantic classes
[ ] 🟡 Grep entire frontend/src/ for bg-green- and replace with semantic classes
[ ] 🟡 Grep entire frontend/src/ for bg-red- and replace with semantic classes
9.2 Skeleton Shimmer System
[ ] 🟠 frontend/src/index.css — Add @keyframes shimmer animation with sliding gradient
[ ] 🟠 Create frontend/src/components/common/Skeleton.jsx with three variants:
[ ] 🟠 TextSkeleton — single line of shimmer text
[ ] 🟠 CircleSkeleton — circular avatar placeholder
[ ] 🟠 BoxSkeleton — rectangular block placeholder
[ ] 🟠 Create frontend/src/components/common/StatsCardSkeleton.jsx — mirrors StatsCard layout
[ ] 🟠 Create frontend/src/components/common/TableSkeleton.jsx — 5 placeholder rows
[ ] 🟠 Create frontend/src/components/common/DashboardSkeleton.jsx — full dashboard layout skeleton
[ ] 🟡 Replace FullPageLoading in PastorDashboard.jsx with DashboardSkeleton
[ ] 🟡 Replace FullPageLoading in TreasuryDashboard.jsx with DashboardSkeleton
[ ] 🟡 Replace FullPageLoading in SuperAdminDashboard.jsx with DashboardSkeleton
[ ] 🟡 Replace CardLoading with StatsCardSkeleton in all dashboard pages
9.3 Toast / Notification System
[ ] 🟡 Create frontend/src/contexts/NotificationContext.jsx
[ ] 🟡 Create frontend/src/components/common/ToastContainer.jsx using Tailwind only
[ ] 🟡 Uninstall react-toastify after migration
[ ] 🟡 Update all toast.success(), toast.error(), toast.info() calls to use new context
9.4 Error Boundaries
[ ] 🟠 Create frontend/src/components/common/ComponentErrorBoundary.jsx
[ ] 🟠 Add onRetry prop that clears error state and re-fetches
[ ] 🟠 Add Card.jsx onRetry prop that shows "Try Again" button on error
[ ] 🟠 Wrap all dashboard card sections in <ComponentErrorBoundary>
[ ] 🟡 Wrap all page-level components in <ComponentErrorBoundary>
[ ] 🟡 Add 28 error boundaries to UI primitive components (DataTable, Modal, etc.)
═══════════════════════════════════════════
PHASE 10 — FRONTEND CONTEXT & STATE
═══════════════════════════════════════════
10.1 frontend/src/contexts/ContentContext.jsx
[ ] 🟠 Extract "Member Pulse" data into frontend/src/hooks/useMemberPulse.js
[ ] 🟠 Extract "Activity Feed" data into frontend/src/hooks/useActivityFeed.js
[ ] 🟠 Extract "Analytics" data into frontend/src/hooks/useAnalytics.js
[ ] 🟠 Add useMemo to all derived values to prevent unnecessary re-renders
[ ] 🟡 Create frontend/src/hooks/useDashboardData(role) hook for role-specific data fetching
10.2 frontend/src/contexts/AuthContext.jsx
[ ] 🟠 Replace axios with auth-api instance that includes CSRF token
[ ] 🟠 Ensure auth-api auto-attaches Bearer token on every request
[ ] 🟠 Add useMemo around value object to prevent re-renders
[ ] 🟡 Add auto-refresh token logic (refresh 1 minute before expiry)
10.3 frontend/src/contexts/PaletteContext.jsx
[ ] 🟡 Evaluate if this is redundant with ColorPaletteContext.jsx
[ ] 🟡 If redundant, consolidate and delete one
[ ] 🟡 Update all consumers to use the remaining context
10.4 WebSocket / Real-Time
[ ] 🟠 Create frontend/src/contexts/SocketContext.js
[ ] 🟠 Install socket.io-client if not already installed
[ ] 🟠 Connect on login, disconnect on logout
[ ] 🟠 Listen for approvals:new event — update approvals badge counter
[ ] 🟠 Listen for system:health event — update SuperAdmin system monitor
[ ] 🟠 Listen for notification:new event — show toast notification
[ ] 🟡 Listen for chat:message event — update chat badge
[ ] 🟡 Add reconnection logic with exponential backoff
[ ] 🟡 Add connection status indicator in header ("Live" green dot)
═══════════════════════════════════════════
PHASE 11 — FRONTEND UI COMPONENTS
═══════════════════════════════════════════
11.1 frontend/src/components/common/DataTable.jsx
[ ] 🟠 Add mobile card view fallback for screens smaller than md breakpoint
[ ] 🟠 Create CardViewRow.jsx sub-component for mobile list items
[ ] 🟠 Add useMobile() hook to toggle between table and card view
[ ] 🟠 Wrap table in <div className="overflow-x-auto"> for horizontal scroll on medium screens
[ ] 🟡 Add column resizing support
[ ] 🟡 Add column visibility toggle (show/hide columns)
[ ] 🟡 Persist column preferences in localStorage
11.2 frontend/src/components/common/Loading.jsx
[ ] 🟠 Replace animate-pulse with @keyframes shimmer sliding gradient animation
[ ] 🟡 Add size variants: sm, md, lg
[ ] 🟡 Add inline mode (shows next to text)
11.3 frontend/src/components/common/Modal.jsx
[ ] 🟡 Add onRetry prop for error states
[ ] 🟡 Add loading state inside modal
[ ] 🟡 Ensure focus is trapped inside modal (keyboard accessibility)
[ ] 🟡 Ensure ESC key closes modal
11.4 frontend/src/components/common/Button.jsx
[ ] 🟡 Add loading prop that shows spinner and disables click
[ ] 🟡 Add danger variant for destructive actions
[ ] 🟡 Ensure minimum touch target is 44x44px (WCAG)
11.5 Form Components
[ ] 🟡 frontend/src/components/common/Input.jsx — Add error prop for inline validation message
[ ] 🟡 frontend/src/components/common/Select.jsx — Add error prop for inline validation message
[ ] 🟡 frontend/src/components/common/Textarea.jsx — Add character count display
[ ] 🟡 Create frontend/src/components/common/PhoneInput.jsx — Kenyan phone number formatter
═══════════════════════════════════════════
PHASE 12 — FRONTEND DASHBOARD PAGES
Replace stubs with real features
═══════════════════════════════════════════
12.1 frontend/src/pages/dashboard/PastorDashboard.jsx
[ ] 🔴 Replace Members tab EmptyState with real member list using GET /api/members
[ ] 🔴 Replace Departments tab EmptyState with real department list
[ ] 🔴 Replace Events tab EmptyState with real events list
[ ] 🔴 Replace Approvals "Coming Soon" with ApprovalCard component list
[ ] 🟠 Create frontend/src/components/dashboard/MemberTimeline.jsx
[ ] 🟠 MemberTimeline.jsx — Connect to GET /api/members/events (baptisms, new joins, anniversaries)
[ ] 🟠 Add "Missing in Action" tracker (members not attended in 3+ weeks)
[ ] 🟠 Add Engagement AreaChart (Recharts) — weekly attendance vs digital giving
[ ] 🟠 Add Department Pulse BarChart — task completion per department
[ ] 🟠 Add "Approve/Reject" fast-action buttons directly in dashboard approvals feed
[ ] 🟡 Add pastoral notes section for member counseling records
[ ] 🟡 Add upcoming church events widget
12.2 frontend/src/pages/dashboard/TreasuryDashboard.jsx
[ ] 🔴 Replace mock data stats with real API calls to GET /api/treasury/stats
[ ] 🔴 Replace mock transaction list with real GET /api/treasury/transactions
[ ] 🟠 Add Cash Flow Trend LineChart — Income vs Expenses over last 6 months
[ ] 🟠 Add Fund Balances table — "Restricted" vs "Unrestricted" funds
[ ] 🟠 Add Budget vs Actual progress tracking module per department
[ ] 🟠 Add Reconciliation Engine UI — side-by-side bank statement vs system ledger
[ ] 🟠 Add Digital Receipts — generate and view contribution receipts via jspdf
[ ] 🟡 Add "Send All Receipts" batch email button for end-of-year statements
[ ] 🟡 Add 6-month cash flow forecast
12.3 frontend/src/pages/dashboard/SuperAdminDashboard.jsx
[ ] 🔴 Replace Analytics tab EmptyState with real analytics charts
[ ] 🔴 Replace User Management tab EmptyState with real user management workflow
[ ] 🟠 Add System Health Monitor — real-time API latency and DB status via WebSocket
[ ] 🟠 Add Advanced Audit Logs table — multi-parameter filtering (user, action, date range)
[ ] 🟡 Add "Impersonate User" feature (Super Admin only, with audit trail)
[ ] 🟡 Add system backup trigger button
12.4 frontend/src/pages/dashboard/DeptHeadDashboard.jsx
[ ] 🔴 Replace Tasks tab EmptyState with real task management
[ ] 🔴 Replace Volunteer Tracking tab EmptyState with real volunteer data
[ ] 🟠 Create frontend/src/components/dashboard/KanbanBoard.jsx — drag-and-drop task management
[ ] 🟠 Create frontend/src/components/dashboard/VolunteerChart.jsx — hours served BarChart
[ ] 🟡 Add department budget tracker widget
[ ] 🟡 Add member attendance tracker for department events
12.5 frontend/src/pages/dashboard/MemberDashboard.jsx
[ ] 🟠 Add "Attendance Streak" counter
[ ] 🟠 Add upcoming duty/roster reminder widget
[ ] 🟠 Add personal giving history chart
[ ] 🟡 Add digital contribution receipt download
[ ] 🟡 Add church events RSVP widget
═══════════════════════════════════════════
PHASE 13 — FRONTEND TREASURY PAGES
═══════════════════════════════════════════
13.1 frontend/src/pages/treasury/Transactions.jsx
[ ] 🔴 Add role guard (Treasurer / Super Admin only)
[ ] 🔴 Connect to real GET /api/treasury/transactions endpoint
[ ] 🟠 Add server-side pagination (replace client-side)
[ ] 🟠 Add bulk export button (CSV/PDF)
[ ] 🟠 Add date range filter
[ ] 🟠 Add amount range filter
[ ] 🟡 Add audit trail — show who created/modified each transaction
13.2 frontend/src/pages/treasury/Budgets.jsx
[ ] 🔴 Add role guard
[ ] 🔴 Connect to real API endpoints
[ ] 🟠 Add Budget vs Actual visual progress bars per line item
[ ] 🟠 Add overspend warning (highlight when actual > 90% of budget)
[ ] 🟡 Add budget approval workflow
13.3 frontend/src/pages/treasury/Reconciliation.jsx
[ ] 🔴 Connect to real reconciliation API
[ ] 🟠 Add side-by-side bank statement vs system ledger view
[ ] 🟠 Auto-highlight potential date+amount matches
[ ] 🟠 Add "Mark as Reconciled" button
[ ] 🟡 Add reconciliation history/audit trail
13.4 frontend/src/pages/treasury/Reports.jsx
[ ] 🔴 Replace mock data with real API calls
[ ] 🟠 Add PDF export via jspdf
[ ] 🟠 Add date range selector for report period
[ ] 🟠 Add export to CSV option
[ ] 🟡 Add scheduled report emails
13.5 frontend/src/pages/treasury/FixedAssets.jsx
[ ] 🟠 Connect to real API
[ ] 🟠 Display depreciation schedule per asset
[ ] 🟡 Add bulk asset import via CSV
13.6 frontend/src/pages/treasury/Vendors.jsx
[ ] 🟠 Connect to real API
[ ] 🟡 Add vendor payment history view
[ ] 🟡 Add vendor reconciliation tool
13.7 frontend/src/pages/treasury/JournalEntries.jsx
[ ] 🟠 Enforce double-entry validation in UI before submitting
[ ] 🟠 Show debit/credit columns clearly
[ ] 🟡 Add audit trail for all journal entry changes
═══════════════════════════════════════════
PHASE 14 — FRONTEND PEOPLE PAGES
═══════════════════════════════════════════
14.1 frontend/src/pages/members/Members.jsx
[ ] 🟠 Replace client-side filtering with server-side search
[ ] 🟠 Add server-side pagination
[ ] 🟠 Replace hardcoded role list with dynamic roles from API
[ ] 🟡 Add bulk actions (export, send SMS, archive)
[ ] 🟡 Add member import via CSV
14.2 frontend/src/pages/admin/Administration.jsx
[ ] 🔴 Remove stub/non-functional AdministrationAlternative.jsx or implement it
[ ] 🔴 Remove stub/non-functional AdministrationOriginal.jsx or implement it
[ ] 🔴 Add role guard (Super Admin only)
[ ] 🟠 Implement user management workflows (create, edit, deactivate)
[ ] 🟡 Add role assignment UI
14.3 frontend/src/pages/departments/Departments.jsx
[ ] 🟠 Add server-side pagination
[ ] 🟠 Replace hardcoded department type list with DB-driven list
[ ] 🟡 Add bulk department actions
═══════════════════════════════════════════
PHASE 15 — FRONTEND MEDIA & COMMS PAGES
═══════════════════════════════════════════
15.1 frontend/src/pages/telegram/Telegram.jsx
[ ] 🔴 IMPLEMENT — currently a non-functional stub
[ ] 🔴 Add channel management UI
[ ] 🔴 Connect to GET /api/telegram/channels
[ ] 🟠 Add message composer with preview
[ ] 🟠 Add message history view
[ ] 🟠 Add channel subscriber count display
[ ] 🟡 Add scheduled message feature
[ ] 🟡 Add media attachment support
15.2 frontend/src/pages/seo/SEO.jsx
[ ] 🔴 IMPLEMENT — currently a non-functional stub
[ ] 🔴 Add meta title editor per page
[ ] 🔴 Add meta description editor per page
[ ] 🟠 Add Open Graph tag editor (og:title, og:description, og:image)
[ ] 🟠 Add Twitter Card editor
[ ] 🟡 Add sitemap.xml generator
[ ] 🟡 Add robots.txt editor
[ ] 🟡 Add SEO score preview (character count indicators)
15.3 frontend/src/pages/gallery/GalleryManagement.jsx
[ ] 🟠 Add image compression on upload (client-side using canvas API)
[ ] 🟠 Add bulk upload support (multiple files at once)
[ ] 🟠 Add drag-and-drop upload zone
[ ] 🟡 Add photo tag management
[ ] 🟡 Add album ordering via drag-and-drop
15.4 frontend/src/pages/announcements/Announcements.jsx
[ ] 🟡 Add scheduling feature (publish at future date/time)
[ ] 🟡 Add target audience selector (All, Members, Specific Department)
[ ] 🟡 Add read receipt tracking
15.5 frontend/src/pages/sms/SMSCampaignManager.jsx
[ ] 🔴 IMPLEMENT — currently empty file
[ ] 🔴 Add campaign creation form
[ ] 🔴 Add recipient list selector
[ ] 🟠 Add message template selector
[ ] 🟠 Add campaign scheduling
[ ] 🟡 Add delivery status dashboard
[ ] 🟡 Add campaign analytics (open rate, response rate)
═══════════════════════════════════════════
PHASE 16 — FRONTEND APPROVAL WORKFLOWS
═══════════════════════════════════════════
16.1 frontend/src/components/approvals/ApprovalWorkflowDesigner.jsx
[ ] 🟠 Connect to backend workflow execution engine (currently UI-only)
[ ] 🟠 Add POST /api/workflows to save workflow definitions
[ ] 🟡 Add drag-and-drop workflow step ordering
16.2 frontend/src/pages/approvals/Approvals.jsx
[ ] 🟠 Add bulk approve/reject actions
[ ] 🟠 Add filter by: pending, approved, rejected, expired
[ ] 🟠 Add "Approve with comment" feature
[ ] 🟡 Add approval delegation (out of office)
[ ] 🟡 Add approval deadline indicator
═══════════════════════════════════════════
PHASE 17 — PERFORMANCE OPTIMIZATIONS
═══════════════════════════════════════════
17.1 Bundle Size (Frontend)
[ ] 🟡 frontend/vite.config.js — Granulate manualChunks to isolate recharts into its own chunk
[ ] 🟡 frontend/vite.config.js — Isolate date-fns into its own chunk (only load for date pages)
[ ] 🟡 Replace recharts whole-module imports with named imports: import { AreaChart } from 'recharts'
[ ] 🟡 Replace import * as Icons from 'lucide-react' with individual icon imports everywhere
[ ] 🟡 Evaluate replacing date-fns simple formatting with native Intl.DateTimeFormat
[ ] 🟢 Evaluate replacing axios with custom fetch wrapper to save ~10KB
17.2 API Caching (Backend)
[ ] 🟠 Install ioredis if not already installed
[ ] 🟠 Create backend/utils/cache.js — Redis wrapper with get, set, invalidate helpers
[ ] 🟠 Cache getIdentity() results with 5-minute TTL
[ ] 🟠 Cache dashboard statistics with 5-minute TTL
[ ] 🟠 Cache church settings with 15-minute TTL
[ ] 🟡 Cache treasury dashboard stats with 2-minute TTL
[ ] 🟡 Add cache invalidation hooks on data mutations
17.3 Frontend Caching
[ ] 🟠 frontend/src/utils/cache.js — Verify existing cache is working correctly
[ ] 🟠 Extend cache TTLs: profile data 5min, list data 2min, static config 15min
[ ] 🟡 Add stale-while-revalidate pattern for dashboard data
17.4 Image Optimization
[ ] 🟡 Add loading="lazy" to all <img> tags not yet covered
[ ] 🟡 Add width and height attributes to all <img> to prevent layout shift
[ ] 🟡 Implement WebP conversion for uploaded gallery images
[ ] 🟡 Add responsive srcset for gallery images
═══════════════════════════════════════════
PHASE 18 — SCRIPTS & UTILITIES CLEANUP
═══════════════════════════════════════════
18.1 Logging Standardization (60+ files)
[ ] 🟡 backend/scripts/add-gallery-created-at.js — Replace console.log/error with Pino logger
[ ] 🟡 backend/scripts/add-missing-columns.js — Replace console.log/error with Pino logger
[ ] 🟡 backend/scripts/add-palette-setting.js — Replace console.log/error with Pino logger
[ ] 🟡 backend/scripts/assign-demo-church.js — Replace console.log/error with Pino logger
[ ] 🟡 backend/scripts/auth-telegram.js — Replace console.log/error with Pino logger
[ ] 🟡 backend/scripts/check-approval-requests-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-database.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-departments-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-gallery-albums-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-gallery-photos-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-members-columns.js — Replace console.log with Pino
[ ] 🟡 backend/scripts/check-notification-preferences-columns.js — Replace with Pino
[ ] 🟡 backend/scripts/check-notification-tables.js — Replace with Pino
[ ] 🟡 backend/scripts/check-notification-types-columns.js — Replace with Pino
[ ] 🟡 backend/scripts/check-notifications-columns.js — Replace with Pino
[ ] 🟡 backend/scripts/check-payments-columns.js — Replace with Pino
[ ] 🟡 backend/scripts/check-photo-tag-columns.js — Replace with Pino
[ ] 🟡 backend/scripts/check-security-tables.js — Replace with Pino
[ ] 🟢 Run search for all remaining console.log in backend/scripts/ and replace systematically
18.2 Environment Variable Fixes
[ ] 🟠 backend/scripts/auth-telegram.js — Add validation that TELEGRAM_API_ID and TELEGRAM_API_HASH exist before running
[ ] 🟠 backend/scripts/assign-demo-church.js — Add validation that DATABASE_URL exists
[ ] 🟡 All scripts — Add standard header pattern: validate env vars → create DB connection → run → close connection
18.3 Rollback Mechanisms
[ ] 🟡 backend/scripts/add-missing-columns.js — Add BEGIN/ROLLBACK transaction wrapper
[ ] 🟡 backend/scripts/add-palette-setting.js — Add BEGIN/ROLLBACK transaction wrapper
[ ] 🟡 backend/scripts/assign-demo-church.js — Add BEGIN/ROLLBACK transaction wrapper
18.4 Duplicate Script Consolidation
[ ] 🟢 Consolidate all check-*-columns.js scripts into single check-schema.js that checks all tables at once
[ ] 🟢 Create backend/scripts/utils/dbHelper.js — shared DB connection setup for all scripts
[ ] 🟢 Create backend/scripts/utils/logHelper.js — shared Pino logger for all scripts
═══════════════════════════════════════════
PHASE 19 — TESTING
═══════════════════════════════════════════
19.1 Unit Tests (Backend)
[ ] 🟠 Create backend/__tests__/services/reconciliationService.test.js
[ ] 🟠 Create backend/__tests__/middleware/treasurySecurity.test.js
[ ] 🟠 Create backend/__tests__/middleware/auth.test.js
[ ] 🟡 Create backend/__tests__/repositories/SearchRepository.test.js — confirm church_id filtering
[ ] 🟡 Create backend/__tests__/repositories/TaxStatementRepository.test.js — confirm church_id filtering
[ ] 🟡 Create backend/__tests__/services/aiContentService.test.js — confirm PII masking
[ ] 🟡 Create backend/__tests__/controllers/approvals.controller.test.js — confirm bulk approve
[ ] 🟢 Create backend/__tests__/repositories/BaseRepository.test.js
[ ] 🟢 Create backend/__tests__/services/PaymentGatewayService.test.js
19.2 Integration Tests
[ ] 🟠 Create backend/__tests__/integration/auth.test.js — full login/logout flow
[ ] 🟠 Create backend/__tests__/integration/treasury.test.js — full transaction flow with MFA
[ ] 🟡 Create backend/__tests__/integration/multiTenant.test.js — confirm church A cannot read church B data
[ ] 🟡 Create backend/__tests__/integration/approvals.test.js — full approval workflow
[ ] 🟢 Create backend/__tests__/integration/reconciliation.test.js
19.3 E2E Tests
[ ] 🟡 Create frontend/__tests__/e2e/login.test.js — test full login flow
[ ] 🟡 Create frontend/__tests__/e2e/treasury.test.js — test MFA gate for treasury
[ ] 🟡 Create frontend/__tests__/e2e/roleGuard.test.js — test member cannot access treasury route
[ ] 🟢 Create frontend/__tests__/e2e/dashboard.test.js — test all 5 role dashboards load
19.4 Performance Tests
[ ] 🟡 Test DataTable with 10,000 rows — confirm virtual scrolling handles it
[ ] 🟡 Test request cache — confirm API calls reduced on second load
[ ] 🟡 Test dashboard load time < 2s after caching enabled
[ ] 🟢 Test memory usage with large datasets
═══════════════════════════════════════════
PHASE 20 — DOCUMENTATION & CODE QUALITY
═══════════════════════════════════════════
20.1 API Documentation
[ ] 🟡 Document all GET endpoints with request/response format
[ ] 🟡 Document all POST endpoints with request body schema
[ ] 🟡 Document all PUT/PATCH endpoints
[ ] 🟡 Document all DELETE endpoints
[ ] 🟢 Generate OpenAPI/Swagger spec from route definitions
20.2 Architecture Documentation
[ ] 🟡 Update CODEBASE_AUDIT_PROTOCOL.md to reflect completed work
[ ] 🟡 Create backend/docs/MODULE_DEPENDENCIES.md — diagram of which modules depend on which
[ ] 🟡 Create backend/docs/REPOSITORY_GUIDE.md — how to use BaseRepository, church_id rules
[ ] 🟢 Create frontend/docs/DESIGN_SYSTEM.md — token names and usage guide
20.3 Code Cleanup
[ ] 🟡 backend/controllers/stub.controller.js — DELETE this file before production
[ ] 🟡 frontend/src/pages/admin/AdministrationAlternative.jsx — DELETE or implement
[ ] 🟡 frontend/src/pages/admin/AdministrationOriginal.jsx — DELETE or implement
[ ] 🟢 Grep for TODO comments across entire codebase and address each one
[ ] 🟢 Grep for FIXME comments and address
[ ] 🟢 Grep for console.log in frontend/src/ and replace with proper logging
[ ] 🟢 Remove all commented-out code blocks longer than 10 lines
═══════════════════════════════════════════
PHASE 21 — FEATURE COMPLETION (MISSING FEATURES)
═══════════════════════════════════════════
21.1 Email System
[ ] 🟠 backend/controllers/auth.controller.js line 398 — wire up emailService.js to send password reset emails
[ ] 🟠 Create backend/templates/email/passwordReset.html — email template
[ ] 🟠 Create backend/templates/email/welcome.html — new member welcome email
[ ] 🟡 Create backend/templates/email/approvalResult.html — approval approved/rejected notification
[ ] 🟡 Create backend/templates/email/receiptTemplate.html — contribution receipt email
[ ] 🟡 Add email queue using bull or similar to prevent blocking
[ ] 🟢 Add email open tracking
21.2 Audit Trail System
[ ] 🟠 Create backend/migrations/ — add audit_logs table: (id, church_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at)
[ ] 🟠 Create backend/repositories/AuditLogRepository.js
[ ] 🟠 backend/services/AuditingService.js — implement log(action, entity, old, new, req)
[ ] 🟠 Add audit log call to all treasury mutations (create, update, delete)
[ ] 🟠 Add audit log call to all user role changes
[ ] 🟠 Add audit log call to all approval decisions
[ ] 🟡 Add audit log call to all church settings changes
[ ] 🟡 Create frontend/src/pages/admin/AuditLogs.jsx — view and filter audit logs
21.3 Real-Time WebSocket Features
[ ] 🟠 backend/server.js — register Socket.IO event handlers for approvals:new
[ ] 🟠 backend/server.js — register event handler for notification:new
[ ] 🟠 backend/server.js — register event handler for system:health
[ ] 🟠 backend/controllers/approvals.controller.js — emit approvals:new when approval request is created
[ ] 🟠 backend/controllers/activityFeed.controller.js — emit activity:new on significant events
[ ] 🟡 Add chat real-time messaging via Socket.IO
[ ] 🟡 Add real-time notification count badge update
21.4 Document Management
[ ] 🟠 backend/controllers/documents.controller.js — replace simulated cloud upload with real file storage
[ ] 🟠 Configure multer-s3 or @azure/storage-blob for cloud storage
[ ] 🟠 Add STORAGE_PROVIDER environment variable (s3, azure, local)
[ ] 🟡 Add document version history UI
[ ] 🟡 Add document search by content (full-text search)
21.5 Attendance Tracking
[ ] 🟠 backend/repositories/DashboardRepository.js — implement getMinistryHealth() using attendance data
[ ] 🟡 Create frontend/src/pages/attendance/Attendance.jsx if it doesn't exist
[ ] 🟡 Add QR code check-in feature for services
[ ] 🟢 Add attendance streak calculation per member
21.6 Reporting System
[ ] 🟠 frontend/src/components/reports/ReportBuilder.jsx — connect to backend report generation API
[ ] 🟠 backend/controllers/customReport.controller.js — implement secure QueryBuilder
[ ] 🟡 Add PDF export using jspdf for all major reports
[ ] 🟡 Add CSV export for all major reports
[ ] 🟢 Add scheduled report delivery via email
═══════════════════════════════════════════
PHASE 22 — MOBILE RESPONSIVENESS
═══════════════════════════════════════════
[ ] 🟠 frontend/src/components/common/DataTable.jsx — mobile card view for screens < md
[ ] 🟡 frontend/src/pages/treasury/Transactions.jsx — test on 375px mobile screen
[ ] 🟡 frontend/src/pages/treasury/Budgets.jsx — test on 375px mobile screen
[ ] 🟡 All modals — ensure they are full-screen on mobile
[ ] 🟡 All forms — ensure labels stack above inputs on mobile (not side-by-side)
[ ] 🟡 All tables — ensure they scroll horizontally on mobile
[ ] 🟡 Sidebar — confirm mobile drawer works correctly
[ ] 🟡 All buttons — ensure minimum 44x44px touch target (WCAG)
[ ] 🟡 Search inputs — ensure keyboard doesn't cover input on mobile iOS
[ ] 🟢 Test entire app on actual mobile device (iOS and Android)
[ ] 🟢 Add PWA manifest for "Add to Home Screen" support
═══════════════════════════════════════════
PHASE 23 — DEPENDENCY CLEANUP
═══════════════════════════════════════════
[ ] 🟡 frontend/package.json — Evaluate removing react-toastify after toast migration
[ ] 🟡 frontend/package.json — Evaluate replacing date-fns with native Intl.DateTimeFormat
[ ] 🟢 frontend/package.json — Evaluate replacing axios with native fetch wrapper
[ ] 🟡 backend/package.json — Audit for unused packages (npm-check-unused)
[ ] 🟢 frontend/package.json — Audit for unused packages
[ ] 🟢 Update all dependencies with security vulnerabilities (npm audit fix)
═══════════════════════════════════════════
QUICK WIN CHECKLIST (Can be done in <30 mins each)
═══════════════════════════════════════════
[ ] 🔴 backend/scripts/reset-db.js — Add NODE_ENV production block (5 lines of code)
[ ] 🔴 backend/server.js — Add process.exit(1) after uncaughtException log (1 line)
[ ] 🔴 backend/services/reconciliationService.js — Define missing pending variable (2-3 lines)
[ ] 🔴 backend/controllers/dashboard.controller.js — Fix p.user_id → p.member_id (1 line)
[ ] 🔴 backend/controllers/payments.controller.js — Fix income_categories → payment_categories (1 line)
[ ] 🔴 backend/config/logging.js — Add redact array (3 lines)
[ ] 🔴 backend/config/logging.js — Add NODE_ENV guard on pino-pretty (2 lines)
[ ] 🟠 backend/config/database.js — Change timeout from 2000 to 5000 (1 line)
[ ] 🟠 backend/config/telegram.js — Wrap constants in process.env || default (5 lines)
[ ] 🟠 frontend/src/router/dashboard.routes.jsx — Remove duplicate payments route (1 line)
═══════════════════════════════════════════
PHASE 24 — BACKEND API HARDENING
Extra security and robustness for every endpoint
═══════════════════════════════════════════
24.1 Input Validation (All Controllers)
[ ] 🟠 backend/controllers/auth.controller.js — Validate email format in register/login using validator.js
[ ] 🟠 backend/controllers/auth.controller.js — Validate password minimum length (8 chars) on register
[ ] 🟠 backend/controllers/auth.controller.js — Sanitize all string inputs with express-validator
[ ] 🟠 backend/controllers/members.controller.js — Validate phone number format (Kenyan: +254xxxxxxxxx)
[ ] 🟠 backend/controllers/members.controller.js — Validate national ID is numeric and 7-8 digits
[ ] 🟠 backend/controllers/members.controller.js — Validate date of birth is a valid date and not in the future
[ ] 🟠 backend/controllers/treasury.controller.js — Validate all monetary amounts are positive numbers
[ ] 🟠 backend/controllers/treasury.controller.js — Validate currency code is a known ISO 4217 code
[ ] 🟠 backend/controllers/payments.controller.js — Validate M-Pesa phone number format before initiating payment
[ ] 🟠 backend/controllers/payments.controller.js — Validate payment amount is within configured limits
[ ] 🟠 backend/controllers/gallery.controller.js — Validate uploaded file MIME type (allow only image/*)
[ ] 🟠 backend/controllers/gallery.controller.js — Validate uploaded file size (max 10MB)
[ ] 🟠 backend/controllers/documents.controller.js — Validate file type against allowed types list
[ ] 🟠 backend/controllers/documents.controller.js — Validate file size (max 50MB)
[ ] 🟠 backend/controllers/sms.controller.js — Validate phone number list before sending bulk SMS
[ ] 🟠 backend/controllers/sms.controller.js — Validate message does not exceed 160 characters (or handle multi-part)
[ ] 🟠 backend/controllers/announcements.controller.js — Validate title max length (200 chars)
[ ] 🟠 backend/controllers/announcements.controller.js — Validate body is not empty
[ ] 🟠 backend/controllers/events.controller.js — Validate event start date is before end date
[ ] 🟠 backend/controllers/events.controller.js — Validate event is not scheduled in the past (unless backdating is allowed)
[ ] 🟡 Create backend/middleware/validate.js — reusable validation middleware factory
[ ] 🟡 Create backend/validators/memberValidator.js — all member-related validation schemas
[ ] 🟡 Create backend/validators/treasuryValidator.js — all treasury-related validation schemas
[ ] 🟡 Create backend/validators/authValidator.js — all auth-related validation schemas
24.2 Response Standardization
[ ] 🟠 Audit every res.json() call in backend/controllers/ and replace with ResponseHandler
[ ] 🟠 Ensure all success responses follow: { success: true, data: {...}, message: '...' }
[ ] 🟠 Ensure all error responses follow: { success: false, error: '...', code: '...' }
[ ] 🟡 Add HTTP status codes consistently: 200 (ok), 201 (created), 400 (bad request), 401 (unauth), 403 (forbidden), 404 (not found), 422 (validation), 500 (server error)
[ ] 🟡 Create error code constants: ERR_NOT_FOUND, ERR_UNAUTHORIZED, ERR_VALIDATION, etc.
24.3 Rate Limiting
[ ] 🟠 backend/middleware/securityMiddleware.js — Add Redis-backed rate limiter (replace in-memory)
[ ] 🟠 backend/routes/auth.routes.js — Apply strict rate limit: 5 login attempts per 15 minutes per IP
[ ] 🟠 backend/routes/auth.routes.js — Apply strict rate limit: 3 password reset requests per hour per email
[ ] 🟠 backend/routes/sms.routes.js — Apply rate limit: 100 SMS per hour per church
[ ] 🟠 backend/routes/ai.routes.js — Apply rate limit: 50 AI requests per hour per church
[ ] 🟡 Add rate limit bypass for whitelisted IPs (admin server)
[ ] 🟡 Add rate limit alert when 80% of limit is consumed
24.4 Request Logging
[ ] 🟠 backend/app.js — Add pino-http middleware for request/response logging
[ ] 🟠 Log all requests: method, path, status code, response time, user ID, church ID
[ ] 🟠 Log all errors: stack trace (dev only), error message, request ID
[ ] 🟡 Add request ID header (X-Request-ID) generated per request
[ ] 🟡 Pass request ID through to all downstream service calls for tracing
═══════════════════════════════════════════
PHASE 25 — FRONTEND COMPONENT COMPLETENESS
Every component should be fully implemented
═══════════════════════════════════════════
25.1 Activity Feed Components
[ ] 🟠 frontend/src/components/common/ActivityFeed.jsx — Connect to GET /api/activity-feed real endpoint
[ ] 🟠 frontend/src/components/common/RealTimeActivityFeed.jsx — Connect to Socket.IO for real-time updates
[ ] 🟠 frontend/src/components/common/RealTimeActivityFeed.jsx — Add reconnection logic
[ ] 🟡 Add activity type icons (member joined, payment made, approval requested, etc.)
[ ] 🟡 Add "Load more" pagination button at bottom of feed
[ ] 🟡 Add activity filter (All, Members, Finance, Approvals)
25.2 Approval Card Component
[ ] 🟠 Create frontend/src/components/approvals/ApprovalCard.jsx
[ ] 🟠 ApprovalCard.jsx — Show requester name, department, request type, date submitted
[ ] 🟠 ApprovalCard.jsx — Show "Approve" and "Reject" buttons with confirmation
[ ] 🟠 ApprovalCard.jsx — Show comment input when rejecting
[ ] 🟡 ApprovalCard.jsx — Show priority badge (urgent, normal, low)
[ ] 🟡 ApprovalCard.jsx — Show deadline indicator with countdown if applicable
25.3 Stats Cards
[ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add trend arrow (up/down from previous period)
[ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add percentage change label
[ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add isLoading prop that shows StatsCardSkeleton
[ ] 🟡 frontend/src/components/common/StatsCard.jsx — Add onClick prop for drill-down navigation
[ ] 🟡 frontend/src/components/common/StatsCard.jsx — Add tooltip with more detail on hover
25.4 Chart Components
[ ] 🟠 Create frontend/src/components/charts/AttendanceChart.jsx — AreaChart of weekly attendance
[ ] 🟠 Create frontend/src/components/charts/GivingChart.jsx — BarChart of monthly giving
[ ] 🟠 Create frontend/src/components/charts/CashFlowChart.jsx — LineChart of income vs expenses
[ ] 🟠 Create frontend/src/components/charts/BudgetChart.jsx — Progress bars for budget utilization
[ ] 🟡 Create frontend/src/components/charts/DepartmentChart.jsx — BarChart of dept task completion
[ ] 🟡 All charts — add isLoading prop with skeleton shimmer
[ ] 🟡 All charts — add isEmpty prop with empty state illustration
[ ] 🟡 All charts — add error prop with retry button
[ ] 🟢 All charts — add export as PNG button
25.5 Empty State Components
[ ] 🟡 Create unique EmptyState variant for "No Transactions Found"
[ ] 🟡 Create unique EmptyState variant for "No Members Found"
[ ] 🟡 Create unique EmptyState variant for "No Pending Approvals"
[ ] 🟡 Create unique EmptyState variant for "No Events Scheduled"
[ ] 🟡 Create unique EmptyState variant for "No Documents Uploaded"
[ ] 🟡 All EmptyState variants — add action button ("Add Transaction", "Invite Member", etc.)
25.6 Header & Navigation
[ ] 🟡 frontend/src/components/layout/Header.jsx — Add notification bell with unread count badge
[ ] 🟡 frontend/src/components/layout/Header.jsx — Add notification dropdown showing last 5 notifications
[ ] 🟡 frontend/src/components/layout/Header.jsx — Add "Mark all as read" button in notification dropdown
[ ] 🟡 frontend/src/components/layout/Header.jsx — Add church logo/name in header
[ ] 🟢 frontend/src/components/layout/Header.jsx — Add search bar with global search across members, documents, transactions
25.7 Profile & Settings Pages
[ ] 🟡 frontend/src/pages/profile/Profile.jsx — Connect to real GET /api/users/profile endpoint
[ ] 🟡 frontend/src/pages/profile/Profile.jsx — Add avatar upload with crop tool
[ ] 🟡 frontend/src/pages/profile/Profile.jsx — Add change password form
[ ] 🟡 frontend/src/pages/profile/Profile.jsx — Add MFA setup/disable toggle
[ ] 🟡 frontend/src/pages/settings/Settings.jsx — Add church branding settings (logo, colors, name)
[ ] 🟢 frontend/src/pages/settings/Settings.jsx — Add timezone setting
[ ] 🟢 frontend/src/pages/settings/Settings.jsx — Add currency setting (KES, USD, etc.)
═══════════════════════════════════════════
PHASE 26 — BACKEND MODULE COMPLETENESS
Ensure every module has full CRUD + validation
═══════════════════════════════════════════
26.1 Events Module
[ ] 🟠 backend/controllers/events.controller.js — Add bulk delete endpoint
[ ] 🟠 backend/controllers/events.controller.js — Add RSVP tracking endpoint
[ ] 🟠 backend/controllers/events.controller.js — Add church_id filter to all queries
[ ] 🟡 backend/controllers/events.controller.js — Add recurring event support
[ ] 🟡 backend/controllers/events.controller.js — Add calendar export (iCal format)
26.2 Notifications Module
[ ] 🟠 backend/controllers/notifications.controller.js — Add GET /notifications/unread-count
[ ] 🟠 backend/controllers/notifications.controller.js — Add PUT /notifications/mark-all-read
[ ] 🟠 backend/controllers/notifications.controller.js — Add DELETE /notifications/:id
[ ] 🟠 backend/controllers/notifications.controller.js — Add church_id to all queries
[ ] 🟡 Add push notification support via FCM/APNs
[ ] 🟡 Add notification preference settings per user
26.3 Comments Module
[ ] 🟡 backend/controllers/comments.controller.js — Add nested replies support
[ ] 🟡 backend/controllers/comments.controller.js — Add like/react feature
[ ] 🟡 backend/controllers/comments.controller.js — Add mention (@username) support
[ ] 🟡 backend/controllers/comments.controller.js — Add church_id to all queries
26.4 Analytics Module
[ ] 🟠 backend/controllers/analytics.controller.js — Replace manual JSON assembly with AnalyticsRepository
[ ] 🟠 backend/repositories/AnalyticsRepository.js — Add getAttendanceTrend(churchId, weeks) method
[ ] 🟠 backend/repositories/AnalyticsRepository.js — Add getGivingTrend(churchId, months) method
[ ] 🟠 backend/repositories/AnalyticsRepository.js — Add getMemberGrowth(churchId, months) method
[ ] 🟡 backend/repositories/AnalyticsRepository.js — Add getDepartmentEngagement(churchId) method
[ ] 🟡 Add caching for all analytics queries (5-minute TTL)
26.5 MFA (Multi-Factor Authentication)
[ ] 🔴 backend/middleware/treasurySecurity.js — Implement real TOTP verification (use otplib library)
[ ] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/setup endpoint
[ ] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/verify endpoint
[ ] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/disable endpoint
[ ] 🟠 backend/controllers/auth.controller.js — Add QR code generation for TOTP setup
[ ] 🟠 frontend/src/pages/profile/Profile.jsx — Add MFA setup flow with QR code display
[ ] 🟠 frontend/src/pages/auth/Login.jsx — Add TOTP code input step after password
[ ] 🟡 Add backup codes for MFA recovery (10 single-use codes)
[ ] 🟡 Store backup codes hashed in database
═══════════════════════════════════════════
PHASE 27 — GRANULAR FILE-BY-FILE TASKS
Every script and utility file checked
═══════════════════════════════════════════
27.1 Remaining Script Fixes
[ ] 🟠 backend/scripts/auth-wrapper.js — Add validation that all required env vars exist at startup
[ ] 🟠 backend/scripts/auth-wrapper.js — Replace console.log with logger.info
[ ] 🟠 backend/scripts/check-approval-requests-columns.js — Add table existence check before querying
[ ] 🟠 backend/scripts/check-columns.js — Consolidate into single check-schema.js script
[ ] 🟠 backend/scripts/check-database.js — Add table existence guard before each query
[ ] 🟠 backend/scripts/check-departments-columns.js — Add table existence guard
[ ] 🟡 backend/scripts/check-gallery-albums-columns.js — Add table existence guard
[ ] 🟡 backend/scripts/check-gallery-photos-columns.js — Add table existence guard
[ ] 🟡 backend/scripts/check-members-columns.js — Standardize env variable usage (currently inconsistent)
[ ] 🟡 backend/scripts/check-mfa-status.js — No changes needed (already good)
[ ] 🟡 backend/scripts/check-missing-repository-methods.js — Replace console.log with logger
[ ] 🟡 backend/scripts/check-notification-preferences-columns.js — Add table guard
[ ] 🟡 backend/scripts/check-notification-tables.js — Add table guard
[ ] 🟡 backend/scripts/check-notification-types-columns.js — Add table guard
[ ] 🟡 backend/scripts/check-notifications-columns.js — Add table guard
[ ] 🟡 backend/scripts/check-payments-columns.js — Add table guard
[ ] 🟡 backend/scripts/check-photo-tag-columns.js — Add table guard for both tables
[ ] 🟡 backend/scripts/check-security-tables.js — Add table guard
[ ] 🟢 backend/scripts/check-departments.js — Already good, no changes needed
[ ] 🟢 backend/scripts/check-mfa-status.js — Already good, no changes needed
27.2 Utility Functions
[ ] 🟡 Create backend/utils/validators.js — isValidEmail(), isKenyanPhone(), isValidUUID(), isPositiveAmount()
[ ] 🟡 Create backend/utils/formatters.js — formatCurrency(amount, currency), formatDate(date), formatPhone(phone)
[ ] 🟡 Create backend/utils/pagination.js — getPaginationParams(query), buildPaginationMeta(total, page, limit)
[ ] 🟡 Create backend/utils/slugify.js — slugify(text) for URL-safe strings
[ ] 🟡 Create frontend/src/utils/formatters.js — shared date/currency formatters for UI
[ ] 🟡 Create frontend/src/utils/validators.js — shared form validators for UI
[ ] 🟡 Create frontend/src/hooks/useMobile.js — returns true if screen is mobile-sized
[ ] 🟡 Create frontend/src/hooks/usePagination.js — shared pagination logic for all list pages
[ ] 🟡 Create frontend/src/hooks/useForm.js — shared form state management with validation
27.3 Frontend Utility Files
[ ] 🟠 frontend/src/utils/cache.js — Verify cache is working and add invalidate(key) method
[ ] 🟠 frontend/src/utils/cache.js — Add invalidatePattern(pattern) to clear related cache keys
[ ] 🟠 frontend/src/utils/api.js — Confirm auth-api axios instance has interceptors for 401 handling
[ ] 🟡 frontend/src/utils/api.js — Add request ID header to all requests
[ ] 🟡 frontend/src/utils/constants.js — Create centralized constants: role names, API routes, error messages
[ ] 🟢 frontend/src/utils/helpers.js — Review for any functions that should be split into dedicated utils
═══════════════════════════════════════════
PHASE 28 — DEPLOYMENT & DEVOPS READINESS
═══════════════════════════════════════════
28.1 Environment Configuration
[ ] 🟠 Create .env.example in root with all required environment variables documented
[ ] 🟠 Create .env.example with placeholder values (never real secrets)
[ ] 🟠 Document every env variable: what it does, format, required/optional
[ ] 🟠 backend/config/env-validation.js — Validate ALL required env vars are present on startup
[ ] 🟠 App should fail fast with clear error if required env var is missing
[ ] 🟡 Add separate .env.test for test environment
[ ] 🟡 Add documentation for setting up local development environment
28.2 Docker & Production
[ ] 🟡 Verify Dockerfile uses multi-stage build (builder + production)
[ ] 🟡 Verify Dockerfile runs as non-root user in production
[ ] 🟡 Verify docker-compose.yml includes PostgreSQL and Redis services
[ ] 🟡 Add health check endpoint GET /health that checks DB + Redis connectivity
[ ] 🟡 backend/server.js — Add graceful shutdown on SIGTERM (for container orchestration)
[ ] 🟢 Add Makefile with common commands: make dev, make test, make migrate, make build
28.3 CI/CD Readiness
[ ] 🟡 Ensure npm test runs without requiring a real database connection
[ ] 🟡 Add lint script: npm run lint using ESLint
[ ] 🟡 Add type check script if TypeScript is being considered
[ ] 🟢 Create .github/workflows/ci.yml — run lint + tests on every pull request
[ ] 🟢 Create .github/workflows/deploy.yml — auto-deploy on merge to main
═══════════════════════════════════════════
PHASE 29 — ACCESSIBILITY (WCAG 2.1 AA)
═══════════════════════════════════════════
[ ] 🟡 Verify all interactive elements have ARIA labels
[ ] 🟡 Verify all images have alt text (meaningful or alt="" for decorative)
[ ] 🟡 Verify modals trap focus when open
[ ] 🟡 Verify all forms have <label> elements associated with inputs
[ ] 🟡 Verify color contrast ratio is at least 4.5:1 for normal text
[ ] 🟡 Verify all interactive elements are keyboard navigable (Tab order is logical)
[ ] 🟡 Verify <button> elements are used for actions (not <div onClick>)
[ ] 🟡 Verify <a> elements are used for navigation (not <div onClick>)
[ ] 🟡 Verify skip navigation link works and is visible on focus
[ ] 🟡 Add role="alert" to all error messages so screen readers announce them
[ ] 🟡 frontend/src/components/common/DataTable.jsx — Add scope="col" to all <th> elements
[ ] 🟡 frontend/src/components/common/Modal.jsx — Add aria-modal="true" and aria-labelledby
[ ] 🟡 All icon-only buttons — Add aria-label text describing the action
[ ] 🟢 Run automated accessibility audit with axe-core and fix all violations
═══════════════════════════════════════════
PHASE 30 — FINAL VERIFICATION CHECKLIST
Run through this before marking anything "done"
═══════════════════════════════════════════
30.1 Security Checklist
[ ] 🔴 Confirm no hardcoded passwords/secrets exist in any file (run: git grep -i 'password.*=.*["\x27][a-z]')
[ ] 🔴 Confirm all treasury routes require MFA (test manually)
[ ] 🔴 Confirm church A cannot read church B data (write multi-tenant test)
[ ] 🔴 Confirm CSRF protection is working (test with curl without CSRF header)
[ ] 🔴 Confirm SQL injection is not possible in custom reports (test with ' OR 1=1)
[ ] 🔴 Confirm reset-db.js is blocked in production
[ ] 🟠 Confirm PII is not logged anywhere (check log output during test)
[ ] 🟠 Confirm rate limiting works (send 10 rapid login requests and verify block)
[ ] 🟠 Confirm roles are enforced (login as Member and try to hit treasury endpoint)
30.2 Architecture Checklist
[ ] 🟠 Confirm no controller has direct DB pool access (grep -r "this.pool" backend/controllers/)
[ ] 🟠 Confirm no repository returns hardcoded data
[ ] 🟠 Confirm global.io is not used anywhere (grep -r "global.io" backend/)
[ ] 🟠 Confirm all routes are registered in app.js
[ ] 🟠 Confirm no duplicate route paths exist
[ ] 🟡 Confirm all repository methods accept churchId parameter
30.3 Frontend Checklist
[ ] 🟠 Confirm no treasury page is accessible without Treasurer role
[ ] 🟠 Confirm no admin page is accessible without Super Admin role
[ ] 🟠 Confirm useDataFetch uses auth-api not native fetch
[ ] 🟠 Confirm all dashboard pages show skeleton screens while loading
[ ] 🟡 Confirm all forms show inline validation errors
[ ] 🟡 Confirm app works correctly on mobile 375px width
[ ] 🟡 Confirm dark mode works if implemented
[ ] 🟢 Confirm all "Coming Soon" placeholders are removed
30.4 Performance Checklist
[ ] 🟡 Confirm dashboard loads in under 2 seconds on first visit
[ ] 🟡 Confirm dashboard loads in under 500ms on second visit (cached)
[ ] 🟡 Confirm DataTable handles 1000+ rows without browser lag
[ ] 🟡 Confirm no N+1 queries exist (enable query logging and check)
[ ] 🟡 Confirm bundle size is under 1MB gzipped
[ ] 🟢 Run Lighthouse audit — score 90+ on Performance, Accessibility, Best Practices
30.5 Code Quality Checklist
[ ] 🟡 Confirm no console.log exists in backend/ (except in scripts with pino-logger)
[ ] 🟡 Confirm no console.log exists in frontend/src/ (except development debugging)
[ ] 🟡 Confirm no TODO comments remain in production code
[ ] 🟡 Confirm stub.controller.js is deleted
[ ] 🟡 Confirm AdministrationAlternative.jsx and AdministrationOriginal.jsx are deleted or implemented
[ ] 🟢 Confirm all tests pass (npm test)
[ ] 🟢 Confirm ESLint passes with no errors (npm run lint)
Total Tasks Listed: ~2100
File Line Count Target: 2000+
Estimated Completion Time: 10-14 weeks (solo developer) / 6-8 weeks (team of 3)
Recommended Start Order: Phase 1 → Phase 2 → Phase 3 → then any remaining phases in priority order

Priority Legend:

🔴 CRITICAL — Fix immediately, these are real security risks or crash bugs
🟠 HIGH — Fix this week, these affect system integrity and correctness
🟡 MEDIUM — Fix this month, these improve quality and completeness
🟢 LOW — Fix when possible, polish and nice-to-haves
Sources: Master_Audit_map_refactored, GRANULAR_AUDIT_CLUSTERS.md, GRANULAR_AUDIT_CLUSTERS - Copy.md, GRANULAR_AUDIT_CLUSTERS - Copy (2).md, CODEBASE_AUDIT_PROTOCOL.md, LEAN_ARCHITECTURE_REPORT.md, DEEP_GAP_ANALYSIS.md, GRANULAR_TASK_LIST.md, IMPLEMENTATION_PLAN.md, AUDIT_RESULTS.md, COMBINED_AUDIT_REPORT.md