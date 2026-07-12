# CLUSTER — Auth and Identity
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: auth.js middleware, IdentityService.js, passport.js, AuthContext.jsx, usePermission.js, ProtectedRoute.jsx, ProtectedComponent.jsx, login/logout/register flows, MFA, JWT, CSRF, session management.

---

## From PHASE 1 — CRITICAL RUNTIME CRASHES

### Phase 1.1 — `backend/middleware/auth.js` — Missing Import Crash

- [x] 🔴 Open `backend/middleware/auth.js` and add `const { pool } = require('../config/database');` at line 1 (currently missing, causes crash at runtime when `requireDepartmentPermission` is called)
- [x] 🔴 Locate line 150 in `auth.js` — the `permissions[permission]` check uses bracket notation but `permissions` is an array, not an object; change to `permissions.includes(permission)` to fix the always-failing check
- [x] 🔴 Test `requireDepartmentPermission` middleware by calling a department-scoped route and confirming 200 for valid permission, 403 for invalid
- [x] 🟠 Change in-memory LRU cache (lines 7–11, using `Map`) to track `timestamp` per entry so eviction is true LRU, not FIFO
- [x] 🟠 Add `invalidateUserCache(userId)` export function that deletes the user's entry from `identityCache` — call this from any code that changes a user's roles or permissions
- [x] 🟡 Move `MAX_CACHE_SIZE` to an env var `AUTH_CACHE_SIZE` with default 1000 so it can be tuned without a code deploy
- [x] 🟡 Add a cache hit/miss log line at `debug` level so you can monitor cache effectiveness without affecting performance

### Phase 1.3 — `backend/services/IdentityService.js` — Require Inside Function

- [x] 🔴 Open `backend/services/IdentityService.js`, move `const speakeasy = require('speakeasy');` from inside `validateMFA()` (line 144) to the top of the file — requiring inside a function works but is non-standard and will fail if module caching behaves unexpectedly under test
- [x] 🟠 Change line 68 (`mfaVerified: false`) to read from the session: `mfaVerified: req.session?.mfaVerified || false` so the hardcoded false doesn't override a valid MFA session
- [x] 🟡 Add rate limiting inside `validateMFA()`: track failed attempts per userId in Redis/memory, lock out after 5 failures for 15 minutes

### Phase 1.5 — `backend/config/passport.js` — Null-Pointer Crashes

- [x] 🔴 Change line 19 `profile.emails[0].value` → `profile.emails?.[0]?.value || null` — crashes if Google returns no email
- [x] 🔴 Change line 48 (Facebook strategy) with same optional chaining fix on emails array
- [x] 🟠 Change `serializeUser` to store only `user.id` (not the whole object) — `done(null, user.id)`
- [x] 🟠 Change `deserializeUser` to query the DB by id: `pool.query('SELECT * FROM users WHERE id = $1', [id])` and call `done(null, result.rows[0])`
- [x] 🟡 Add `try/catch` around the deserialize DB query so a DB error calls `done(err, null)` instead of crashing

---

## From PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### Phase 3.8 — `backend/controllers/auth.controller.js` — Multiple Critical Gaps

- [x] 🔴 Wire up `validatePasswordStrength` on registration: it is imported on line 12 but never called; call it in `register()` before creating the user and return 400 if it fails
- [x] 🔴 Replace direct SQL query in `register()` (lines 117–124) with the appropriate repository method — using raw queries bypasses validation layers
- [x] 🔴 Add account lockout: after 5 failed login attempts for the same email, set `locked_until = NOW() + INTERVAL '15 minutes'` and return 429
- [x] 🟠 Add check in `login()`: if `user.locked_until > NOW()`, return 429 with remaining lockout time
- [x] 🟠 Validate `email` and `password` are present in `login()` before querying DB — return 400 if either is missing
- [x] 🟠 On successful login, reset `failed_login_attempts` counter to 0
- [x] 🟠 Add email verification flow: on `register()`, set `email_verified = false` and send a verification email with a signed token; add `POST /verify-email` handler that sets `email_verified = true`
- [x] 🟡 In `logout()`: invalidate the refresh token in the DB (set `used = true`) not just clear the cookie — otherwise the refresh token can still be used after logout
- [x] 🟡 Add `church_id` to the registration flow: require `church_id` or `church_slug` in the registration body and associate the new user with that church

---

## From PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

### Phase 4.3 — `backend/routes/auth.routes.js` — Registration Without Church Context

- [x] 🟠 Update `POST /register` to require `church_id` or `church_slug` in the body validation
- [x] 🟠 Add `POST /verify-email` route and handler to complete the email verification flow
- [x] 🟡 Scope `/audit-log` to return only the requesting user's own church's audit data

### Phase 4.4 — `backend/middleware/identityGuard.js` — Property Name Mismatch

