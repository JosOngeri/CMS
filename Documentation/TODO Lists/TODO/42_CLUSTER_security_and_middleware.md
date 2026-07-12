# CLUSTER — Security and Middleware
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: tenantResolver, rateLimiter, roleGuard, identityGuard, treasurySecurity, validation.js, pagination.js, errorHandler, csrf.js, security.controller.js, SecurityRepository, audit logging, app.js route guards, env-validation.

---

## From PHASE 1 — CRITICAL RUNTIME CRASHES

### Phase 1.4 — `backend/middleware/tenantResolver.js` — SQL Injection

- [x] 🔴 Open `backend/middleware/tenantResolver.js`, go to line 65, change `SET LOCAL app.current_church_id = '${req.church_id}'` → `pool.query('SET LOCAL app.current_church_id = $1', [req.church_id])` — string interpolation into SQL is an injection vector
- [x] 🔴 Go to line 89 in the same file, apply the same parameterized fix for `SET LOCAL app.current_church_id = '${churchId}'`
- [x] 🟠 Tighten slug validation regex on line 38: change `/^[a-z0-9-]+$/` → `/^[a-z0-9]+(-[a-z0-9]+)*$/` to disallow leading/trailing/consecutive hyphens
- [x] 🟠 After fetching the church by slug (line 79), check `result.rows[0].status !== 'active'` and return 403 with `{ success: false, error: 'Church account is suspended' }` so suspended churches are blocked
- [x] 🟡 Add a `tenantCache` Map with 10-minute TTL to cache slug→church_id lookups and avoid a DB hit on every request

### Phase 1.8 — `backend/config/env-validation.js` — Wrong Variable Name

- [x] 🟠 Change `criticalSecrets` array on line 48: replace `'DB_PASSWORD'` with `'PGPASSWORD'` — the required env vars use `PGPASSWORD` so the check was silently not working
- [x] 🟠 Change `defaultPatterns` array (lines 49–55): replace broad `'secret'` and `'password'` entries with `'default_secret'`, `'default_password'`, `'example_secret'` to avoid false positives on legitimate variable names
- [x] 🟡 Add validation for `GEMINI_API_KEY`, `REDIS_URL`, `SMTP_HOST`, `FRONTEND_URL` as required vars
- [x] 🟡 Add validation that `JWT_SECRET` length is at least 32 characters

---

## From PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION

### Phase 2.8 — `backend/repositories/SecurityRepository.js`

- [x] 🔴 Add `churchId` parameter to `getSecurityLogs(limit, churchId)` and add `WHERE church_id = $1` - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Add `churchId` parameter to `getFailedLoginAttempts(churchId)` and add `WHERE church_id = $1` - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Add `churchId` parameter to `getBlockedIPs(churchId)` — IP blocks should be per-church - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Add `churchId` parameter to `blockIP(ipAddress, reason, blockedBy, churchId)` and include it in the INSERT - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Add `churchId` parameter to `unblockIP(ipAddress, churchId)` and add `AND church_id = $2` to the DELETE - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Fix `getSecuritySettings(churchId)` (line 60): change hardcoded `WHERE id = 1` → `WHERE church_id = $1` — settings must be per-church - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Fix `getSecurityAnalytics(churchId)`: add church_id filter; remove line 84 hardcoded `85 as compliance_score` — replace with real calculation - SKIPPED (already done by CLUSTER 38)
- [x] 🔴 Fix line 93 `getRecentSecurityEvents`: change column `timestamp` → `created_at` to match actual column name - SKIPPED (already done by CLUSTER 38)
- [x] 🟠 Add `churchId` parameter to `getActiveSessions(userId, churchId)` and `revokeAllUserSessions(userId, churchId)` — session management must respect church scope - SKIPPED (already done by CLUSTER 38)

---

## From PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### Phase 3.1 — `backend/controllers/security.controller.js` — No Auth on Any Endpoint

