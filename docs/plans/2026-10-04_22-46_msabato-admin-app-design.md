# 2026-10-04 22:46 EAT — Msabato Admin app: UX design + build plan

Status: **IMPLEMENTED** — built, tested, installed, and launched on the wireless Android device.

Supersedes the platform-mode-in-church-app approach from
`2026-10-04_20-32_platform-admin-app.md`: the admin app becomes its own
flavor that boots straight into the admin realm, with only admin surfaces.

---

## Part 0 — Why login failed on the phone (diagnosis, not guessing)

Probable causes, in order:

1. **Rate limiter.** Prod allows **5 platform-login attempts per 15 min per
   IP** (`platformAuthLimiter`). A few wrong-password tries or repeated
   retries → `{"error":"Too many platform login attempts…"}` for 15 minutes.
   Note: phone + this PC share the same public IP on this Wi-Fi, so probe
   traffic from either burns the same bucket.
2. **Wrong credentials / account missing on prod.** `admin@kmaincms.org`
   exists in the dev DB; prod may have a different password or no row.
3. **MFA.** If the account has `mfa_enabled`, the server answers
   `MFA_REQUIRED` → the app shows the 6-digit field. Easy to miss.
4. **Generic network error.** If you saw "Sign-in failed — check connection
   and server URL", the request never reached the server (unlikely — prod
   health is up).

**Plan for login (before anything else):**

| # | Fix | Status |
|---|-----|--------|
| 0.1 | Avoid blind retries; verify the web-console password works first — same credentials work in the app | FIXED |
| 0.2 | Surface the exact server message and rate-limit guidance; retain MFA-specific handling | FIXED |
| 0.3 | Add a server-reachability check using the public platform status endpoint | FIXED |

---

## Part 1 — Product shape: "Msabato Admin" is its own app

One codebase, two flavors (already scaffolded in `build.gradle.kts`):

| | Client app | Admin app |
|---|---|---|
| Label | **Msabato** | **Msabato Admin** |
| Package | `com.sdachurch.sda_church_mobile` | `com.sdachurch.sda_church_mobile.admin` |
| Boots to | `/login` (church) | `/platform-login` (admin realm) |
| Church screens | all | **unreachable** — admin build has no church routes |
| Platform link | none | n/a (it IS the app) |
| Build | `flutter build apk --flavor client` | `flutter build apk --flavor admin --dart-define=APP_MODE=admin` |

`APP_MODE` dart-define picks the entry: admin → a platform-only router
(`/platform-login` + the 8 admin screens); client → today's church app and
the "Platform Admin sign-in" link is hidden. Both install side-by-side on
your phone — admin app gets its own icon label (icon badge variant can
follow later).

---

## Part 2 — UX design from scratch

Goal: **the admin can read fleet health in 3 seconds and act on the top
issue in under a minute** — from a phone, one-handed.

### Design principles

- **Status-first glanceability.** The app opens to a traffic-light health
  banner, not a menu. Color is semantic everywhere: green healthy /
  amber degraded / red down — never decorative.
- **Every screen is a list you can pull-to-refresh.** No custom layouts to
  learn; muscle memory transfers between sections.
- **Attention items surface themselves.** Stuck payments and open
  incidents carry badge counts on the nav so problems find the admin,
  not the other way round.
- **Actions are bottom-sheet, confirmed, and explain consequences**
  ("Suspending blocks all members of this church").
- **Read-mostly by default.** Most admin time is monitoring; writes are
  deliberately 2 taps + confirm.

### Information architecture — bottom nav, 5 destinations

```
┌──────────────────────────────────────────────┐
│  Home      Tenants     Money     Alerts    Hub │
└──────────────────────────────────────────────┘
```

| Tab | Contains | KPIs shown | Actions |
|---|---|---|---|
| **Home** | Health banner (API/DB/overall, latency, uptime, memory) · KPI grid (active/total churches, MRR, ARPC, DAU/MAU, members, new this month, churn) · recent platform activity · attention strip | all top-level KPIs | jump to flagged sections |
| **Tenants** | Search + Active/Suspended/All filter chips · row = name, tier, status pill, member count | per-tenant members/users/payment volume on detail | suspend / activate / archive, actions sheet for flags/quotas/impersonate/reset-admin |
| **Money** | 3 tabs: Feed / Stuck (badge) / Billing (plans, subscriptions, invoices, revenue) | volume, counts, stuck age, MRR | reconcile → completed/failed, invoice status |
| **Alerts** | Unified attention feed: active alerts, open incidents, degraded services, stuck count | open count, severity | open incident, advance status, resolve |
| **Hub** | Directory grid of the remaining areas (below) + Server URL + Sign out | per-area | drill into each area |

