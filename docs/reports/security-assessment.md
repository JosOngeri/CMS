# Security Assessment — KMainCMS / Msabato

**Date:** 2026-09-30 — **Addendum:** 2026-10-02/03 deep line-by-line audit (see § "Deep-audit addendum")
**Scope:** backend (Express/PostgreSQL), frontend (React), mobile (Flutter), config, dependencies, git-tracked secrets
**Method:** source review of auth, middleware, routes, repositories, multer configs; `npm audit`; git-tracked file sweep; import-graph reachability to distinguish live from dead code. Addendum: full line-by-line audit of all backend/frontend/mobile source with route-mount verification.

---

## Verdict

The security foundation is **genuinely strong** — far better than the average vibecoded app.
Real findings cluster into a handful of categories: **one broken CSRF check**, **dependency
vulnerabilities needing `npm audit fix`**, **weak seeded passwords**, **a disabled RLS layer
that makes app-level tenant filtering the only IDOR defense**, and **known seed credentials
scattered across scripts**.

Nothing found is remotely exploitable today in the "hacker gets full DB" sense — but several
items are the kind that get flagged in a pentest or become real incidents later.

---

## What's already good (verified, not assumed)

- **bcrypt**, cost 12, for all password hashing (`helpers/security.js`, `models/User.js`)
- **JWT**: env-required secrets via `env-validation.js` + `platformJwt.js` (throws if missing);
  1h access tokens, 30d refresh tokens, separate secrets
- **Login hardening**: no user-enumeration ("Invalid credentials" for both cases), per-account
  lockout after 5 fails, 15-min lockout window (`auth.controller.js`)
- **Password policy**: length/upper/lower/digit/special + common-pattern + sequential +
  repeated-char rejection + **HaveIBeenPwned breach check** (`helpers/security.js`)
- **2FA/TOTP** via speakeasy with QR generation
- **HttpOnly + Secure + SameSite=Strict** JWT cookies (also accepts Bearer header for mobile)
- **helmet** with a tight CSP (`scriptSrc 'self'`, `objectSrc 'none'`, `frameSrc 'none'`),
  HSTS preload, frameguard deny, noSniff
- **Tenant-aware CORS** with subdomain validation + multi-part TLD handling (.co.ke etc.)
- **Tiered rate limits**: auth 20/15min, strict 50/15min, password-reset 10/hr, platform-login
  5/15min; Redis-backed store with in-memory fallback; IP normalization for `X-Forwarded-For`
- **Pino logger with PII redaction** — password/token/email/cookie paths stripped (`remove:true`)
- **Error handler** scrubs PG `detail/hint/schema/table/column/constraint` in prod; stack
  traces only in dev; sanitized 409/400 messages for unique/FK/not-null violations
- **Parameterized SQL** everywhere in live code — the only template-literal interpolations
  are whitelisted column maps (`AnalyticsRepository.metricMap`) or class-constant table names
- **Multer**: memory-storage for CSV/JSON imports with 5MB cap; disk uploads use generated
  filenames (no original-name path traversal) + extension+MIME checks
- **`testing.controller.js`** `exec()` is env-gated (prod returns 403) — and it's dead code anyway
- **`churchContext.js` `set_config` calls are parameterized** (`$1`), no SQL string-building
- **27/27 mounted route modules** apply `authenticateToken`/`identityGuard`/`platformAuth`
- **`backend/.env` is gitignored, not tracked**

---

## Findings

### HIGH

#### H1. CSRF token is not bound to any session — check is decorative
`backend/middleware/csrf.js` issues a random 64-hex token from `GET /api/csrf-token` and
"validates" it with `token.length === 64`. There is no session binding, no signature, no
comparison to a stored value. **Any attacker can call `/api/csrf-token` themselves and get a
token that passes validation**, then include it in a forged request.

Why it hasn't bitten you yet: the JWT cookie is `SameSite=Strict`, so browsers won't send it
cross-site anyway, and Bearer-token clients are explicitly skipped — the CSRF middleware is
doing no real work today.