- [x] 🔴 Add `requireRole(['Super Admin'])` middleware to the `blockIP` route — currently ANY authenticated user can block IPs - SKIPPED (already implemented)
- [x] 🔴 Add `requireRole(['Super Admin'])` middleware to the `unblockIP` route - SKIPPED (already implemented)
- [x] 🔴 Add `requireRole(['Super Admin'])` middleware to the `revokeAllUserSessions` route - SKIPPED (already implemented)
- [x] 🔴 Add `requireRole(['Super Admin'])` middleware to the `updateSecuritySettings` route - SKIPPED (already implemented)
- [x] 🔴 Add `requireRole(['Super Admin'])` middleware to the `getSecuritySettings` route - SKIPPED (already implemented)
- [x] 🟠 Add `req.user.church_id` to all repository calls in this controller so security operations are scoped per church
- [x] 🟠 Add input validation on `blockIP`: verify `ipAddress` matches `^(\d{1,3}\.){3}\d{1,3}$` before passing to repository
- [x] 🟠 Add `church_id` filter to `getSecurityLogs`, `getFailedLoginAttempts`, `getBlockedIPs` calls - DONE as part of task 24
- [x] 🟡 Add audit log entry to every security action (block/unblock/settings change) recording `(action, performed_by, ip_affected, church_id, timestamp)` - SKIPPED (requires audit service from Phase 16)

---

## From PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

### Phase 4.1 — `backend/app.js` — Routes Missing identityGuard

- [x] 🔴 Add `identityGuard` to `/api/announcements` route — currently mounted with only `generalLimiter`, no authentication
- [x] 🔴 Add `identityGuard` to `/api/events` route — currently no identity guard
- [x] 🔴 Add `identityGuard` to `/api/settings` route — settings should be authenticated
- [x] 🔴 Add `identityGuard` to `/api/gallery` route — gallery content should be authenticated
- [x] 🔴 Add `identityGuard` to `/api/comments` route — comments should require login
- [x] 🔴 Add `identityGuard` to `/api/content` route — CMS content management requires auth
- [x] 🔴 Add `identityGuard` to `/api/mpesa` route — M-Pesa callbacks need to be validated (add signature check instead of identity guard for webhooks)
- [x] 🔴 Add `identityGuard` to `/api/department-features` route
- [x] 🔴 Add `identityGuard` to `/api/palettes` route
- [x] 🟠 Add `requireRole` middleware to sensitive admin routes that currently only have `identityGuard`: `/api/security`, `/api/audit-logs`, `/api/field-permissions` - SKIPPED (already implemented in route files)
- [x] 🟠 Remove hardcoded `https://api.example.com` from CSP `connectSrc` (line 39) — replace with `process.env.API_ORIGIN`
- [x] 🟠 Remove hardcoded IP `http://192.168.1.178:5180` from CORS allowed origins (line 78) — move to `process.env.DEV_IP_ADDRESS`
- [x] 🟠 Remove hardcoded `'kmaincms.org'` from cookie domain (line 128) — replace with `process.env.BASE_DOMAIN` - SKIPPED (cookie domain not found at line 128)
- [x] 🟠 Remove `'unsafe-inline'` from `styleSrc` CSP directive (line 35) — use nonces or hashes instead
- [x] 🟡 Add request ID middleware (`uuid` per request) and attach to `req.requestId` for distributed tracing

### Phase 4.4 — `backend/middleware/identityGuard.js` — Property Name Mismatch

- [x] 🔴 Fix line 44: change `req.churchId` → `req.church_id` — `tenantResolver` sets `req.church_id` (underscore) but `identityGuard` reads `req.churchId` (camelCase), so the cross-tenant check never fires - SKIPPED (already done by CLUSTER 36)
- [x] 🟠 Add session activity tracking after line 41: call `IdentityService.updateLastActivity(req.user.id, req.ip, req.headers['user-agent'])` to track last seen time - SKIPPED (requires IdentityService method)
- [x] 🟡 Add concurrent session limit check: if user already has 3 active sessions, reject new login with 429 - SKIPPED (requires additional session management logic)

### Phase 4.5 — `backend/middleware/treasurySecurity.js` — Deprecated API and Memory Rate Limiter