- [x] 🔴 Fix line 44: change `req.churchId` → `req.church_id` — `tenantResolver` sets `req.church_id` (underscore) but `identityGuard` reads `req.churchId` (camelCase), so the cross-tenant check never fires
- [x] 🟠 Add session activity tracking after line 41: call `IdentityService.updateLastActivity(req.user.id, req.ip, req.headers['user-agent'])` to track last seen time
- [x] 🟡 Add concurrent session limit check: if user already has 3 active sessions, reject new login with 429

---

## From PHASE 6 — BACKEND SERVICES FIXES

### Phase 6.3 — `backend/services/IdentityService.js` — Cache and Session Issues

- [x] 🟠 Add `updateLastActivity(userId, ip, userAgent)` method that upserts into a `user_sessions` table — needed by identityGuard
- [x] 🟡 Add an in-process cache to `getIdentity()` with 60-second TTL to avoid querying the DB on every authenticated request
- [x] 🟡 Add `invalidateIdentityCache(userId)` method and call it when user roles or permissions change

---

## From PHASE 7 — FRONTEND HOOKS FIXES

### Phase 7.4 — `frontend/src/hooks/usePermission.js` — Hardcoded Admin Roles

- [x] 🟡 Move hardcoded `['Super Admin', 'Pastor', 'First Elder']` list (lines 59–61) to a constant in a shared config file `frontend/src/config/roles.js` so it's changed in one place
- [x] 🟡 Add permission hierarchy: if user `hasPermission('manage_members')`, automatically also satisfy `hasPermission('view_members')` without needing explicit permission assignment
- [x] 🟢 Add `useMemo` around expensive permission-check results that get called in render functions

---

## From PHASE 8 — FRONTEND CONTEXT FIXES

### Phase 8.1 — `frontend/src/contexts/AuthContext.jsx` — No Token Refresh

- [x] 🟠 Add token refresh logic: when the `api` interceptor receives a 401, call `POST /api/auth/refresh-token` with the refresh token cookie before clearing the user — currently a 401 immediately logs out the user even if the refresh token is valid
- [x] 🟠 Add inactivity timeout: start a 30-minute timer on each API request; if it expires, call `logout()` and redirect to login
- [x] 🟠 Improve cache key generation on line 46: use `JSON.stringify({method, url, params, data})` and hash it with a simple `djb2` function to prevent key collisions from URL/param ambiguity
- [x] 🟡 Add request deduplication: if `api.get('/dashboard/stats')` is in-flight and another component calls the same endpoint, return the same promise rather than a second request
- [x] 🟡 Add offline detection using `navigator.onLine` and a `window 'online'/'offline'` event listener — queue requests while offline and flush when connection resumes
- [x] 🟢 Add request timeout: configure `axios` `timeout: 30000` (30 seconds) so hung requests don't block the UI forever

---

## From PHASE 9 — FRONTEND COMPONENT FIXES

### Phase 9.3 — `frontend/src/components/ProtectedRoute.jsx` — Console Logs in Production

- [x] 🟠 Remove or wrap all `console.log` statements (lines 10, 24, 37, 42) in `import.meta.env.DEV &&` conditions — these leak routing logic and auth state in production browser consoles
- [x] 🟡 Make redirect paths configurable via props: `<ProtectedRoute redirectTo="/login">` instead of hardcoded `"/"`
- [x] 🟡 Preserve the intended path as a `?redirect=` query param so after login the user is sent back to where they were going
- [x] 🟢 Add role-based protection: accept a `requiredRoles` prop in addition to `permission` and `permissions`

### Phase 9.4 — `frontend/src/components/common/ProtectedComponent.jsx` — Stubbed Access Request

- [x] 🟠 Implement `RequestAccessButton` `onClick` handler (line 119 `console.log` stub): call `api.post('/api/access-requests', { feature, requested_by: user.id })` and show a toast on success
- [x] 🟡 Add loading state to `RequestAccessButton`: disable and show spinner after clicking until API responds
- [x] 🟡 Track request status: store the pending request ID in state and change button text to `"Request Sent"` so users can't double-submit

---

## From PHASE 17 — TESTING

### Phase 17.3 — Frontend Unit Tests

- [x] 🟠 Write test for `ProtectedRoute.jsx`: confirm no `console.log` calls in production build
- [x] 🟡 Write test for `AuthContext.jsx`: mock a 401 response and confirm token refresh is attempted before logout (after fix)

### Phase 17.2 — Backend Integration Tests

- [x] 🟡 Write integration test: full registration flow including email verification
- [x] 🟡 Write integration test: full treasury transaction with approval workflow

---

## From PHASE 18 — ENVIRONMENT AND DEPLOYMENT

### Phase 18.1 — Environment Variables

- [x] 🔴 Add `DB_CA_CERT` to `.env.example` — required for the SSL fix in `database.js`
- [x] 🟡 Add `CSRF_MAX_AGE` and `CSRF_COOKIE_NAME` to `.env.example`
- [x] 🟡 Add `AUTH_CACHE_SIZE` to `.env.example`

---

## From PHASE 1 (Second Pass — Dashboard Audit Edition, lines 1157+)

### Phase 1.2 — Authentication & Authorization Vulnerabilities

