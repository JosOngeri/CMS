# Security Assessment — KMainCMS / Msabato

**Date:** 2026-09-30
**Scope:** backend (Express/PostgreSQL), frontend (React), config, dependencies, git-tracked secrets
**Method:** source review of auth, middleware, routes, repositories, multer configs; `npm audit`; git-tracked file sweep; import-graph reachability to distinguish live from dead code.

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

- No SQL injection in live code
- No command injection in live code
- No stored XSS sink in live code
- No path-traversal on uploads (server-generated filenames everywhere)
- No secrets in `.env` committed to git
- No unauthenticated state-changing routes
- No stack-trace or schema leakage in prod error responses
- No PII in log output (pino redact configured)