**Risk if fixed wrong later:** if anyone ever loosens the cookie SameSite or relies on this
check for something cookie-based, it silently provides zero protection.

**Fix:** bind the token to the session (double-submit cookie pattern, or store per-session
in Redis) and compare with a timing-safe check, or drop the middleware and document that
`SameSite=Strict` is the CSRF defense.

#### H2. Four HIGH dependency vulnerabilities — all fixable today
`npm audit` on `backend/`:

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `multer <=2.3.0` | HIGH | 5 separate DoS: crafted multipart field names, fd leak on abort, size-limit bypass via async filter race, oversized array index, orphaned disk writes | `npm audit fix` |
| `socket.io-parser 4.0.0–4.2.6` | HIGH | Zero-attachment memory exhaustion | `npm audit fix` |
| `engine.io 6.6.0–6.6.9` | HIGH | Protocol-revision mismatch DoS | `npm audit fix` |
| `ip-address <=10.7.0` | HIGH | SSRF/trust-boundary bypass (octal-vs-decimal octets, CIDR suppresses classification, IPv4-mapped/NAT64 misclassification, unbounded diagnostic length) | `npm audit fix` |
| `qs`, `express 4.22.2` | MODERATE | DoS via bracket-key comma parsing, `isBuffer` | `npm audit fix` |
| `dompurify` | MODERATE | two sanitize-bypass XSS advisories | `npm audit fix` |
| `body-parser` | MODERATE | invalid limit silently disables size enforcement | `npm audit fix` |

All have fixes — run `cd backend && npm audit fix`. The multer ones matter most: any
authenticated user can upload, and upload routes are the path of least resistance for DoS.

#### H3. Well-known seed passwords hard-coded in tracked scripts
Live credential strings committed to git:

| File | Password |
|---|---|
| `backend/scripts/seed-churches.js` | `right123` |
| `backend/scripts/seed-admin.js` | `right123` |
| `backend/scripts/seed-role-accounts.js` | `right123` |
| `backend/scripts/seed-comprehensive.js` | `password123` |
| `backend/scripts/generate-comprehensive-seed.js` | `password123` |
| `backend/scripts/reset-admin-password.js` | `admin123` |
| `backend/scripts/reset-nonmember-passwords.js` | `right123` |
| `backend/scripts/generate-login-doc.js` | writes `right123` into a login doc |

Anyone with repo access knows the default admin creds of every seeded environment.
If any of these were ever seeded into a reachable deployment, rotate them.

**Fix:** require seed passwords via env (`SEED_ADMIN_PASSWORD`), fail loudly if unset,
never commit a literal.

### MEDIUM

#### M1. Tenant isolation has exactly one layer — `churchContext`/RLS is disabled
`app.js` line 195-196: `churchContext` (which sets `app.current_church_id` for Postgres RLS)
is **commented out** — "disabled for single-tenant deployment". The RLS policy file exists
(`database/migrations/enable_rls_policies.sql`) but the session var is never set, so even if
the policies were applied they'd see nothing.

Today every cross-church leak depends on every repository query remembering
`WHERE church_id = $N`. Members/payments do this correctly (verified). But the codebase is
large enough that a single forgotten scope is a data leak — e.g. a JOIN or report that
omits the filter.

**Fix:** either re-enable `churchContext` + apply RLS so the DB enforces it, or add a
tenant-scoping test suite that fails if a new query path misses `church_id`.

#### M2. `req.params.id` flows into a `Content-Disposition` filename
`routes/reports.routes.js:65`:
`res.setHeader('Content-Disposition', \`attachment; filename=report_${req.params.id}.json\`)`.
Express validates header values and rejects CRLF, so it's not a classic header injection,
but it leaks the raw param into a header — sanitize to `[a-zA-Z0-9_-]` first.

#### M3. `users_export.txt` / `cms_users_export.txt` committed to git
~4,600 lines of real emails/phone/roles tracked in the repo (flagged in the earlier plan,
still present). If this repo is ever pushed to a remote or shared, that's a PII breach.

