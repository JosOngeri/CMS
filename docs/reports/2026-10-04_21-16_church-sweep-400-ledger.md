# Church-Side 400-Route Sweep — Final Ledger (2026-10-04 21:16)

Continuation of `2026-10-04_19-19_prod-alignment-sweep-ledger.md`. Scope: all
`/api/*` GET routes (excluding `/api/platform`) enumerated from `app._router.stack`
by `backend/scripts/churchSmokeSweep.js` — **400 routes**.

## Final state

| Env | Result |
|---|---|
| dev | `SWEEP PASSED: 400 routes, no 5xx` (1 SKIP: mpesa creds) |
| prod | `SWEEP PASSED: 400 routes, no 5xx` (1 SKIP: mpesa creds) |

## This session's fixes

| # | Item | Status | Root cause | Fix |
|---|------|--------|-----------|-----|
| 1 | `/api/departments/:departmentId/resources` | FIXED | prod `department_resources` uses `name`/`type`; code selected `title`/`file_type`/`file_size` | migration `093` adds the three columns + backfills from `name`/`type` |
| 2 | `/api/treasury/dashboard/summary` | FIXED | prod `pledges` has `pledge_amount`, code summed `amount` | migration `093` adds `amount` + backfills from `pledge_amount` |
| 3 | `/api/mpesa/status/:checkoutRequestId` | FIXED (reclassified) | unhandled Daraja failures → 500. Not schema drift — external provider | `MpesaService.isConfigured()` guard → 503 `MPESA_NOT_CONFIGURED`; OAuth failure → `MPESA_AUTH_FAILED` → 503; upstream 400/404 → 404; other upstream → 502. Sweep skips 503s carrying a `"code":"MPESA_*"` marker |
| 4 | migration `092` in-place edit | PROCESS FIX | runner tracks `schema_migrations` by filename — editing an applied file silently does nothing on prod | delta reshipped as `093`; rule: **never edit an applied migration, always add a new file** |

## Deploys this session

| Commit | Content | Deploy |
|---|---|---|
| `f7ecfc1` | 092 in-place delta (no-op on prod — runner skipped it) | ✅ but ineffective |
| `5430b5d` | `093_pledges_resources_alignment.sql` as new file | ✅ run `37222890020` |
| `0834044` | mpesa 503/404/502 + sweep skip class | ✅ run `37223560361` |

## Prod verification

```
SKIP 503 /api/mpesa/status/:checkoutRequestId (external provider not configured)
SKIPPED (uncounted): 1 routes need unconfigured external providers
SWEEP PASSED: 400 routes, no 5xx
```

The mpesa SKIP is a truthful signal: prod lacks working Daraja credentials
(OAuth rejected) — the endpoint is down by configuration, not by code crash.
When real credentials land in prod `.env`, the endpoint will answer Daraja
results or a mapped 404/502 — any *new* crash still fails the sweep.

## Schema divergence record (dev vs prod)

| Table | dev | prod (pre-093) | Resolution |
|---|---|---|---|
| `pledges` | `amount` | `pledge_amount` | 093 adds `amount` + backfill |
| `department_resources` | `title`, `file_type`, `file_size` | `name`, `type` | 093 adds + backfill |
| `users` | `role`, `deleted_at` | neither | 090 + `to_jsonb` fallbacks |

## Open items

- Prod Daraja credentials (`MPESA_*`) — endpoint intentionally 503s until set.
- Full sweep progression this effort: 24 → 64 (unmasked) → 3 → 1 → **0 real failures**.

## Postscript — deploy workflow integration (bd65558 → 118e056)

- `churchSmokeSweep.js` wired into `deploy-vps.yml` post-deploy (runs on VPS, localhost).
- `churchMutationSweep.js` created: **420/420 POST/PUT/PATCH/DELETE on dev, no 5xx** (1 SKIP: unconfigured M-Pesa).
- Centralized error-contract fixes: `sendError` string handling, AsyncLocalStorage PG client-error correlation (`pgClientError.js` + `pool.query`/`connect` wrappers + `standardResponse` downgrade), palette `json_object_agg` FILTER, Telegram Bot-API constructor fixes, `getDelta` scope map, input guards on iterable body fields.
- First workflow run "failed" — diagnosed as a **concurrent-deploy race**: a second push's `pm2 restart` SIGINT'd the app mid-sweep (PM2 log 00:54:36). The follow-on deploy's sweep passed 400/400 on prod.
- Fix: `concurrency: deploy-vps` serializes runs + one-retry wrapper on the sweep step (`118e056`). Final run `37241966046`: platform 64/64 + church 400/400 green.

## Postscript 2 — manual sweep workflow, jest unification, prod mutation baseline (2026-10-05)

| Item | Commit | Result |
|---|---|---|
| Tenant-flag rollout | `24637da` | 12 flags in `constants/tenantFlags.js`; `requireTenantFlag` on all flagged mounts; instant invalidation on flag writes; nav gating web+Flutter |
| Jest unification | `d654ae2` | Root `jest.config.js` wraps `tests/jest.config.js`; divergent package.json block removed; uuid mock returns real UUIDs. 14 parse-failed suites → **341 tests pass** |
| ai/condense contract | `59a0c5e` | `content` guard → 400; Gemini upstream 5xx → marked `502 AI_UPSTREAM_5XX`; sweep skips `_UPSTREAM_` like `_NOT_CONFIGURED` |
| Stale tests | `f34be82` | hybridSMS churchSettings mock; e2e 400-suppressed + 403 contract updates. 53/53 pass |
| Prod mutation sweep | run `37278727347` | **420/420, no 5xx** after ai fix |

### Prod mutation sweep side-effects — found and remediated

Running `workflow_dispatch` sweep on prod wrote real junk (2 runs × `{}` bodies that slipped validation):

- `POST /api/settings/reset` → **deleted all 16 church-scoped settings overrides** for Kiserian. `settings_audit_log` was empty (no recovery data) — restored by copying an identical-seed church's 16 rows (verified SAME across all tenants).
- Junk rows inserted (all-null fields): 3 members, 3 transactions, 3 color_palettes, 3 mobile_devices, 3 backup_logs — **deleted by id, verified clean**.
- `POST /api/auth/mfa/*`, `auth/logout`, `DELETE /auth/sessions`, `forgot-password`, `mark-all-read` etc. touched the sweep user's own account — accounted for, no lasting damage (mfa_enabled was already false).

### Remediation shipped

- `churchMutationSweep.js`: **NO_PROBE denylist** (21 routes that mutate regardless of body) + doc warning that prod runs leave residue.
- Validation guards → 400: `POST /members` (names), `POST /treasury/transactions` (type+amount), `POST /palettes` (name), `POST /mobile/devices/register` (deviceId+platform).
- `sms_notifications` manifest default `'false'→'true'`: no prod church had an explicit row, so hybridSMS suppressed **every** send system-wide while `sms_enabled` (platform kill switch) and the seeded `notifications.sms_enabled='true'` both intended ON.

### Lessons

1. The mutation sweep's JUNK-OK list is a **write-manifest** — every 2xx there is a candidate real write on prod.
2. `settings/reset` for a church = `DELETE FROM settings WHERE church_id=?` — destructive endpoints deserve the NO_PROBE list, and ideally an `audit` entry so deletions are recoverable.
3. Manifest defaults matter: a `'false'` default on a scope='both' key silently disables the feature for every tenant that never toggled it.
