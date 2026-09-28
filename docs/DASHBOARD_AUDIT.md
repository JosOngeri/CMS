# Dashboard Audit — Flutter App & Web App

Date: 2026-09-28
Scope: `mobile/flutter/flutter-mobile/lib/screens/dashboard_screen.dart` + `frontend/src/pages/dashboard/*` + `backend/routes/dashboard.routes.js` + `backend/repositories/DashboardRepository.js` + `backend/repositories/MobileRepository.js`

## 1. Are the dashboards completely built?

**Mostly yes — after the fixes below.** Both surfaces now return live data from the VPS (`msabato.co.ke`) instead of erroring or showing hardcoded values.

### Verified live responses (as `member1@newlife.com`, role `Member`)

| Endpoint | Before | After |
|---|---|---|
| `GET /api/dashboard/personal-stats` | 500 | 200 — `departmentAssignments:2, upcomingEvents:1, personalContributions:45994.8` |
| `GET /api/dashboard/personal-status` | 500 | 200 — `attendanceRate:83.33, contributionRate:84.62, activityLevel:100` |
| `GET /api/dashboard/personal-activity` | 500 | 200 — real event + payment activity |
| `GET /api/dashboard/stats` | 200 | 200 — `totalMembers:200, totalPayments:17.7M, upcomingEvents:17` |
| `GET /api/dashboard/activity` | 200 | 200 |
| `GET /api/dashboard/system-health` | 500 | 200 — `activeUsers`, real lastSync |
| `GET /api/dashboard/ministry-health` | 500 | 200 |
| `GET /api/dashboard/financial-stats` | 200 | 200 |
| `GET /api/dashboard/financial-health` | 500 | 200 |
| `GET /api/dashboard/transactions` | 500 | 200 |
| `GET /api/dashboard/department-stats` | 500 | 200 |
| `GET /api/dashboard/department-health` | 200 | 200 |
| `GET /api/dashboard/department-activity` | 200 | 200 |

### Bugs fixed in this pass

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | `personal-stats` 500 | `approval_requests.user_id` → column is `requester_id` | Repo query updated |
| 2 | `personal-status` / `personal-activity` 500 | `ea.user_id`, `p.user_id` → columns are `member_id` (FK → users.id) | Repo queries updated |
| 3 | `personal-activity` 500 | `params.push(churchId, limit)` produced 4 params for 3 placeholders | `params.splice` corrected |
| 4 | `system-health` 500 | `users.last_login` missing; `api_logs` table missing | Migration 029; last_login set on login; lastSync now derived from real writes |
| 5 | `ministry-health` 500 | `event_attendance.event_date` missing; `tasks` table missing | Join `events`; migration 030 |
| 6 | `financial-health` 500 | `event_collections` table missing; `budget_amount`/`actual_spend` → real cols are `total_amount`/`spent_amount` | Migration 030; query fixed |
| 7 | `transactions` 500 | `transactions.member_id` missing | Migration 030 |
| 8 | `department-stats` 500 | `db.budget_amount` → `db.total_amount` | Query fixed |
| 9 | RSVP 403 on mobile | CSRF middleware applied to Bearer-token requests | CSRF skipped when `Authorization: Bearer` present |
| 10 | Rate-limit crash | `req.ip` returned `ip:port` from proxy | `keyGenerator` strips `IPv4:port`, wraps `ipKeyGenerator` for IPv6 |

## 2. What each dashboard shows today

### Flutter app — `dashboard_screen.dart` (role-aware, single screen)

| Stat card | Shown to | Data source | Tap → route |
|---|---|---|---|
| My Contributions | Member | `mobile/dashboard` → `personal_contributions` | `/payments` |
| My Departments | Member | `my_departments` | `/departments` |
| Upcoming Events | Member | `upcoming_events` | `/events` |
| Unread Notices | Member | `unread_announcements` | `/announcements` |
| Total Members | Admin/Pastor/Elder/Treasurer/Dept Head | `total_members` | `/members` |
| Departments | Privileged | `total_departments` | `/departments` |
| Income (30d) | Privileged | `monthly_income` | `/payments` |
| Expenses (30d) | Privileged | `monthly_expense` | `/payments` |
| Unread Notices | Privileged | `notifications.unread` | `/announcements` |
| Pending Approvals | Privileged | `approvals.pending` | `/approvals` |

