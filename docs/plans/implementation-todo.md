# Consolidated Implementation To-Do

Merges the open work from:
`security-efficiency-plan.md` · `webapp-leanness-plan.md` ·
`dead-code-verification.md` · `sda-departments-seed-plan.md` (remainder) ·
`FLUTTER_WEB_PARITY.md` (carryover)

Ordered so cheap/zero-risk items land first and deletions happen only after
the verification rules in `dead-code-verification.md`.

Status marks: `[ ]` open · `[x]` done · `[~]` partial

---

## Phase A — Security P0 (same-day, zero risk)

| # | Task | Source | Status |
|---|------|--------|--------|
| A1 | Purge tracked PII/credentials — `git rm --cached` `backend/users_export.txt`, `backend/cms_users_export.txt`, `backend/login-body.json`; delete `cookies.txt`; add all to `.gitignore`; rotate the admin password on prod | security §1 | [ ] |
| A2 | Delete `backend/utils/jwt.js` (dead file, insecure fallback secret) | security §2 | [ ] |
| A3 | Fail-fast env validation at boot: `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DB_PASSWORD`, `ENCRYPTION_KEY` — refuse to start with clear error | security §3 | [ ] |
| A4 | Redact `params` in `config/database.js` `queryWithLogging` error path (log count only) | security §4 | [ ] |
| A5 | `churchContext.js` — parameterize the `SET LOCAL` (or delete the middleware + document why it stays disabled in `app.js:196`) | security §5 | [ ] |
| A6 | `AnalyticsRepository.js:485` — 400 on unknown `metric`; allowlist `tableName` in base repos | security §6 | [ ] |
| A7 | `index.routes.js:65-66` — mount only the reset handler at `/auth/reset-password`, not the whole router | security §8 | [ ] |

**Gate:** `git ls-files backend/ | grep -E "export|login-body|cookies"` → empty; boot without `JWT_SECRET` fails fast.

## Phase B — Leanness Tier 0 (quick wins)

| # | Task | Source | Status |
|---|------|--------|--------|
| B1 | Compress `logo.png`/`favicon.png` (794KB → ~50KB); distinct favicon | lean §1 | [ ] |
| B2 | `sourcemap: false` in `vite.config.js` | lean §2 | [ ] |
| B3 | Untrack `frontend/dist*` (236 committed artifacts), ignore, align single output dir with `app.js` | lean §3 | [ ] |
| B4 | Delete or move `CMS Codebase/` — 13MB full project copy inside the repo (1,125 tracked files) | lean §Tier0-4 | [ ] |
| B5 | `vite.config.js`: drop `--force`, env-gate `usePolling` | lean §17 | [ ] |

## Phase C — Dead-code purge (verified lists in dead-code-verification.md)

