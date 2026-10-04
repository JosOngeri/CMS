# 2026-10-04 19:19 EAT — Prod Alignment + Platform UI Sweep Ledger

**Scope:** "make sure all elements of UI in platform admin work" — every platform-console nav link, page, API call, and mutation verified against registered routes, then live-smoked against **both** dev (localhost:5000) and **prod** (cms.josongeri.co.ke) with minted tokens. Plus the prod escalation flow test and the deploy breakage from migration 088.

## Status values

| Status | Meaning |
|---|---|
| `FIXED` | Fix implemented **and verified** (live request or test evidence recorded) |
| `VERIFIED` | Check passed; no fix needed |
| `OPEN` | Known issue not yet fixed |

---

## A. Platform-console UI sweep

| Check | Status | Evidence |
|---|---|---|
| All 19 nav paths → registered routes | VERIFIED | `platformNav.js` paths all resolve in `PlatformShell.jsx` / `public.routes.jsx` (`/status` is a public route) |
| All GET calls → working endpoints | VERIFIED | 62/62 return 200 on dev **and** prod (after fixes below) |
| All 60 mutation calls → registered route+method | VERIFIED | every `api.post/put/patch/delete` in `pages/platform/` maps to a registered `platform.routes.js` entry |
| Response shapes match page destructures | VERIFIED | spot-checked stats/fleet/payments/security/billing/audit-logs — `{tenants,pagination}`, arrays, `{logs,pagination}` all consumed correctly |

## B. Bugs found by the sweeps (all prod-verified FIXED)

| # | File | Status | Finding | Fix / Verification |
|---|---|---|---|---|
| 1 | `backend/repositories/ChurchRepository.js` | FIXED | `getTenantActivity` selected `users.name` — column never existed; `/platform/tenants/:id/activity` 500'd | `first_name + ' ' + last_name`. Verified: prod GET → 200. Commit `a646045` |
| 2 | `backend/migrations/088_sweep_schema_alignment.sql` §1 | FIXED | `UPDATE personal_collections SET purpose=COALESCE(category,…)` — prod's table was created with `purpose`/`fund` and **never had `category`** → migration aborted, deploy failed | Backfill wrapped in `DO $$ IF EXISTS column` guard. Verified: file re-applies clean on dev; prod deploy green. Commit `3725b56` |
| 3 | `backend/migrations/088_sweep_schema_alignment.sql` §3 | FIXED | `ALTER TABLE sms_providers` — table doesn't exist on prod at all (prod has `sms_organizations`, a different concept) | `CREATE TABLE IF NOT EXISTS sms_providers` (dev-matching schema, empty — credential store). Verified: prod deploy green, all other 088 refs cross-checked against prod `information_schema`. Commit `245edc9` |
| 4 | `backend/helpers/approvalResolver.js` | FIXED | `u.role = ANY(...)` / `u.role = $2` — prod `users` has **no `role` column** (roles live in `user_roles`) → `POST /approvals` 500'd on prod, blocking the whole approval-request flow | `to_jsonb(u)->>'role'` reads the column when present, NULLs when absent — one path, both schemas. Verified: prod POST /approvals → 201. Commit `f2fc3c5` |
| 5 | `backend/controllers/platformTenancy.controller.js` | FIXED | `getTenantUsers` + `getTenantSessions` selected `u.role`/`u.deleted_at` — both missing on prod → `/tenants/:id/users` and `/sessions` 500'd | `role` now `COALESCE(to_jsonb(u)->>'role', user_roles fallback)`; `deleted_at` added to prod via 090. Verified: prod GETs → 200. Commits `f2fc3c5`, `be31379` |
| 6 | prod schema | FIXED | `users.deleted_at` missing on prod → `getFleet`, `getSecurityCenter`, `getGrowthMetrics`, `getUsageReport` all 500'd | Migration `090_prod_schema_alignment.sql`: `ADD COLUMN deleted_at` + partial index. Verified: all four endpoints 200 on prod. Commit `be31379` |
| 7 | prod schema | FIXED | `refunds` table missing on prod → platform Payments > Refunds tab 500'd | `CREATE TABLE refunds` (payment_id/user FKs, church-scoped). Verified: `/payments/refunds` → 200 on prod. Commit `be31379` |

## C. Escalation flow — prod end-to-end test

| Step | Result |
|---|---|
| Elizabeth Mboya (Dept Head, Treasury) creates dept-budget request naming Kennedy Mbatia (Dept Head, Deacons) as approver | `POST /api/approvals` → **201** |
| Kennedy escalates via `PUT /approvals/:id/delegate {delegate_role:'First Elder'}` | **200** "Request delegated successfully" |
| Request state after escalation | stays `pending`, `approver_id` → `b1c52777` (Church Elder, first First Elder by created_at) |
| Notification | row landed for `b1c52777`: "Approval escalated to you" |
| Cleanup | test approval + notification rows deleted |

**Boundary checks observed en route (all correct):** Member → POST /approvals → 403 (not in `APPROVAL_READ_ROLES`); missing approver → 400 "Select whose approval is needed"; `u.role` failure → fixed above.

## D. Deploy-chain fixes today

| Commit | What |
|---|---|
| `a646045` | tenant activity 500 fix |
| `3725b56` | 088 `category` backfill guard |
| `245edc9` | 088 `sms_providers` create |
| `f2fc3c5` | `users.role` dual-schema fixes |
| `be31379` | migration 090: `deleted_at` + `refunds` |

Final prod state: `/api/health` healthy; `/api/platform/status` → API, Database, Tenant access, **External probe** all `operational`.

## E. Pattern worth remembering

Every prod-only failure was **schema drift**: a column/table dev has that prod never got. Two detectors now exist — (a) the 62-endpoint smoke script (mint token server-side, loop GETs, flag non-200s), (b) prod `pm2 logs` error stacks pointing at the exact file:line. `to_jsonb(u)->>'col'` is the repeatable pattern for "column exists on some DBs, not others".

## Still open

| Item | Status | Note |
|---|---|---|
| Mutation endpoints with side effects (suspend, purge, emails, offboard) | OPEN | verified at route-registration level only — not fired on prod |
| `platform_health.last_check` → TIMESTAMPTZ | OPEN | DB-side `EXTRACT` math works around it; the column is still naive-timestamp |
| Flutter `delegateRequest(id)` with no role | OPEN | deployed backend requires approver naming; the no-arg call relies on backend default-resolution code that is still uncommitted locally |
