# Phase 4 — Route-Level Gaps: Middleware and Security
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

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