Also: welcome header with real name, pull-to-refresh, recent-activity feed (tappable → related section).

### Web app — `frontend/src/pages/dashboard/` (6 role dashboards)

| File | Role | What it renders |
|---|---|---|
| `Dashboard.jsx` | router | Picks dashboard by `user.roles` |
| `DashboardHome.jsx` | fallback | Generic overview + quick links |
| `MemberDashboard.jsx` | Member | Personal status ring, dept assignments, pending approvals, upcoming events, contributions, activity feed |
| `SuperAdminDashboard.jsx` | Super Admin | System-organism viz, member/dept/approval/finance stats, activity feed |
| `PastorDashboard.jsx` | Pastor | Ministry health (engagement/growth), stats, activity |
| `TreasurerDashboard.jsx` | Treasurer | Financial stats/health, transactions feed |
| `DepartmentHeadDashboard.jsx` | Department Head | Dept members/tasks/events/budget, dept activity |

All stat cards use `ChurchStatsCard` with `linkTo` — clicking navigates to the matching section.

## 3. Remaining gaps (real, not cosmetic)

1. **Fallback data masks failures.** `MemberDashboard` seeds `attendanceRate: 92, contributionRate: 85, activityLevel: 78` and `SuperAdminDashboard` seeds `activeUsers: 12, lastSync: '2 minutes ago'` — if an endpoint fails the UI shows plausible-looking fake numbers instead of an error state.
2. **`/api/dashboard/stats` is church-scoped but member-facing fields are duplicated** between `stats` (church) and `personal-stats` (member) — no combined endpoint.
3. **Flutter has no charts.** The web uses `recharts` + custom viz components (`PersonalGrowthViz`, `SystemOrganismViz`); the app has numbers only.
4. **No "My" sub-pages on mobile for some linked routes** — web has `/departments/my`, `/approvals/my`, `/payments/my`; mobile reuses the shared list screens (acceptable but not identical UX).
5. **`upcomingEvents` on the member card counts events the user RSVP'd to, not all upcoming church events** — either rename the card to "My Events" or change the query.
6. **No offline/empty-state copy for a church with 0 members** (e.g. `kiserian-main-sda` admin sees all-zero stats with no hint why).
7. **System-health `activeUsers` counts `last_login` in 30 min** — no other real-time signal (sessions, socket connections).

## 4. Recommended improvements (priority order)

| # | Improvement | Where | Effort |
|---|---|---|---|
| 1 | Remove hardcoded fallbacks; show `EmptyState`/`ErrorEmptyState` + retry | `MemberDashboard`, `SuperAdminDashboard` | S |
| 2 | Add `fl_chart` line/bar charts: contributions over 12 months, attendance trend | `dashboard_screen.dart` | M |
| 3 | Rename "Upcoming Events" → "My Events" OR query all church events | `dashboard_screen.dart` + repo | S |
| 4 | Add quick-action row on mobile (Pay Tithe, View Card, Departments, Documents) matching web `ChurchQuickActions` | `dashboard_screen.dart` | S |
| 5 | Show "no data yet" guidance when `total_members = 0` | both dashboards | S |
| 6 | Cache last dashboard payload (SQLite/SharedPreferences) for offline viewing | Flutter | M |
| 7 | Surface `api_logs` writes (requests middleware) so `lastSync` reflects real API traffic | backend | M |

## 5. Verification commands

```bash
# Live smoke test of every app endpoint
cd backend && BASE_URL=https://msabato.co.ke/api node scripts/app-smoke-test.js

# Direct dashboard endpoint check
TOKEN=$(curl -s -X POST https://msabato.co.ke/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member1@newlife.com","password":"right123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s https://msabato.co.ke/api/dashboard/personal-stats -H "Authorization: Bearer $TOKEN"
```

## 6. Migrations applied in this pass

| File | Purpose |
|---|---|
| `028_mobile_missing_tables.sql` | `documents`, `document_permissions`, `document_versions`, `payment_methods`, `payment_categories`, `payments.payment_method_id`, `departments.category` |
| `029_users_last_login.sql` | `users.last_login`, `api_logs` |
| `030_dashboard_missing_tables.sql` | `tasks`, `event_collections`, `department_budgets`, `transactions.member_id` |

All applied locally and on the VPS (`cms_db`), and pushed to `main`.