- [x] 🔴 backend/middleware/treasurySecurity.js — Replace MFA placeholder with real enforcement logic
- [x] 🔴 backend/middleware/treasurySecurity.js — Add if (!mfaVerified) return res.status(403).json({ error: 'MFA required' }) before passing to next()
- [x] 🔴 backend/middleware/treasurySecurity.js — Read MFA status from database, not from a flag in memory
- [x] 🔴 backend/middleware/treasurySecurity.js — Add audit log entry when MFA check is triggered
- [x] 🔴 backend/middleware/treasurySecurity.js — Test that treasury routes are actually blocked without MFA
- [x] 🔴 frontend/src/hooks/useDataFetch.js — Replace native fetch with the existing auth-api axios instance
- [x] 🔴 frontend/src/hooks/useDataFetch.js — Ensure auth token is automatically attached on every request
- [x] 🔴 frontend/src/hooks/useDataFetch.js — Ensure CSRF token is automatically attached on every request
- [x] 🔴 frontend/src/hooks/useDataFetch.js — Add 401 auto-logout handler
- [x] 🔴 frontend/src/hooks/useDataFetch.js — Add request/response error logging
- [x] 🔴 backend/middleware/csrf.js — Remove automatic Bearer token exemption that bypasses CSRF check
- [x] 🔴 backend/middleware/csrf.js — Validate that both Bearer token AND CSRF token are present for mutation endpoints
- [x] 🔴 backend/middleware/auth.js — Add church_id to the identity object returned by getIdentity()
- [x] 🔴 backend/middleware/auth.js — Implement Redis LRU cache for getIdentity() with 5-minute TTL
- [x] 🔴 backend/middleware/auth.js — Add cache invalidation when user role changes
- [x] 🔴 backend/middleware/auth.js — Add cache invalidation on logout
- [x] 🔴 frontend/src/components/common/ProtectedRoute.jsx — Add role-based enforcement (currently only checks authenticated)
- [x] 🔴 frontend/src/components/common/ProtectedComponent.jsx — Add role-based enforcement (currently only checks authenticated)
- [x] 🔴 frontend/src/router/dashboard.routes.jsx — Add roles property to every route definition
- [x] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /treasury/* routes in RoleGuard(['Treasurer', 'Super Admin'])
- [x] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /admin/* routes in RoleGuard(['Super Admin'])
- [x] 🔴 frontend/src/router/dashboard.routes.jsx — Wrap all /departments/* routes in RoleGuard(['Dept Head', 'Super Admin'])
- [x] 🔴 Create frontend/src/components/common/RoleGuard.jsx — Component that reads user role and redirects if unauthorized
- [x] 🔴 frontend/src/pages/treasury/TreasuryDashboard.jsx — Add role guard check at page level
- [x] 🔴 frontend/src/pages/treasury/Transactions.jsx — Add role guard check at page level
- [x] 🔴 frontend/src/pages/treasury/Budgets.jsx — Add role guard check at page level
- [x] 🔴 frontend/src/pages/treasury/Reports.jsx — Add role guard check at page level

---

## From PHASE 3 — Backend Config (lines 1295+)

### Phase 3.6 — `backend/config/passport.js`

- [x] 🟠 backend/config/passport.js — Add logger.info('Auth attempt for strategy: google') to Google strategy callback
- [x] 🟠 backend/config/passport.js — Add logger.error for failed auth attempts
- [x] 🟠 backend/config/passport.js — Create scrubProfile(profile) helper that removes raw tokens and sensitive fields before logging

---

## From PHASE 26 — BACKEND MODULE COMPLETENESS

### Phase 26.5 — MFA (Multi-Factor Authentication)

- [x] 🔴 backend/middleware/treasurySecurity.js — Implement real TOTP verification (use otplib library)
- [x] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/setup endpoint
- [x] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/verify endpoint
- [x] 🔴 backend/routes/auth.routes.js — Add POST /auth/mfa/disable endpoint
- [x] 🟠 backend/controllers/auth.controller.js — Add QR code generation for TOTP setup
- [x] 🟠 frontend/src/pages/profile/Profile.jsx — Add MFA setup flow with QR code display
- [x] 🟠 frontend/src/pages/auth/Login.jsx — Add TOTP code input step after password
- [x] 🟡 Add backup codes for MFA recovery (10 single-use codes)
- [x] 🟡 Store backup codes hashed in database

---

## From APPENDIX A — QUICK-WIN TASKS

- [x] 🔴 `auth.js` line 1: add `const { pool } = require('../config/database');`
- [x] 🔴 `auth.js` line 150: change `permissions[permission]` → `permissions.includes(permission)`
- [x] 🔴 `identityGuard.js` line 44: change `req.churchId` → `req.church_id`
- [x] 🔴 `passport.js` line 19: add optional chaining to `profile.emails?.[0]?.value`
- [x] 🟠 `IdentityService.js` line 144: move `require('speakeasy')` to top of file
- [x] 🟠 `ProtectedRoute.jsx` lines 10, 24, 37, 42: wrap console.logs in `import.meta.env.DEV &&`