### Coverage: all 13 web-console areas on the phone

The web console ships 13 function areas (`platformNav.js`). The app maps
every one — daily-driver areas get first-class tabs, the rest live under
Hub as dedicated screens:

| # | Web-console area | App destination | Endpoints | Phone treatment |
|---|---|---|---|---|
| 1 | Tenant Lifecycle (list, create, onboarding/trials) | **Tenants tab** + detail | `/tenants` CRUD | list/search/filter; create = web-only (form too long for phone — noted) |
| 2 | Tenant Administration (flags, quotas, impersonate, reset admin) | Tenant detail → **actions sheet** | `feature-flags`, `quotas`, `impersonate`, `reset-admin`, `users` | bottom-sheet actions, each confirmed |
| 3 | Platform Staff (admins, roles, sessions & MFA) | **Hub → Staff** | `/users`, `/auth/sessions` | list + revoke sessions; add/remove staff = owner-only, keep minimal |
| 4 | Monitoring & Health (monitoring, fleet, integrations, logs & alerts) | **Home banner + Hub → System Health** | `/health`, `/fleet`, `/integrations`, `/logs`, `/alerts` | banner summary + drill-in lists |
| 5 | Payments & Oversight (feed, failed/stuck, reconciliation) | **Money tab** | `/payments`, `/payments/stuck`, `/:id/reconcile` | feed + stuck badge + reconcile sheet |
| 6 | Security & Compliance (audit, security center, IP & sessions) | **Hub → Security** | `/audit-logs`, `/security/*` | searchable audit + session/IP lists |
| 7 | Data Management (backups, import, storage & schema) | **Hub → Data** | `/data/backups`, `/data/storage`, `/data/schema` | backup status + run trigger; restores = web-only (destructive) |
| 8 | Disaster & Incident (playbook, quarantine, forensics) | **Alerts tab** + Hub → Data (export) | `/incidents`, quarantine via suspend | create/advance/resolve + tenant quarantine button |
| 9 | Billing & Revenue (plans, subscriptions, invoices, dunning, revenue) | **Money → Billing tab** | `/billing/*` | plans/subscriptions/invoices lists, invoice status, revenue summary |
| 10 | Analytics & Reporting (growth, adoption, usage, benchmarks, exports) | **Hub → Analytics** | `/analytics/*` | growth/usage/adoption tabs (already built) |
| 11 | Communication (announcements, status page, templates) | **Hub → Comms** | `/announcements`, `/communication/templates` | post/edit platform announcement; templates view |
| 12 | Support Operations (tickets, access, known issues, health scores) | **Hub → Support** | `/support/*` | ticket inbox + reply; known-issues list; health scores |
| 13 | Platform Configuration (settings, flags, branding, maintenance, version) | **Hub → Config** | `/settings/catalog`, `/flags`, `/maintenance`, `/version`, `/deploys` | catalog edit (secrets masked), flag toggles, maintenance switch, deploys |

Two honest deferrals: **tenant create** and **backup restore** stay
web-console only — long forms and destructive restores don't belong on a
phone. Everything else is reachable.

### What the dashboard actually looks like

```
┌─────────────────────────────────────┐
│ ● HEALTHY   DB 12ms · up 41h · 380MB│  ← banner, colored
├───────────┬─────────────────────────┤
│ 4/4       │ KES 12.4K               │  ← 2×4 KPI grid
│ churches  │ MRR · ARPC 3.1K         │
├───────────┼─────────────────────────┤
│ 128       │ 340                     │
│ users     │ members                 │
├───────────┴─────────────────────────┤
│ ⚠ 3 stuck payments · 1 open incident│  ← attention strip, tap-through
├─────────────────────────────────────┤
│ Recent platform activity…           │
└─────────────────────────────────────┘
```

### KPI coverage matrix

