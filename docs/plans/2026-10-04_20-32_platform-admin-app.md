# 2026-10-04 20:32 EAT — Platform Admin Mobile App

## Goal

Give the Msabato platform owner a phone-native admin console: sign in as a
platform user, see fleet health and growth analytics, and perform the
day-to-day management actions (suspend/activate a church, watch stuck
payments, track incidents, audit activity, flip maintenance mode) without
opening the web console.

## Architecture decision

**A platform-admin mode inside the existing `flutter-mobile` app**, not a
second Flutter project. Rationale:

- One APK already ships to the phone; a second app doubles maintenance.
- The app already solves the hard parts this mode needs: dynamic server
  URL (`AppConfig.setCustomApiUrl` + `server_url_screen`), secure token
  storage (`flutter_secure_storage`), Dio client, theming.
- The two realms never mix: platform screens live under `/platform*`
  routes guarded by a separate `platformAuthProvider`; the church app
  keeps its own `authProvider`/token. Platform token is stored as
  `platform_token` in secure storage — a church session and a platform
  session can coexist.

## Auth contract

- `POST /api/platform/auth/login` `{email, password}` currently returns
  `{user}` + an httpOnly `platform_session` cookie. Mobile clients need
  the token in the body — backend change: include `token` in the success
  payload (additive; the web console keeps using the cookie).
- All platform calls go to `{baseUrl}/platform/*` with
  `Authorization: Bearer <token>`. Middleware already accepts Bearer.
- `GET /api/platform/auth/me` restores the session on app start.
- `POST /api/platform/auth/logout` revokes the server-side session.
- MFA: if `user.mfa_enabled`, the app shows an MFA code field on login
  (body `mfaToken`); if `mfa_setup_required`, show a blocking notice to
  complete setup on the web console (QR/secret flow stays web-only).

## Screens and endpoints

| Screen | Route | Endpoints | Purpose |
|---|---|---|---|
| Login | `/platform-login` | `POST /platform/auth/login` | Platform-only sign-in |
| Overview | `/platform` | `GET /stats`, `GET /health`, `GET /activity` | Churches count, MRR, users/members, health score, DB latency/uptime/memory, recent platform actions |
| Tenants | `/platform/tenants` | `GET /tenants` (search/status/paging), `POST /tenants/:id/suspend`, `POST /tenants/:id/activate` | Find a church, flip status |
| Tenant detail | `/platform/tenants/:id` | `GET /tenants/:id` (tenant + metrics), `GET /tenants/:id/stats`, `GET /tenants/:id/activity` | Per-church health and usage |
| Payments | `/platform/payments` | `GET /payments`, `GET /payments/stuck`, `POST /payments/:id/reconcile` | Cross-tenant payment feed + stuck >24h with manual reconcile |
| Incidents | `/platform/incidents` | `GET /incidents`, `POST /incidents`, `PATCH /incidents/:id` | Open/track/resolve incidents |
| Audit | `/platform/audit` | `GET /audit-logs`, `GET /audit-logs/actions` | Filterable audit trail |
| Analytics | `/platform/analytics` | `GET /analytics/growth`, `GET /analytics/usage`, `GET /analytics/adoption` | DAU/MAU, tenant growth, per-church usage + module adoption |
| Ops/Settings | `/platform/ops` | `GET/PUT /maintenance`, `GET /version`, `GET /deploys`, `GET /alerts` | Maintenance switch, deploy history, active alerts |

Shell: `PlatformShell` — AppBar + NavigationDrawer listing the sections,
wrapping a `ShellRoute` so every screen has a real URL.

## Analytics the admin tracks on prod

- Fleet: total/active/suspended churches, new this month, tier breakdown
- Money: total MRR, ARPC, payment feed volume, stuck payments count
- Engagement: DAU, MAU, active users, members across tenants
- Health: API/DB status, DB latency, uptime, memory, per-service rows
- Risk: open incidents, stuck payments, recent audit actions

## Tasks

| # | Task | Status | Verification |
|---|------|--------|--------------|
| 1 | Return `token` in `POST /platform/auth/login` body | FIXED | curl login → `data.token` present; Bearer → `GET /tenants` 200, `GET /stats` 403 for staff lacking `platform:read` |
| 2 | `platform_auth_service.dart` + `platformAuthProvider` (secure storage, restore, logout) | FIXED | `platform_token` in FlutterSecureStorage; sessionExpired() on 401 |
| 3 | `platform_api_service.dart` — Dio + Bearer + all endpoint methods | FIXED | `flutter analyze` clean; unwraps `{success,data,message}`; `PlatformApiException.code` carries MFA_REQUIRED |
| 4 | `PlatformLoginScreen` + entry link on church login screen | FIXED | MFA_REQUIRED surfaces the TOTP field; "Platform Admin sign-in" link on `/login` |
| 5 | `PlatformShell` (drawer nav) + router guard for `/platform*` | FIXED | `/platform*` → `/platform-login` when unauthenticated; title derives from route |
| 6 | Overview dashboard (stats + health + activity) | FIXED | stats grid + health banner + activity feed wired to `/stats`,`/health`,`/activity` |
| 7 | Tenants list + detail + suspend/activate | FIXED | search/status filter, confirm-dialog suspend/activate, detail renders metrics/stats |
| 8 | Payments feed + stuck tab + reconcile action | FIXED | two tabs; stuck rows offer mark completed/failed via `/payments/:id/reconcile` |
| 9 | Incidents list + create + status update | FIXED | open → investigating → monitoring → resolved transitions via PATCH |
| 10 | Audit log viewer w/ filters | FIXED | action/actor text filters → `/audit-logs` query params |
| 11 | Analytics screen (growth/usage/adoption) | FIXED | 3 tabs: DAU/MAU + signups, per-tenant usage, module adoption chips |
| 12 | Ops screen: maintenance toggle + version/deploys/alerts | FIXED | confirm-dialog toggle → `PUT /maintenance`; alerts + deploy lists |
| 13 | `flutter analyze` clean; release APK built + installed | FIXED | 0 errors on platform files; release APK installed to phone over wireless ADB |

Non-goals for this pass: platform staff management UI, impersonation,
billing invoice management, per-tenant settings editor (web console only).

## Security notes

- Platform token lives in `FlutterSecureStorage` (Keystore-backed), key
  `platform_token`, never in SharedPreferences.
- No permissions assumption client-side: server enforces
  `requirePlatformPermission` per endpoint; the app just surfaces 403s.
- Logout calls `/auth/logout` and wipes the stored token.
