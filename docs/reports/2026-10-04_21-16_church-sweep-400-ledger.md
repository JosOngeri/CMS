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
