# Phase 1: Critical Runtime Crashes (Fix Before Anything Else)
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

These are active bugs that cause the app to crash or expose security vulnerabilities at runtime. Fix every 🔴 item in this file before touching anything else in the codebase.

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

*Next: See `02_PHASE2_multitenancy_base_search.md` for Phase 2 security fixes*
