# Security & Efficiency Assessment — KMainCMS (Msabato CMS)

Assessment date: 2026-09-29. All findings verified against current code.

## Verdict

The security **foundation is good** — helmet+CSP, tenant-aware CORS, CSRF middleware,
rate-limit tiers, bcrypt(12), HIBP breach check, TOTP MFA, request IDs, pino logging,
parameterized queries almost everywhere. The problems are **hygiene and coverage**:
secrets committed to git, a dead file with a fallback JWT secret, no env validation at
boot, and almost no pagination on list endpoints.

---

## Findings (with evidence)

### P0 — Critical / quick wins

1. **PII + credentials committed to git**
   - `backend/users_export.txt` — 2,326 lines: emails, phone numbers, roles, church
   - `backend/cms_users_export.txt` — 2,320 lines: same
   - `backend/login-body.json` — `{"email":"admin@sda.org","password":"admin123"}`
   - All three are git-tracked. If this repo is ever pushed, that's a data leak.
   - `backend/cookies.txt` also exists on disk (untracked) — session cookies.
   - **Fix:** delete + `git rm --cached`, add to `.gitignore`, rotate the admin password.

2. **Dead code with insecure JWT fallback** — `backend/utils/jwt.js` line 4:
   `JWT_SECRET || 'your-secret-key-change-in-production'`. File is unused (zero imports)
   but is an accident waiting to be re-wired. **Delete it.**

3. **No environment validation at startup** — `server.js` loads `.env` then boots.
   If `JWT_SECRET`/`REFRESH_TOKEN_SECRET`/`DB_PASSWORD` are missing, the app starts and
   only fails per-request. **Add a fail-fast env check in `server.js`/`app.js`.**

4. **Query error logging leaks secrets** — `config/database.js` line 36:
   `logger.error({ query: text, params, ... })` logs raw params — which can include
   passwords, tokens, phone numbers. **Redact param values (or log param count only).**

### P1 — Security hardening

5. **SQL interpolation in `middleware/churchContext.js`** (lines 18-27) —
   `SET LOCAL app.current_church_id = '${req.church_id}'`. Currently disabled in
   `app.js` line 196, but fix before re-enabling: use `pg`'s `set_config()` or validate
   the value is a UUID first.

6. **Unguarded lookup → malformed SQL** — `repositories/AnalyticsRepository.js:485`:
   `${metricMap[metric]}${churchFilter}` — unknown metric produces `undefined` in the
   query (crash, not injection, since the map is fixed). **Throw 400 on unknown metric.**

7. **Role-change cache staleness** — `middleware/auth.js` caches identities 5 min.
   `invalidateUserCache()` exists but must be called **everywhere** roles/permissions
   change (new leadership/handover routes included). Audit all call sites.

8. **Double-mounted auth router** — `index.routes.js` lines 65-66 mount `authRoutes`
   at both `/auth` and `/auth/reset-password`. Works but confusing; the reset limiter
   covers all auth endpoints under that prefix. **Mount only the reset handler.**

9. **Prod-config checklist** — CORS allows all private IPs + any localhost **only in
   dev**, which is correct, so verify `NODE_ENV=production` is set in prod; also confirm
   `app.set('trust proxy', 1)` matches your actual proxy (required for rate limiting
   by real IP).

### P1/P2 — Efficiency

10. **Almost no pagination** — only ~12 `LIMIT`/`OFFSET` queries across all of
    `backend/routes/` (50+ files). `members.routes.js` has **zero**. For Kiserian Main
    (~1,500 members) every list endpoint returns the whole table.
    **Fix:** shared `paginate(query, {page, pageSize})` helper + apply to members,
    users, departments, payments, notifications, audit-logs, sms logs, gallery.

11. **In-memory identity cache** — fine for one process; `redis` + `rate-limit-redis`
    are already installed. **Move `identityCache` and rate-limit stores to Redis**
    before running more than one backend instance.

12. **Index audit needed** — `scripts/create-indexes.sql` exists; verify composite
    indexes on `(church_id, is_active)` and `(church_id, created_at)` for hot tables:
    members, users, department_members, notifications, payments, events, sms_logs.

13. **Frontend bundle** — routes already `lazy()`-load; run a bundle analysis for
    oversized deps (jspdf, autotable in main chunk?).

### P3 — Process

14. **Restore `GRANULAR_AUDIT_CLUSTERS.md`** — the audit-run skill points to
    `D:\VIbeCode\Msabato CMS\GRANULAR_AUDIT_CLUSTERS.md` which no longer exists.
    Regenerate it for KMainCMS so cluster audits work.
15. **Wire `npm run security-audit`** (`security_audit.js` exists) into CI/pre-push.
16. **Authorization regression tests** — cross-church IDOR tests: user from church A
    cannot read/write church B resources (departments, members, payments).

---

## Task list

| # | Task | Effort | Risk |
|---|------|--------|------|
| 1 | Purge tracked PII/credential files + .gitignore + rotate admin | XS | Low |
| 2 | Delete `utils/jwt.js` dead file | XS | Low |
| 3 | Env validation at boot (JWT_SECRET, REFRESH_TOKEN_SECRET, DB_PASSWORD, ENCRYPTION keys) | S | Low |
| 4 | Redact params in `queryWithLogging` error path | XS | Low |
| 5 | Parameterize `churchContext` SET LOCAL (or keep disabled + comment why) | XS | Low |
| 6 | Guard `AnalyticsRepository` metricMap + allowlist `this.tableName` in base repos | S | Low |
| 7 | Fix `/auth` double-mount | XS | Low |
| 8 | Authz coverage audit: verify every route file applies `authenticateToken`/role checks (checklist output) | M | Low |
| 9 | Wire `invalidateUserCache` at every role/permission mutation site | M | Med |
| 10 | Shared pagination helper + apply to top 8 list endpoints | M | Med |
| 11 | Index audit + add composite church_id indexes | S | Low |
| 12 | Redis-backed identity cache + rate-limit store | M | Med |
| 13 | Frontend bundle analysis + split heavy deps | S | Low |
| 14 | Regenerate audit cluster map; add security-audit to CI | M | Low |
| 15 | IDOR regression tests (cross-church access denied) | M | Low |

**Suggested order:** 1→4 first (same-day, zero-risk), then 8 (the audit that tells us
how big 9 needs to be), then 10→11 for efficiency, 12 when scaling beyond one process.

## Verification
- After P0: `git ls-files backend/ | grep -E "export|login-body|cookies"` → empty;
  boot with missing JWT_SECRET → fails fast with clear error.
- After pagination: `GET /api/members?page=1&pageSize=50` returns 50 + total count.
- After authz audit: every route file documented with its guard; IDOR tests pass.
