# Plan: Role-Specific Dashboards in the Flutter App

Date: 2026-09-28
Status: IN PROGRESS — core implementation done, pending verification + build + install

## Problem

The Flutter app had **one dashboard with a two-way split**: members saw personal stats, and every privileged role (Super Admin, Pastor, Treasurer, Department Head, First Elder) saw the same generic church stats. The web app has 5 distinct role dashboards — the app must match.

## Design

Each role gets its own stat-card set on the Home tab, powered by the existing `/api/dashboard/*` endpoints (all verified live, all returning real data).

| Role | Cards | Endpoint(s) | Extra section |
|---|---|---|---|
| Member | My Contributions, My Departments, Upcoming Events, Unread Notices | `/mobile/dashboard` | — |
| Super Admin | Total Members, Departments, Financial Overview, Pending Approvals, System Health, Active Users | `/dashboard/stats` + `/dashboard/system-health` | — |
| Pastor / First Elder | Total Members, Member Engagement %, Spiritual Growth %, Dept Activity %, Upcoming Events, Pending Approvals | `/dashboard/ministry-health` | — |
| Treasurer | Total Balance, Income (Month), Expenses (Month), Pending Payments, Budget Used %, Collection Rate % | `/dashboard/financial-stats` + `/dashboard/financial-health` | Recent Transactions list (`/dashboard/transactions`) |
| Department Head | Dept Members, Pending Tasks, Dept Events, Dept Budget, Task Completion %, Participation | `/dashboard/department-stats` + `/dashboard/department-health` | — |

### Role resolution

`_primaryRole(user)` picks the highest-privilege role in precedence order:
`Super Admin > Treasurer > Pastor > Department Head > First Elder > Member`

A user with multiple roles (e.g. Pastor + Member) sees the higher-privilege dashboard. A small "`<Role> Dashboard`" label appears above the card grid for non-member roles.

### Card tap destinations

- Member/stat links reuse existing routes: `/payments`, `/departments`, `/events`, `/announcements`, `/members`, `/approvals`
- Percent/health cards without a natural list page → nearest sensible section (`/departments` for ministry/dept metrics, `/payments` for financial metrics) or non-tappable for pure status cards (System Health, Task Completion)

## Implementation steps

- [x] `_primaryRole()` — role precedence resolver
- [x] `_loadRoleData()` — per-role endpoint fetch (Super Admin / Pastor+Elder / Treasurer / Dept Head); failures degrade to base stats, never blank the screen
- [x] `_cardsForRole()` + five card builders (`_memberCards`, `_superAdminCards`, `_pastorCards`, `_treasurerCards`, `_departmentHeadCards`)
- [x] "`<Role> Dashboard`" section label for non-member roles
- [x] Treasurer-only "Recent Transactions" list (real `/dashboard/transactions` rows, tappable → `/payments`)
- [x] `flutter analyze` clean on `dashboard_screen.dart` (0 errors, 2 pre-existing info lints)
- [x] Rebuild `app-release.apk` (`gradlew assembleRelease --offline` — 26.5 MB, Sep 28 10:18)
- [ ] Install on phone + visual check per role (phone not connected yet)
- [x] Commit + push

## Verification

1. `flutter analyze lib/screens/dashboard_screen.dart` → 0 errors
2. API sanity (live):
   ```bash
   curl -s https://msabato.co.ke/api/dashboard/ministry-health -H "Authorization: Bearer $TOKEN"
   curl -s https://msabato.co.ke/api/dashboard/financial-stats -H "Authorization: Bearer $TOKEN"
   curl -s https://msabato.co.ke/api/dashboard/department-stats -H "Authorization: Bearer $TOKEN"
   curl -s https://msabato.co.ke/api/dashboard/system-health -H "Authorization: Bearer $TOKEN"
   ```
   All already return `200` with real data.
3. On-device: log in as each role and confirm the correct card set + label appears:
   - `member1@newlife.com` → Member cards
   - `admin@kiseriansda.org` (Super Admin) → Super Admin cards
   - Need to create test users for Pastor / Treasurer / Department Head to check those views — currently no such accounts exist in `newlife`

## Follow-up (not in this pass)

- Create per-church role accounts (`pastor@newlife.com`, `treasurer@newlife.com`, `depthead@newlife.com`) so the non-admin views can be visually tested on-device — also needed for the pending SMS-credentials task
- Flutter charts (`fl_chart`) for contributions/attendance trends
- Offline cache of dashboard payload

## Files touched

- `mobile/flutter/flutter-mobile/lib/screens/dashboard_screen.dart` — role resolution, role data fetch, five card builders, treasurer transactions section
- `docs/planning/FLUTTER_ROLE_DASHBOARDS_PLAN.md` — this plan