| Need | Source endpoint | Where |
|---|---|---|
| Fleet size/health | `/stats` | Home grid |
| Money velocity | `/stats` MRR/ARPC + `/payments` | Home + Money header |
| Engagement | `/analytics/growth` DAU/MAU | Home grid + Hub |
| Infra health | `/health` (db latency, uptime, mem, services) | Home banner |
| Risk | `/payments/stuck`, `/incidents`, `/alerts` | Attention strip + Alerts tab |
| Per-tenant usage | `/analytics/usage`, `/analytics/adoption` | Tenant detail + Hub |
| Accountability | `/audit-logs` | Hub → Audit |

### Visual grammar

Semantic colors only (success/warning/error + admin amber accent — see
"Distinct look" below). Compact list rows: colored leading icon → bold
title → two-line meta (church, method, time, status). Status always a
colored pill, never bare text. Destructive/state-changing ops use a
confirm dialog or bottom sheet with the consequence spelled out.

### Deliberately web-only (two honest deferrals)

- **New tenant creation** — the onboarding form (church details, admin
  account, template, billing) doesn't compress to a phone form.
- **Backup restore / data destruction** — one-thumb mistakes are
  unrecoverable; staging-restore stays behind the web console.

Everything else across the 13 areas is reachable from the app.

## Distinct look — "Msabato Admin" should never be mistaken for the client app

- **Launcher**: separate package (`…sda_church_mobile.admin`) + label
  **"Msabato Admin"** + a **dark admin icon** — the admin flavor overlays
  `ic_launcher_background` (dark slate `#0F172A` vs the client's white) in
  `android/app/src/admin/res/values/colors.xml`, so the two icons read
  differently at a glance on the home screen.
- **In-app theme**: the client app is light + blue; the admin app gets an
  **"ops console" identity** — dark slate surfaces (`#0F172A/#1E293B`),
  amber accent (`#F59E0B`, reuses `secondaryColor` as the brand accent),
  cyan informational accents, and denser data rows. Implemented as
  `AppTheme.adminDarkTheme` selected when `APP_MODE=admin` — status
  colors (healthy/degraded/down) keep the same semantic mapping so red
  still means down.
- **Title bar**: `MaterialApp.title` reads `AppConfig.appName` →
  "Msabato Admin" via `--dart-define=APP_NAME="Msabato Admin"` — shows
  correctly in the Android task switcher.

---

## Part 3 — Build plan

| # | Phase | Deliverable | Verify |
|---|-------|-------------|--------|
| 0 | Login fix | exact error surfacing + reachability ping | wrong creds → "Invalid credentials"; rate-limit → clear wait message |
| 1 | Flavor split | `APP_MODE` entry switch, admin-only router, `.admin` package, `Msabato Admin` label, hide church-side admin link in client | two icons on phone; admin boots to platform login |
| 2 | Home | health banner + KPI grid + attention strip + activity | real numbers from prod |
| 3 | Tenants | list/detail/suspend+activate | suspend a test church → status flips |
| 4 | Money | feed + stuck tabs + reconcile sheet | stuck row → mark completed |
| 5 | Alerts | unified feed + incident create/advance | open + resolve an incident |
| 6 | Hub directory | grid listing remaining areas → screens: Staff, Security (audit+sessions), Data (backups/storage/schema), Billing, Analytics, Comms, Support, Config (catalog/flags/maintenance/version) | each screen loads real data |
| 7 | Distinct look | `AppTheme.adminDarkTheme`, admin icon overlay, APP_NAME/APP_MODE defines | admin icon + dark theme visible; client build untouched |
| 8 | Ship | `flutter analyze` clean, `app-admin-release.apk`, wireless install | app on phone, login works |

Already-built code that carries over: platform auth service, API
service, dashboard/tenants/payments/incidents/audit/analytics/ops
screens — this plan restructures the shell (drawer → bottom nav + Hub),
restyles to the admin theme, and adds the remaining 13-area screens.

## Implementation verification

- `dart analyze` on all changed admin files: **no issues**.
- `flutter test`: **8/8 tests passed**, including platform token isolation,
  restoration, and session expiry.
- Admin release: `app-admin-release.apk`, SHA-256
  `8ca5b5c4562031abdb6a25fd36b3b4737b9fd62a92bb2f22c561551cd486fc15`.
- APK metadata: package `com.sdachurch.sda_church_mobile.admin`, version
  `1.8.0` (build `17`).
- Wireless installation: **Success**; Android resolved and launched
  `com.sdachurch.sda_church_mobile.admin/com.sdachurch.sda_church_mobile.MainActivity`.
- Account credentials were not embedded, logged, or automated. Final owner
  login remains an interactive action for the account holder.