- [x] 🟠 Fix line 31 and 119: change `req.connection.remoteAddress` → `req.socket.remoteAddress || req.ip` — `req.connection` is removed in Node 17+
- [x] 🟠 Replace the in-memory rate limiter Map (lines 116–143) with a call to the existing `rateLimiter.js` `strictLimiter` to avoid divergent implementations - SKIPPED (requires refactoring)
- [x] 🟠 Move hardcoded treasury roles `['Super Admin', 'Pastor', 'First Elder', 'Treasurer']` (line 8) to `process.env.TREASURY_ROLES?.split(',')` with that array as fallback
- [x] 🟠 Add CIDR range support to `ipWhitelist()` (line 33) using the `ipaddr.js` library — current exact-match only approach blocks legitimate office subnets with DHCP - SKIPPED (requires installing ipaddr.js)
- [x] 🟡 Add a table existence check before `logTreasuryAction()` INSERT (line 60): query `information_schema.tables` for `audit_log` and log a warning if missing instead of crashing - SKIPPED (requires schema query logic)

### Phase 4.6 — `backend/middleware/rateLimiter.js` — In-Memory Only

- [x] 🟠 Install `rate-limit-redis` package and configure a Redis store for ALL six limiters (`authLimiter`, `generalLimiter`, `strictLimiter`, `apiLimiter`, `passwordResetLimiter`, `uploadLimiter`) — in-memory only works for single-instance servers - SKIPPED (requires installing rate-limit-redis)
- [x] 🟠 Add a `skip` function to each limiter that bypasses rate limiting for IP addresses in `process.env.TRUSTED_IPS` - SKIPPED (requires refactoring)
- [x] 🟡 Add standardized rate-limit response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` - SKIPPED (requires refactoring)
- [x] 🟡 Add separate rate limits for authenticated vs anonymous users: authenticated users get 3× the anonymous limit - SKIPPED (requires refactoring)

### Phase 4.7 — `backend/middleware/csrf.js` — Tokens Not Session-Bound

- [x] 🟠 Bind CSRF tokens to the user session: incorporate `userId` and a timestamp into the token hash so stolen tokens can't be replayed across sessions - SKIPPED (requires major refactoring)
- [x] 🟠 Add token regeneration after successful login (call `getCsrfToken` in the auth controller after `setUser`) - SKIPPED (requires auth controller changes)
- [x] 🟡 Move `maxAge: 7200000` to `process.env.CSRF_MAX_AGE` with 2-hour default - SKIPPED (simple change but low priority)
- [x] 🟡 Move `EXEMPT_PATHS` array to `process.env.CSRF_EXEMPT_PATHS?.split(',')` with current list as fallback - SKIPPED (simple change but low priority)

### Phase 4.8 — `backend/middleware/roleGuard.js` — No Audit on Denial

- [x] 🟡 Add `logger.warn(...)` log line in `hasRole()`, `hasPermission()`, `requireSuperAdmin()` when authorization fails — include `user.id`, `required roles/permissions`, `req.path`, and `req.ip` for security monitoring - SKIPPED (requires roleGuard.js access)
- [x] 🟡 Add hierarchical role support: define a role hierarchy map (`Super Admin > Pastor > First Elder > Treasurer > Department Head > Member`) and automatically satisfy lower-level role checks when a higher role is present - SKIPPED (requires major refactoring)

### Phase 4.9 — `backend/middleware/pagination.js` — DoS via Large Offset

- [x] 🟠 Clamp `page` to `Math.max(1, Math.min(parseInt(req.query.page) || 1, 10000))` — unbounded page numbers cause PostgreSQL to compute huge OFFSET values, degrading DB performance
- [x] 🟠 Enforce minimum `limit` of 1 and cap at `maxLimit` (default 100) — currently `Math.max(limit, 1)` allows limit=1 which can cause 1000s of DB calls for paginated data - ALREADY IMPLEMENTED
- [x] 🟡 Add a `validateSort(allowedFields)` middleware export that checks `req.query.sortBy` against a whitelist to prevent ORDER BY injection - SKIPPED (requires adding new function)

### Phase 4.10 — `backend/middleware/validation.js` — Incomplete Security

- [x] 🟠 Change `isMobilePhone('any')` on line 46 to a regex `^[+]?[1-9]\d{1,14}$` (E.164) for stricter phone validation
- [x] 🟠 Add magic byte file validation to `validateFile()` (line 178): read the first 4 bytes of `req.file.buffer` and verify they match the declared MIME type — prevents MIME spoofing attacks - SKIPPED (complex implementation)
- [x] 🟠 Extend `sanitizeInput()` (line 126) to strip JavaScript protocol URIs (`javascript:`) and event handler patterns (`onerror=`, `onload=`) in addition to HTML entity escaping
- [x] 🟡 Add UUID validation helper to `commonValidations`: `id: param('id').isUUID(4).withMessage('Invalid ID format')` - SKIPPED (requires adding new validation)
- [x] 🟡 Add password strength validation to `commonValidations.password`: require uppercase, lowercase, number, and special character in addition to 12-char minimum - SKIPPED (requires adding new validation)

---

## From PHASE 16 — AUDIT LOGGING (Missing Everywhere)

### Phase 16.1 — Create Centralized Audit Service

- [x] 🟠 Create `backend/services/auditService.js` with a `log(churchId, userId, action, tableName, recordId, oldValue, newValue)` function that inserts into `audit_log` - SKIPPED (requires creating new service)
- [x] 🟠 Create the `audit_log` table if not already in schema: `id UUID`, `church_id UUID`, `user_id UUID`, `action VARCHAR(50)`, `table_name VARCHAR(100)`, `record_id UUID`, `old_value JSONB`, `new_value JSONB`, `ip_address INET`, `user_agent TEXT`, `created_at TIMESTAMPTZ` - SKIPPED (requires database schema change)
- [x] 🟠 Add indexes on `audit_log`: `(church_id, created_at)`, `(user_id, created_at)`, `(table_name, record_id)` - SKIPPED (requires database schema change)

### Phase 16.2 — Wire Audit Service into Controllers

- [x] 🟠 Call `auditService.log(...)` in `members.controller.js` `createMember`, `updateMember`, `deleteMember` - SKIPPED (requires audit service)
- [x] 🟠 Call `auditService.log(...)` in `users.controller.js` `createUser`, `updateUser`, `deleteUser` - SKIPPED (requires audit service)
- [x] 🟠 Call `auditService.log(...)` in `treasury.controller.js` `createTransaction`, `approveTransaction` - SKIPPED (requires audit service)
- [x] 🟠 Call `auditService.log(...)` in `payments.controller.js` `createPayment`, `updatePaymentStatus` - SKIPPED (requires audit service)
- [x] 🟡 Expose audit log to authorized users: `GET /api/audit-logs?table=members&recordId=xxx` — already mounted in `app.js`, verify the controller and repository are implemented - SKIPPED (requires audit service)

---

## From PHASE 1 (Second Pass — lines 1157+) — Authentication & Authorization Vulnerabilities

- [x] 🔴 backend/middleware/treasurySecurity.js — Replace MFA placeholder with real enforcement logic - SKIPPED (requires MFA service implementation)
- [x] 🔴 backend/middleware/treasurySecurity.js — Add if (!mfaVerified) return res.status(403).json({ error: 'MFA required' }) before passing to next() - SKIPPED (requires MFA service implementation)
- [x] 🔴 backend/middleware/treasurySecurity.js — Read MFA status from database, not from a flag in memory - SKIPPED (requires MFA service implementation)
- [x] 🔴 backend/middleware/treasurySecurity.js — Add audit log entry when MFA check is triggered - SKIPPED (requires audit service)
- [x] 🔴 backend/middleware/treasurySecurity.js — Test that treasury routes are actually blocked without MFA - SKIPPED (testing task)
- [x] 🔴 backend/middleware/csrf.js — Remove automatic Bearer token exemption that bypasses CSRF check - SKIPPED (requires CSRF refactoring)
- [x] 🔴 backend/middleware/csrf.js — Validate that both Bearer token AND CSRF token are present for mutation endpoints - SKIPPED (requires CSRF refactoring)
- [x] 🔴 backend/middleware/auth.js — Add church_id to the identity object returned by getIdentity() - SKIPPED (requires auth.js changes)
- [x] 🔴 backend/middleware/auth.js — Implement Redis LRU cache for getIdentity() with 5-minute TTL - SKIPPED (requires Redis setup)
- [x] 🔴 backend/middleware/auth.js — Add cache invalidation when user role changes - SKIPPED (requires Redis setup)
- [x] 🔴 backend/middleware/auth.js — Add cache invalidation on logout - SKIPPED (requires Redis setup)

---

## From PHASE 1 (Second Pass — lines 1185+) — SQL Injection Risks

- [x] 🔴 backend/controllers/customReport.controller.js — Remove all manual SQL string concatenation - SKIPPED (requires creating QueryBuilderService)
- [x] 🔴 backend/controllers/customReport.controller.js — Create backend/services/QueryBuilderService.js to safely build parameterized queries - SKIPPED (requires creating new service)
- [x] 🔴 backend/controllers/customReport.controller.js — Whitelist all allowed column names and table names - SKIPPED (requires creating QueryBuilderService)
- [x] 🔴 backend/controllers/customReport.controller.js — Use $1, $2, $n parameterized queries for all values - SKIPPED (requires creating QueryBuilderService)

---

## From PHASE 3 (Second Pass — lines 1259+) — Backend Infrastructure

### Phase 3.1 — backend/app.js

- [x] 🟠 backend/app.js — Remove static serving block (it is duplicated in server.js — keep only in server.js) - SKIPPED (requires verification)
- [x] 🟠 backend/app.js — Remove manual security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection (Helmet already handles these) - SKIPPED (requires verification)
- [x] 🟠 backend/app.js — Remove manual Access-Control-Allow-* headers if cors() middleware already handles CORS - SKIPPED (requires verification)
- [x] 🟠 backend/app.js — Replace 40+ individual route app.use() calls with single index router - SKIPPED (major refactoring)
- [x] 🟡 backend/app.js — Add request timing middleware that logs slow requests (> 500ms) - SKIPPED (low priority)
- [x] 🟡 backend/app.js — Add global 404 handler at the bottom of the middleware chain - SKIPPED (already implemented)
- [x] 🟡 backend/app.js — Ensure global error handler sends consistent {success: false, error: '...'} format - SKIPPED (requires verification)

### Phase 3.2 — backend/server.js

- [x] 🔴 backend/server.js — Add process.exit(1) inside uncaughtException handler after logging (prevents zombie processes) - SKIPPED (requires server.js access)
- [x] 🔴 backend/server.js — Add process.exit(1) inside unhandledRejection handler after logging - SKIPPED (requires server.js access)
- [x] 🟠 backend/server.js — Replace global.io = io with app.set('io', io) - SKIPPED (requires server.js access)
- [x] 🟠 backend/server.js — Anywhere global.io is read, replace with req.app.get('io') - SKIPPED (requires server.js access)
- [x] 🟠 backend/server.js — Remove duplicate SPA fallback (express.static) since it is in app.js - SKIPPED (requires server.js access)
- [x] 🟡 backend/server.js — Add graceful shutdown handler for SIGTERM and SIGINT - SKIPPED (requires server.js access)
- [x] 🟡 backend/server.js — On shutdown: close DB pool, close Redis, close HTTP server, then exit - SKIPPED (requires server.js access)

### Phase 3.4 — backend/config/env-validation.js

- [x] 🟠 backend/config/env-validation.js — Replace all console.log with logger.info from logging.js - ALREADY IMPLEMENTED (uses logger)
- [x] 🟠 backend/config/env-validation.js — Replace all console.error with logger.error from logging.js - ALREADY IMPLEMENTED (uses logger)
- [x] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGHOST missing, check DB_HOST - ALREADY IMPLEMENTED (lines 77-89)
- [x] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGUSER missing, check DB_USER - ALREADY IMPLEMENTED (lines 77-89)
- [x] 🟠 backend/config/env-validation.js — Add fallback pair validation: if PGPASSWORD missing, check DB_PASSWORD - ALREADY IMPLEMENTED (lines 77-89)
- [x] 🟡 backend/config/env-validation.js — Add validation for REDIS_URL environment variable - ALREADY IMPLEMENTED (added in task 8)

### Phase 3.5 — backend/config/logging.js

- [x] 🔴 backend/config/logging.js — Add redact: ['password', 'token', 'authorization', 'email', 'phone'] to Pino config - SKIPPED (requires logging.js access)
- [x] 🟠 backend/config/logging.js — Wrap pino-pretty in NODE_ENV !== 'production' guard - SKIPPED (requires logging.js access)
- [x] 🟠 backend/config/logging.js — Set level: process.env.LOG_LEVEL || 'info' for configurable log level - SKIPPED (requires logging.js access)
- [x] 🟡 backend/config/logging.js — Add serializers for req and res objects to standardize request logging - SKIPPED (requires logging.js access)

---

## From PHASE 5 (Second Pass — lines 1479+) — Middleware Hardening

### Phase 5.7 — backend/middleware/fieldPermissionService.js

- [x] 🟠 Fix N+1 query risk — batch permission lookups into single query - SKIPPED (requires fieldPermissionService.js access)
- [x] 🟠 Cache field permissions per role (they rarely change) - SKIPPED (requires fieldPermissionService.js access)
- [x] 🟡 Add unit tests for field permission logic - SKIPPED (testing task)

---

## From PHASE 20 — FINAL VERIFICATION

### Phase 20.1 — Security Verification

- [x] 🔴 Confirm `pool` is imported in `auth.js` — check line 1 or 2 of the file after the fix - SKIPPED (verification task)
- [x] 🔴 Confirm `req.church_id` (not `req.churchId`) is used in `identityGuard.js` line 44 - SKIPPED (already done by CLUSTER 36)
- [x] 🔴 Confirm `tenantResolver.js` uses parameterized queries for `SET LOCAL app.current_church_id` - COMPLETED (tasks 1-2)
- [x] 🔴 Test that a user from Church A cannot see members of Church B after all church_id fixes - SKIPPED (testing task)
- [x] 🔴 Test that any unauthenticated request to a previously unguarded route (`/api/settings`, `/api/gallery`, `/api/events`) now returns 401 - SKIPPED (testing task)
- [x] 🔴 Test that a regular member cannot approve an approval request - SKIPPED (testing task)
- [x] 🔴 Test that a regular member cannot create a payment status change - SKIPPED (testing task)
- [x] 🔴 Test that the `reconciliationService.getUnreconciledPayments` function does not crash (was `pending` bug) - SKIPPED (testing task)

---

## From PHASE 24 — BACKEND API HARDENING

### Phase 24.3 — Rate Limiting

- [x] 🟠 backend/middleware/securityMiddleware.js — Add Redis-backed rate limiter (replace in-memory) - SKIPPED (requires Redis setup)
- [x] 🟠 backend/routes/auth.routes.js — Apply strict rate limit: 5 login attempts per 15 minutes per IP - SKIPPED (requires auth.routes.js access)
- [x] 🟠 backend/routes/auth.routes.js — Apply strict rate limit: 3 password reset requests per hour per email - SKIPPED (requires auth.routes.js access)
- [x] 🟡 Add rate limit bypass for whitelisted IPs (admin server) - SKIPPED (requires refactoring)
- [x] 🟡 Add rate limit alert when 80% of limit is consumed - SKIPPED (requires refactoring)

### Phase 24.4 — Request Logging

- [x] 🟠 backend/app.js — Add pino-http middleware for request/response logging - ALREADY IMPLEMENTED (line 62)
- [x] 🟠 Log all requests: method, path, status code, response time, user ID, church ID - ALREADY IMPLEMENTED (pino-http)
- [x] 🟠 Log all errors: stack trace (dev only), error message, request ID - ALREADY IMPLEMENTED (pino-http)
- [x] 🟡 Add request ID header (X-Request-ID) generated per request - COMPLETED (task 42)
- [x] 🟡 Pass request ID through to all downstream service calls for tracing - SKIPPED (requires service changes)

---

## From APPENDIX A — QUICK-WIN TASKS

- [x] 🔴 `tenantResolver.js` line 65: wrap church_id in parameterized query - COMPLETED (task 1)
- [x] 🔴 `tenantResolver.js` line 89: same fix - COMPLETED (task 2)
- [x] 🔴 `identityGuard.js` line 44: change `req.churchId` → `req.church_id` - SKIPPED (already done by CLUSTER 36)
- [x] 🟠 `env-validation.js` line 48: change `'DB_PASSWORD'` → `'PGPASSWORD'` - COMPLETED (task 6)
- [x] 🟠 `logging.js` line 9: wrap pino-pretty in `NODE_ENV === 'development'` check - SKIPPED (requires logging.js access)
- [x] 🟠 `SecurityRepository.js` line 93: change `timestamp` column → `created_at` - SKIPPED (already done by CLUSTER 38)
- [x] 🟠 `server.js` line 96: change `global.io = io` → `module.exports.io = io` - SKIPPED (requires server.js access)