Delete in batches; for each file grep its name once repo-wide and confirm only dead files reference it (the plan's caveat rule).

| # | Task | Files | Status |
|---|------|-------|--------|
| C1 | Frontend components: `components/sms/`(9), `chat/`(2), `ui/`(4), `security/`(3), `common/` orphans (15), `documents/`, `realtime/`, `pwa/`, `monitoring/`, `performance/`, `dynamic/`, `accessibility/`, `approvals/`, `dashboard/` orphans, `notifications/`, `reports/`, `search/`, `testing/`, `theme/`, `settings/` orphans, `ProtectedComponent`, `ai/AICondenseButton`, `mobile/MobileApp` | ~70 files | [ ] |
| C2 | Frontend stale pages: `pages/PublicHome`, `pages/Announcements`, `members/MembersList`+`MemberForm`, `dashboard/DashboardHome`, `auth/*` orphans (EmailVerification, MFASetup, ResetPassword, Sessions), `content/ContentManagement`, `gallery/*`(3), `router/auth.routes.jsx` | ~12 files | [ ] |
| C3 | A/B system: `Departments/Settings/Insights/Resources/Administration` wrappers + 10 `*Original`/`*Alternative` + `useFeatureFlag.js` + `featureFlags.js` | 17 files | [ ] |
| C4 | Dead contexts/hooks/config: `ContentContext`, `PaletteContext`, `TelegramContext`, `useFieldPermissions`, `spacingSystem`, `typographySystem`, `styles/palettes.js`, `utils/errorHandler.js`, `modules/shared/` (3) | 10 files | [ ] |
| C5 | Backend dead tree: 29 controllers, 28 repositories, 26 routes, 15 services, helpers/jobs/middleware/models/modules (`treasury.controller.js` 1,484 LOC, `TreasuryRepository` 943 LOC…) | 137 files | [ ] |
| C6 | Backend root strays → `backend/scripts/archive/` (45 one-off scripts — move, don't delete; some are manual tools) | 45 files | [ ] |
| C7 | **Rescue before deleting:** `middleware/pagination.js` → keep for D3. `utils/jwt.js` → delete regardless (A2) | 2 files | [ ] |
| C8 | Judgment calls: confirm telegram pages, SMS components, MFASetup aren't planned features before removing — else move to `docs/roadmap` note | — | [ ] |
| C9 | Frontend test/standalone dead files (12) — delete only if test runner unused | 12 files | [ ] |

**Gate:** `npm run build` succeeds; app boots; `dist-new` ~4.5MB→~2MB; no chunk >150KB raw except vendor-react.

## Phase D — Security P1/P2 + efficiency

| # | Task | Source | Status |
|---|------|--------|--------|
| D1 | Authz coverage audit — every route file documented with its `authenticateToken`/role guard; output checklist | security §8-task | [ ] |
| D2 | `invalidateUserCache()` at every role/permission mutation (leadership, handover, admin role routes) | security §7 | [ ] |
| D3 | Shared pagination — adopt rescued `middleware/pagination.js`; apply to members, users, departments, payments, notifications, audit-logs, sms-logs, gallery | security §10 | [ ] |
| D4 | Index audit — composite `(church_id, is_active)` + `(church_id, created_at)` on members, users, department_members, notifications, payments, events, sms_logs | security §12 | [ ] |
| D5 | Redis-backed identity cache + rate-limit store — **DEFERRED (verified)**: PM2 `ecosystem.config.cjs` runs `instances: 1` fork mode, so in-memory is correct. Rate limiter already auto-switches to RedisStore when `REDIS_URL` is set. **Revisit trigger**: changing `instances` >1 or `exec_mode: 'cluster'` — then `identityCache` in `middleware/auth.js` must move to `redisCache` too | security §11 | [x] deferred |
| D6 | Frontend deps — cypress removed (Playwright is the e2e framework), bogus `main` field fixed, `sw.js` NEVER_CACHE hardened + versioned; react-toastify kept (still used by payment/profile screens) | lean §12-16 | [x] |
| D7 | IDOR regression tests — 13-test suite in `tests/api/` (mpesa cross-church guards + callback CSRF fix found & fixed) | security §15 | [x] |
| D8 | `scripts/validate-audit-map.py` (497 refs checked), audit map refreshed, `security_audit.js` moved to `backend/scripts/` + wired into CI | security §14-15 | [x] |

## Phase E — Product carryover (dept-centric + parity)

| # | Task | Source | Status |
|---|------|--------|--------|
| E1 | Remittance ledger — mig 037, pending-funds/remittances/confirm/dispute endpoints, Flutter + web cards | dept plan §10 | [x] |
| E2 | Parser profiles → on-device parser — `applyRuleset` ported, cached offline, ruleset-first precedence in `parseDump` | dept plan §9 | [x] |
| E3 | Flutter subcommittee spend/budget view — collections rollup + tap-to-spend sheet; also fixed stale response shape + propose-budget field bug | parity P1 | [x] |
| E4 | Real-device regression pass on 1.6.0 paste-to-parse flow | release | [ ] |

## Done (reference)

- Departments/leadership/handovers seed + hierarchy (seed plan §1–8)
- Budget→obligation→milestone pipeline, obligations screens web+mobile
- Paste-to-parse collector flow + pesa-track parser port (v1.6.0)
- Gemini AI live; calibrate endpoint with PII-safe redaction
- Mobile-ready web app, PWA, branding pass

## Suggested execution order

A (all) → B → C1–C9 → D1–D4 → E1–E2 → D6–D8 → E3–E4 → D5 (only when scaling).