**Fix:** `git rm --cached`, add to `.gitignore`, rotate anything sensitive in them.

#### M4. `login-body.json` + generated login doc contain plaintext creds
`login-body.json` has `admin123`; `generate-login-doc.js` writes `right123` next to every
user's email into a markdown file. Rotate `admin123` on every environment where it was
used.

#### M5. Two duplicate auth systems partially mounted
Both `routes/departments.routes.js`/`payment.routes.js` AND `routes/department.routes.js`/
`payment.routes.js` (singular) are mounted, plus `departments.routes.js` is mounted twice
at `/departments` (line 70 then again at 71/72/73 for community/leadership/finance).
Not a vuln itself, but duplicated surface means a fix to one route file may not apply to
the duplicate — drift creates auth gaps over time.

### LOW

#### L1. Dead `utils/jwt.js` keeps a fallback secret in the file
`JWT_SECRET || 'your-secret-key-change-in-production'` — confirmed unreachable by the
dead-code scan, but it's a loaded trap: any future `require('../utils/jwt')` silently
works with a weak secret. Delete the file (it's already on the dead-code purge list).

#### L2. Identity cache is in-process LRU
`middleware/auth.js` caches identity per-node-process. Role/permission changes won't
propagate to other instances for up to 5 min, and `invalidateUserCache` only clears the
local process. Fine at single-node scale; needs Redis when you scale out (Redis is
installed and already used for rate limiting — just not for identity).

#### L3. `RichTextEditor.jsx` sets `innerHTML` from props — un-sanitized
`frontend/src/components/common/RichTextEditor.jsx:35`. If this file is ever used with
user content it's stored-XSS. It's dead code today — delete or wire `dompurify` (which
you already have) before enabling.

#### L4. `authenticateToken` returns 403 for missing token, not 401
Semantic issue — a missing token is `401 Unauthorized`, an invalid one is `403 Forbidden`
is inverted vs convention. Harmless but will confuse any auth-scanning tooling.

#### L5. `optionalAuth` swallows all errors silently
Fine for the use case, but makes it impossible to distinguish "no token" from "expired
token" in downstream logs — add a debug log so auth failures are diagnosable.

---

## Attack-surface notes (things that are safe but worth knowing)

- **Spawning** (`telegramChurch.controller.js`, `telegramClient.service.js`) uses
  `spawn(cmd, [args])` with arg arrays — no shell injection.
- **`exec()`** only appears in `testing.controller.js` (prod-gated, dead) and
  `killPort.js` (dev utility).
- **No `eval()`, no `new Function`, no `dangerouslySetInnerHTML`** in live frontend code.
- **PWA service worker** (`sw.js`) has a `NEVER_CACHE` guard for auth endpoints — verified.
- **M-Pesa webhook** is correctly excluded from CSRF (Daraja sends no cookie) — verify
  signature validation exists on that endpoint as its only auth check.

---

## Recommended order of work

| # | Action | Effort | Why first |
|---|---|---|---|
| 1 | `cd backend && npm audit fix` | 5 min | 4 high-severity deps, all have fixes |
| 2 | Fix `csrf.js` — bind token to session or remove + document `SameSite=Strict` | 30 min | currently provides false confidence |
| 3 | Move all seed passwords to env vars; rotate `right123`/`admin123`/`password123` on deployed envs | 1h | committed creds are live until rotated |
| 4 | `git rm --cached` the `users_export.txt` files; verify git history if repo ever leaves this machine | 15 min | PII exposure |
| 5 | Decide on RLS: re-enable `churchContext` + apply `enable_rls_policies.sql`, or write tenant-scope tests | 2-4h | only layer of tenant isolation today |
| 6 | Delete `utils/jwt.js` (dead + fallback secret) and `RichTextEditor.jsx` (dead + XSS sink) | 5 min | removes future foot-guns |
| 7 | Sanitize `Content-Disposition` filename in `reports.routes.js` | 5 min | hygiene |
| 8 | Consolidate duplicate `departments`/`payment` route mounts | 1h | drift risk |

---

## What was NOT found (good news)

- No command injection in live code
- No stored XSS sink in live code
- No path-traversal on uploads (server-generated filenames everywhere)
- No secrets in `.env` committed to git
- No stack-trace or schema leakage in prod error responses

~~- No SQL injection in live code~~ — **RETRACTED** by the deep audit: see D1–D4 below.
~~- No unauthenticated state-changing routes~~ — **RETRACTED**: see D5–D7 below.
~~- No PII in log output (pino redact configured)~~ — **RETRACTED**: see D8 below.

---

## Deep-audit addendum (2026-10-02/03) — full line-by-line review

The original assessment sampled high-risk surfaces. The follow-up audit read every
backend repository/controller/route/service, every frontend page/component, and the
Flutter service layer, verifying each suspected issue against its actual route mount.
Complete finding list with fix status lives in
`docs/reports/2026-10-02_22-49_line-by-line-ledger.md` — this section lists the
**security-relevant confirmations** that supersede or extend the findings above.

### CONFIRMED — SQL injection in live code (retracts "No SQL injection")

| # | Location | Detail |
|---|----------|--------|
| D1 | `repositories/TreasuryDashboardRepository.js` → `getIncomeExpenseTrend` | `INTERVAL '${days} days'` interpolates `days` straight into SQL; route mount verified live and reachable without elevated role. |
| D2 | `services/reportScheduler.js` | Stored report definitions are executed by cron — a poisoned report row becomes scheduled SQLi. |
| D3 | `repositories/SyncRepository.js` → `getDelta` | Interpolates table names into queries; reachable via sync controller. |
| D4 | `repositories/UserRepository.js` → `updateProfile` | Object keys interpolated into the SET clause — column-name injection if a controller passes `req.body` through (e.g. attacker sets `is_active`/`church_id`). |
| D4b | `services/auditService.js` | `values.slice(0, paramCount - 2)` off-by-one drops the last filter param → count query binds wrong args (correctness + weakens an audit control). |

### CONFIRMED — Broken authorization / tenant isolation (retracts "No unauthenticated state-changing routes")

| # | Location | Detail |
|---|----------|--------|
| D5 | `routes/events.routes.js` | Permission check `WHEN $2 = ANY($3)` compares literal `'Super Admin'` to a hardcoded array — **always true**: any authenticated user can edit/delete any event; no `church_id` anywhere in the file. |
| D6 | `helpers/websocket.js` (live in `server.js`) | WS accepts `?userId=` with **no authentication** — any client claims any userId; `broadcastActivity` sends to all clients regardless of church. |
| D7 | `controllers/announcements.controller.js` → `getPublicById` | Returns any announcement by ID with no auth, no church check, **no `is_published` check** — drafts/private posts readable. |
| D8 | `controllers/smsPush.controller.js` + mobile `push_sync_service.dart` | Mobile sends JWT as `?token=` **URL query param** (lands in access logs). Worse: `verifyToken` reads `decoded.churchId`, but `generateAccessToken` never embeds it → every socket has `churchId=undefined` → `broadcastToDepartmentMembers` matches `undefined === undefined` → **department updates broadcast to every connected client across all churches**. |
| D9 | Legacy treasury surface (`treasury.controller.js` + `treasury.routes.js`, still mounted at `/api/treasury`) | Approve/delete transactions, budgets, funds, accounts, pledges **by raw ID with no church scoping** — full cross-tenant IDOR on financial records. |
| D10 | `services/workflowEngine.js` + `services/documentApprovalService.js` | No church scoping; `processStep` never verifies the approver is the assigned approver — **anyone can approve any workflow step in any church**; `delegateApproval` passes `comment` into the `delegateToId` slot. |
| D11 | `services/treasurySMSIntegration.js`, `services/mpesa.js` | Treasurer lookup and `mpesa_%` settings load with **no church filter** → cross-tenant SMS/credential leakage. |
| D12 | `repositories/MembersRepository.js` (`createMember`, `createAlbum`, `createContribution`) | INSERTs omit `church_id` → NULL-tenant rows; `MobileRepository` uses `churchId \|\| 1` — silently forces data into church #1. |
| D13 | Auth/session | Deactivated users stay authenticated for the full token lifetime (no `is_active` re-check on verify); platform vs church JWTs share verification paths (audience confusion). |

### CONFIRMED — Secret/PII exposure in logs (retracts "No PII in log output")

| # | Location | Detail |
|---|----------|--------|
| D14 | `backend/logs/app.log*` | Request logger persists the full `cookie:` header — **live `jwt=` tokens are stored in plaintext log files** (verified present in `app.log.3`). Pino `redact` config does not cover `req.headers.cookie`. |
| D15 | `utils/errorHandler.js` | Logs `req.body` on errors — passwords land in logs on failed auth/register requests. |
| D16 | mobile `api_service.dart` | Debug `LogInterceptor` logs full request/response bodies; login response (incl. token) is `debugPrint`ed. |

### CONFIRMED — Mobile credential handling

| # | Location | Detail |
|---|----------|--------|
| D17 | `mobile/.../auth_service.dart` | Bearer token in plaintext `SharedPreferences` (secure-storage import commented out); no expiry check on restore. |
| D18 | `mobile/.../biometric_service.dart` | Stores the **raw user password** in `FlutterSecureStorage` for biometric re-login. |
| D19 | `mobile/.../config.dart` + `main.dart` | Saved `api_url` from SharedPreferences applied **unvalidated** — a tampered prefs value silently retargets all API traffic. |

### CONFIRMED — Frontend security-adjacent

| # | Location | Detail |
|---|----------|--------|
| D20 | `pages/auth/Login.jsx` | Demo-credentials box (`admin@sda.org/admin@123` etc.) rendered to every visitor — if any such account exists in production it's pre-solved credential stuffing. |
| D21 | `pages/departments/DepartmentsList.jsx` → `DepartmentDashboard.jsx` | `isAdmin: true` hardcoded in nav state; dashboard trusts `location.state.isAdmin` — every member sees admin tabs (client-side only, but exposes management UI flows). |
| D22 | `content.routes.js` | `/:id` registered before `/scheduled`, `/check-duplicate`, `/export`, `/import`, `/analytics` — those routes are shadowed; `/:id` + `/public/:slug` both hit unscoped `getContentBySlug`. |

### Correctness/security-control crashes

- `helpers/finance.js` — unterminated SQL string in `calculateBalanceSheet` (always errors).
- `repositories/SettingsRepository.js` — `getSettingsHistory` binds the key string to `LIMIT $1`.
- `modules/sms/pages/Dashboard.jsx` — `process.env.REACT_APP_API_URL` in a Vite app + `localStorage.getItem('token')` that nothing ever sets → page is dead (not a vuln, but its "fix" must not reintroduce token-in-localStorage).
- `pages/PhotoGalleryPage.jsx` — `setFilteredPhotos` ReferenceError crash (undefined state setter).

### CONFIRMED — Re-audit addendum (committed artifacts & packaging)

| # | Location | Detail |
|---|----------|--------|
| D23 | `backend/sessions/*` | **Live Telegram session files** (`telegram*.session` ×3), `phone_code_hash.json`, `auth_status_*.json` are **git-tracked** — confirmed via `git ls-files`. `sessions/` is in neither `.gitignore` nor `.dockerignore`, so `Dockerfile`'s `COPY . .` also bakes live sessions into every image. Revoke sessions → `git rm --cached` → add `sessions/` to both ignore files → consider history scrub if sessions remain valid. |
| D24 | `backend/logs/app.log.1-3` | Rotated logs containing full `jwt=` cookies (D14) are **git-tracked** — tokens persist in history even after redaction is fixed. `git rm --cached` needed. |
| D25 | `backend/cookies.txt`, `backend/login-body.json` | On disk (untracked — gitignore covers them) but **not excluded by `.dockerignore`** → baked into Docker images. `login-body.json` contains plaintext admin credentials. |
| D26 | `backend/migrate.js` | `DROP DATABASE IF EXISTS` runs unconditionally before re-creating — one-command total data loss; also produces a schema missing 49 of 50 migrations. Delete or gate behind explicit `--destroy` flag. |
| D27 | `backend/create-admin.js` / `create-department-users.js` | Hardcoded `Admin123` and predictable `${firstName}@123` passwords printed to console — dangerous if run against production DB. |

### Updated priority list (supersedes "Recommended order of work" for new items)

| # | Action | Severity |
|---|--------|----------|
| P1 | Parameterize `INTERVAL` in `getIncomeExpenseTrend`; whitelist table names in `getDelta`; whitelist columns in `updateProfile` | **Critical — live SQLi** |
| P2 | Sanitize/validate cron-executed report SQL in `reportScheduler` | **Critical** |
| P3 | Add `churchId` (or church_id lookup) to SMS-push `verifyToken`; move mobile WS auth to `handshake.auth` | **Critical — cross-tenant broadcast** |
| P4 | Scope the legacy `/api/treasury` surface or retire it in favour of `modules/treasury` | **Critical — financial IDOR** |
| P5 | Fix always-true events permission check; add `church_id` to events routes | High |
| P6 | Authenticate `helpers/websocket.js` `?userId=` handshake; scope `broadcastActivity` by church | High |
| P7 | Add `is_published` + church check to `getPublicById` | High |
| P8 | Verify assigned approver in `workflowEngine.processStep`; fix `delegateApproval` arg order | High |
| P9 | Redact `req.headers.cookie` + `req.body` secrets in pino/errorHandler; move mobile token to secure storage; stop storing raw password for biometric | High |
| P10 | Recheck `is_active` on token verification (or short token TTL + refresh denylist) | Medium |

### Deep-audit addendum 2 — secrets & deploy surface (2026-10-04)

| # | Finding | Evidence | Severity |
|---|---------|----------|----------|
| D23 | **Live M-Pesa Daraja credentials committed to git** | `database/add_mpesa_settings.sql` lines 11–19, 53–57: sandbox consumer key + consumer secret + passkey, plus a B2C consumer key/secret pair — five secrets in plaintext SQL. Same pair also in `backend/test-mpesa.js`. **Rotate all of them** — deletion alone is insufficient once pushed. | **Critical** |
| D24 | Telegram OTP + session material logged/persisted | `backend/scripts/auth-wrapper.js` writes `sessions/*.session` and logs OTP codes plaintext; `backend/sessions/` is git-tracked and ships in Docker images (B17). | **Critical** |
| D25 | Mass weak-credential tooling | `backend/scripts/reset-nonmember-passwords.js` sets every non-member account to shared `right123`; `generate-login-doc.js` writes `USER_LOGINS.md` documenting `right123` for all accounts; `create-admin.js` prints `Admin123`. | High |
| D26 | `docker-compose.microservices.yml` ships a literal `JWT_SECRET=your-secret-key-change-in-production` and `postgres`/`postgres` DB creds | Anyone deploying from this file gets forgeable tokens + known DB creds. | High |
| D27 | SMS provider `api_key` stored plaintext | `database/migrations/add_sms_providers.sql` — `api_key TEXT` column, no encryption. | Medium |
| D28 | iOS `Info.plist` missing all `UsageDescription` keys | Camera/biometric/photo-library calls crash on iOS; also an App Store rejection. Not exploitable but a shipped-device correctness hole. | Medium |
| D29 | Frontend Docker image never builds | `vite.config.js` outputs `dist-new/`; `frontend/Dockerfile` copies `/app/dist` — deploy pipeline broken (B21). | High (availability) |

**Revised top priorities**: rotate Daraja + Telegram session material (D23/D24) sits at the top of the queue alongside P1–P4 — committed live credentials outrank code bugs.
