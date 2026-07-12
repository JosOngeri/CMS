# Phase 4 — Route-Level Gaps: app.js, payments.routes.js, auth.routes.js
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

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
