# CLUSTER — Dashboard Pages
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: PastorDashboard, TreasuryDashboard, TreasurerDashboard, SuperAdminDashboard, AdminDashboard, DepartmentHeadDashboard, MemberDashboard, dashboard.controller.js, DashboardRepository, dashboard.routes.js (backend).

---

## From PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### Phase 3.9 — `backend/controllers/dashboard.controller.js` — Stubs and No church_id

- [ ] 🔴 Add validation that `req.user.church_id` exists before any dashboard query — return 403 if missing
- [ ] 🟠 Pass `req.user.church_id` to ALL `DashboardRepository` method calls (currently missing in `getStats`, `getActivity`, `getPersonalStats`, `getPersonalStatus`, `getPersonalActivity`)
- [x] 🟠 Fix line 115: change `activities.splice(limit)` → `activities.slice(0, limit)` — `splice` mutates the array in place and removes items; `slice` is the correct non-mutating version (SKIPPED - code not found, line mismatch)
- [ ] 🟠 Add `limit` validation in `getActivity` and `getPersonalActivity`: clamp between 1 and 100, reject negative values
- [ ] 🟠 Implement `getSystemHealth()` fully: instead of hardcoded stub values, query real metrics: DB connection pool status, last migration run date, memory usage, uptime, error rate from logs
- [ ] 🟡 Add Redis caching to `getStats()` with 60-second TTL — these aggregation queries are expensive and run on every dashboard load

---

## From PHASE 10 — DASHBOARD PAGES (Stubbed / Incomplete)

### Phase 10.1 — `frontend/src/pages/dashboard/` — Pastor Dashboard

- [ ] 🟠 Verify `PastorDashboard.jsx` fetches from `GET /api/dashboard/stats` with `church_id` in the request — confirm church data doesn't bleed across tenants
- [ ] 🟠 Add real attendance trend chart using fetched data — not hardcoded mock arrays
- [ ] 🟠 Add real giving trend chart using `GET /api/treasury/summary` data
- [ ] 🟠 Display pending approvals count badge (fetch from `GET /api/approvals/pending-count`)
- [ ] 🟡 Add real-time notification badge that updates via WebSocket when new approvals arrive
- [ ] 🟡 Add quick-action buttons: `Add Announcement`, `Create Event`, `Record Offering` — each navigating to the correct form

### Phase 10.2 — `frontend/src/pages/dashboard/` — Treasurer Dashboard

- [ ] 🟠 Verify `TreasuryDashboard.jsx` (or `TreasurerDashboard.jsx`) fetches all data from `GET /api/treasury/*` endpoints with proper church_id scoping
- [ ] 🟠 Implement real budget vs. actual chart using `GET /api/treasury/budgets` and `GET /api/treasury/summary` data
- [ ] 🟠 Implement fund balance table with live data from `GET /api/treasury/funds`
- [ ] 🟠 Show unreconciled transaction count badge from `GET /api/reconciliation/pending-count`
- [ ] 🟡 Add export button for financial summary PDF using `jsPDF`
- [ ] 🟡 Add date range picker for filtering all treasury widgets

### Phase 10.3 — `frontend/src/pages/dashboard/` — Super Admin Dashboard

- [ ] 🟠 Implement system health panel using `GET /api/dashboard/system-health` — display DB status, uptime, memory usage
- [ ] 🟠 Add cross-church stats view (Super Admin only): total churches, total users, total revenue
- [ ] 🟠 Display security events feed from `GET /api/security/logs?limit=10`
- [ ] 🟡 Add user activity heatmap (7-day rolling) using `GET /api/analytics/user-activity`

### Phase 10.4 — `frontend/src/pages/dashboard/` — Member Dashboard

- [ ] 🟠 Implement personal giving history using `GET /api/payments/my-payments`
- [ ] 🟠 Implement personal attendance record using user-specific dashboard endpoint
- [ ] 🟠 Show upcoming events the member is registered for
- [ ] 🟡 Add pledge progress bar: `pledged amount vs. paid amount` from `GET /api/payments/pledges`

### Phase 10.5 — `frontend/src/pages/dashboard/` — Department Head Dashboard

- [ ] 🟠 Implement department member list using `GET /api/departments/:id/members`
- [ ] 🟠 Implement department activity feed using `useActivityFeed` hook (after fixing the empty useEffects in Phase 7.1)
- [ ] 🟠 Display department pending approvals count
- [ ] 🟡 Add quick-add member to department button

---

## From PHASE 21 — DASHBOARD PAGES: CONCRETE FIXES FROM LIVE CODE AUDIT

### Phase 21.1 — `DepartmentHeadDashboard.jsx` — Two Backend Endpoints Missing

- [x] 🔴 Create `GET /api/dashboard/department-health` route in `dashboard.routes.js` — this endpoint is called on line 54 of `DepartmentHeadDashboard.jsx` but does not exist in the backend; without it the health metrics always fall back to hardcoded zeros
- [x] 🔴 Create the corresponding `getDepartmentHealth()` controller method in `dashboard.controller.js` that queries: average task completion rate, member participation count, and budget utilization percentage for the requesting user's department
- [x] 🔴 Create `GET /api/dashboard/department-activity` route in `dashboard.routes.js` — called on line 62 of `DepartmentHeadDashboard.jsx` but does not exist in backend
- [x] 🔴 Create the corresponding `getDepartmentActivity()` controller method that returns recent activity items filtered by `req.user.church_id` and the user's department(s)
- [ ] 🟠 Fix hardcoded `76%` health indicator on line 172 of `DepartmentHeadDashboard.jsx` — replace with calculated value from the new `department-health` endpoint response
- [ ] 🟠 Implement the `members` tab content in `DepartmentHeadDashboard.jsx` (currently empty) — fetch from `GET /api/departments/:id/members` and render a member list with role badges
- [ ] 🟠 Implement the `events` tab content — fetch from `GET /api/events?department=:id` and render upcoming event cards
- [ ] 🟠 Implement the `tasks` tab content — fetch from `GET /api/approvals?department=:id&status=pending` and render a task list with approve/reject buttons
- [ ] 🟠 Implement the `budget` tab content — fetch from `GET /api/treasury/budgets?department=:id` and render budget vs actual chart
- [ ] 🟡 Fix quick-action link `/departments/members/add` — verify this route exists in `dashboard.routes.jsx`; if not, create it or point to the correct existing route

### Phase 21.2 — `TreasuryDashboard.jsx` — Hardcoded Mock Financial Stats

- [x] 🔴 Remove hardcoded mock stats on lines 53–60 of `TreasuryDashboard.jsx` (comment says "Use mock data for now since treasury stats endpoint doesn't exist") — replace with a real `GET /api/treasury/summary` call that returns `{ totalIncome, totalExpenses, netIncome, fundBalance }`
- [x] 🔴 Implement `GET /api/treasury/summary` backend endpoint if it doesn't exist — should aggregate totals from `transactions` table filtered by `church_id` and optionally a date range
- [ ] 🟠 Fix hardcoded financial stats: `totalIncome`, `totalExpenses`, `netIncome`, `fundBalance`, `pendingExpenses`, `budgetVariance` must all come from the API, not literals
- [ ] 🟠 Implement `transactions` tab content in `TreasuryDashboard.jsx` — fetch from `GET /api/treasury/transactions` and render a filterable, paginated table
- [ ] 🟠 Implement `budgets` tab content — fetch from `GET /api/treasury/budgets` and render budget cards with progress bars
- [ ] 🟠 Implement `collections` tab content — fetch from `GET /api/payments?status=completed` grouped by category
- [ ] 🟠 Implement `reports` tab content — render links to trial balance, income statement, balance sheet reports with date range pickers
- [ ] 🟡 Fix quick-action links: `/dashboard/payments/process` and `/treasury/budgets/create` — verify these routes exist in `dashboard.routes.jsx` or update to correct paths

### Phase 21.3 — `TreasurerDashboard.jsx` — Backend Returns All Zeros

- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialStats()` method (lines 285–292) — it returns hardcoded zeros; replace with real queries: `SELECT SUM(amount) FROM payments WHERE church_id = $1 AND payment_date >= date_trunc('month', NOW())`
- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialHealth()` method (lines 305–308) — returns hardcoded zeros; implement real calculation: `budget_utilization = actual_spend / budget_total * 100`, `collection_rate = collected / expected * 100`
- [ ] 🔴 Fix `dashboard.controller.js` transactions endpoint (returns empty array) — implement `getRecentTransactions()` using `DashboardRepository.getRecentPaymentsActivity(10, churchId)`
- [ ] 🟠 Fix hardcoded `75%` health indicator on line 171 of `TreasurerDashboard.jsx` — calculate from real `financialHealth` API response: `Math.round((budgetUtilization + collectionRate) / 2)`
- [ ] 🟠 Implement `transactions` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `budgets` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `reports` tab with PDF/Excel export buttons

### Phase 21.4 — `PastorDashboard.jsx` — Missing Tab Content and Hardcoded Indicator

- [ ] 🟠 Fix hardcoded `85%` ministry health indicator on line 178 — calculate from real `ministryHealth` API response fields (`memberEngagement`, `departmentActivity`, `spiritualGrowth`)
- [ ] 🟠 Fix `GET /api/dashboard/ministry-health` response: the backend returns hardcoded `85, 92, 78` — implement real calculation using attendance records, department meeting logs, and small group participation
- [ ] 🟠 Implement `departments` tab content in `PastorDashboard.jsx` — fetch from `GET /api/departments` and render department health cards
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?status=pending` and render approval queue
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?upcoming=true` and render event calendar or list
- [ ] 🟠 Implement `members` tab content — fetch from `GET /api/members?status=active&limit=20` and render member highlights
- [ ] 🟡 Fix quick-action link `/reports/ministry` (line 146) — verify this route exists; if not, point to `/reports` instead
- [ ] 🟡 Add permission enforcement on quick action buttons: check `hasPermission('view_approvals')` etc. before rendering each button

### Phase 21.5 — `SuperAdminDashboard.jsx` — System Health Always Shows Healthy

- [ ] 🔴 Fix `dashboard.controller.js` `getSystemHealth()` (lines 237–242) — currently returns hardcoded `{ database: 'healthy', api: 'healthy', lastSync: new Date(), activeUsers: 0 }`; replace with real checks:
  - DB health: `SELECT 1` query with timeout check
  - API health: measure response time of the last 100 requests from logs
  - Active users: count sessions active in the last 15 minutes from `user_sessions` table
  - Last sync: query most recent entry in `audit_log`
- [ ] 🟠 Fix hardcoded system health display in `SuperAdminDashboard.jsx` — replace static `"healthy"` text with dynamic status from the API, colored red/yellow/green based on actual values
- [ ] 🟠 Implement `members` tab content in `SuperAdminDashboard.jsx` — fetch from `GET /api/members` and render paginated member table with filters
- [ ] 🟠 Implement `departments` tab content — fetch from `GET /api/departments` and render department status cards
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals` and render full approval queue with approve/reject buttons
- [ ] 🟠 Implement `analytics` tab content — render user activity chart, content views chart, payment trends chart
- [ ] 🟡 Fix quick-action link `/dashboard/admin/settings` — verify this route exists in `dashboard.routes.jsx`

### Phase 21.6 — `AdminDashboard.jsx` — API Path Missing `/api/` Prefix

- [x] 🔴 Fix line 26 in `AdminDashboard.jsx`: change `GET /dashboard/stats` → `GET /api/dashboard/stats` — the missing `/api/` prefix will cause a 404 against the Express router (COMPLETED)
- [ ] 🟠 Replace hardcoded recent activity placeholder section (lines 220–261) with a real `GET /api/dashboard/activity?limit=10` call and render the returned items
- [ ] 🟡 Fix duplicate Tailwind class conflict on lines 120–124: `text-[var(--color-text)] text-white` — pick one; `text-white` overrides the CSS variable class

### Phase 21.7 — `MemberDashboard.jsx` — Mostly Real but Tab Content Missing

- [ ] 🟠 Fix hardcoded `85%` personal status indicator on line 165 — calculate from real `personalStatus` API response: `Math.round((attendanceRate + contributionRate + activityLevel) / 3)`
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?registered=me` and render upcoming events the member has joined
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?requester=me` and render the member's own approval requests

---

## From PHASE 22 — ADDITIONAL CONCRETE FIXES

### Phase 22.1 — Backend Dashboard Controller — Implement All Stub Methods

- [ ] 🔴 Implement `getSystemHealth()` in `dashboard.controller.js`: run `SELECT 1` query to verify DB, measure response latency, count active sessions, return structured health object
- [ ] 🔴 Implement `getFinancialStats()` in `dashboard.controller.js`: aggregate `SUM(amount) FROM payments WHERE church_id AND month = current_month` for income; `SUM(amount) FROM transactions WHERE type='expense' AND church_id AND month = current_month` for expenses
- [ ] 🔴 Implement `getFinancialHealth()` in `dashboard.controller.js`: calculate `budgetUtilization`, `collectionRate`, `expenseRatio` from real DB queries
- [ ] 🔴 Add `GET /api/dashboard/department-stats` response body: currently returns all zeros (lines 254–259); implement real query `SELECT COUNT(*) FROM department_members WHERE department_id = ANY(user_departments) AND church_id = $1`
- [ ] 🔴 Add `GET /api/dashboard/ministry-health` response body: implement real calculation using attendance data from `attendance_records`, department meeting completions, and giving participation rates

### Phase 22.2 — Dashboard Repository — Add Missing Query Methods

- [ ] 🟠 Add `getDepartmentHealth(userId, churchId)` to `DashboardRepository.js`: query task completion percentage, active member count, and budget utilization for the user's departments
- [ ] 🟠 Add `getDepartmentActivityFeed(userId, churchId, limit)` to `DashboardRepository.js`: query recent department events, member joins/leaves, budget changes
- [ ] 🟠 Add `getFinancialStatsSummary(churchId, startDate, endDate)` to `DashboardRepository.js`: aggregate income and expense totals from `payments` and `transactions` tables
- [ ] 🟠 Add `getMinistryHealth(churchId)` to `DashboardRepository.js`: calculate percentage of members with attendance in the last 4 weeks, departments with recent activity, and giving participation rate

### Phase 22.3 — Routing Verification

- [ ] 🟠 Verify `/reports/ministry` route exists in `frontend/src/router/dashboard.routes.jsx` — used as a quick-action link in `PastorDashboard.jsx`; if missing, create the route and a stub `MinistryReports.jsx` page
- [ ] 🟠 Verify `/dashboard/payments/process` route exists — used in `TreasuryDashboard.jsx`; if missing, point to `/payments/create` or the correct route
- [ ] 🟠 Verify `/dashboard/admin/settings` route exists — used in `SuperAdminDashboard.jsx`; if missing, point to `/settings` or create the route
- [ ] 🟠 Verify `/approvals/submit` route exists — used in `MemberDashboard.jsx`; if missing, point to `/approvals/new`
- [ ] 🟠 Verify `/payments/my` route exists — used in `MemberDashboard.jsx`; verify or alias to `/payments?filter=mine`
- [ ] 🟡 Add a `RouteGuard` that checks if a quick-action route exists before rendering the button — avoids dead links showing to users

### Phase 22.4 — Dashboard Health Indicators — Make All Dynamic

- [x] 🟠 `PastorDashboard.jsx` line 178: replace hardcoded `85` with `Math.round((ministryHealth.memberEngagement + ministryHealth.departmentActivity + ministryHealth.spiritualGrowth) / 3)` (COMPLETED)
- [x] 🟠 `TreasurerDashboard.jsx` line 171: replace hardcoded `75` with `Math.round((financialHealth.budgetUtilization + financialHealth.collectionRate) / 2)` (COMPLETED)
- [x] 🟠 `DepartmentHeadDashboard.jsx` line 172: replace hardcoded `76` with `Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)` (COMPLETED)
- [x] 🟠 `MemberDashboard.jsx` line 165: replace hardcoded `85` with `Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)` (COMPLETED)

### Phase 22.5 — Permission Enforcement on Quick Actions

- [ ] 🟡 In `PastorDashboard.jsx`: wrap each quick-action button in `<ProtectedComponent permission="...">` — the `permission` prop is defined in the actions array but never enforced in the render loop
- [ ] 🟡 In `TreasurerDashboard.jsx`: add `hasPermission('create_transaction')` check before rendering `Process Payment` quick action
- [ ] 🟡 In `SuperAdminDashboard.jsx`: add `requireRole('Super Admin')` check before rendering admin quick actions
- [ ] 🟡 In `DepartmentHeadDashboard.jsx`: add `hasPermission('manage_department')` check before rendering department management actions

---

## From PHASE 12 (Second Pass — lines 1694+) — Frontend Dashboard Pages (Replace Stubs)

### Phase 12.1 — frontend/src/pages/dashboard/PastorDashboard.jsx

- [ ] 🔴 Replace Members tab EmptyState with real member list using GET /api/members
- [ ] 🔴 Replace Departments tab EmptyState with real department list
- [ ] 🔴 Replace Events tab EmptyState with real events list
- [ ] 🔴 Replace Approvals "Coming Soon" with ApprovalCard component list
- [ ] 🟠 Create frontend/src/components/dashboard/MemberTimeline.jsx
- [ ] 🟠 MemberTimeline.jsx — Connect to GET /api/members/events (baptisms, new joins, anniversaries)
- [ ] 🟠 Add "Missing in Action" tracker (members not attended in 3+ weeks)
- [ ] 🟠 Add Engagement AreaChart (Recharts) — weekly attendance vs digital giving
- [ ] 🟠 Add Department Pulse BarChart — task completion per department
- [ ] 🟠 Add "Approve/Reject" fast-action buttons directly in dashboard approvals feed
- [ ] 🟡 Add pastoral notes section for member counseling records
- [ ] 🟡 Add upcoming church events widget

### Phase 12.2 — frontend/src/pages/dashboard/TreasuryDashboard.jsx

- [ ] 🔴 Replace mock data stats with real API calls to GET /api/treasury/stats
- [ ] 🔴 Replace mock transaction list with real GET /api/treasury/transactions
- [ ] 🟠 Add Cash Flow Trend LineChart — Income vs Expenses over last 6 months
- [ ] 🟠 Add Fund Balances table — "Restricted" vs "Unrestricted" funds
- [ ] 🟠 Add Budget vs Actual progress tracking module per department
- [ ] 🟠 Add Reconciliation Engine UI — side-by-side bank statement vs system ledger
- [ ] 🟠 Add Digital Receipts — generate and view contribution receipts via jspdf
- [ ] 🟡 Add "Send All Receipts" batch email button for end-of-year statements
- [ ] 🟡 Add 6-month cash flow forecast

### Phase 12.3 — frontend/src/pages/dashboard/SuperAdminDashboard.jsx

- [ ] 🔴 Replace Analytics tab EmptyState with real analytics charts
- [ ] 🔴 Replace User Management tab EmptyState with real user management workflow
- [ ] 🟠 Add System Health Monitor — real-time API latency and DB status via WebSocket
- [ ] 🟠 Add Advanced Audit Logs table — multi-parameter filtering (user, action, date range)
- [ ] 🟡 Add "Impersonate User" feature (Super Admin only, with audit trail)
- [ ] 🟡 Add system backup trigger button

### Phase 12.4 — frontend/src/pages/dashboard/DeptHeadDashboard.jsx

- [ ] 🔴 Replace Tasks tab EmptyState with real task management
- [ ] 🔴 Replace Volunteer Tracking tab EmptyState with real volunteer data
- [ ] 🟠 Create frontend/src/components/dashboard/KanbanBoard.jsx — drag-and-drop task management
- [ ] 🟠 Create frontend/src/components/dashboard/VolunteerChart.jsx — hours served BarChart
- [ ] 🟡 Add department budget tracker widget
- [ ] 🟡 Add member attendance tracker for department events

### Phase 12.5 — frontend/src/pages/dashboard/MemberDashboard.jsx

- [ ] 🟠 Add "Attendance Streak" counter
- [ ] 🟠 Add upcoming duty/roster reminder widget
- [ ] 🟠 Add personal giving history chart
- [ ] 🟡 Add digital contribution receipt download
- [ ] 🟡 Add church events RSVP widget

---

## From APPENDIX A — QUICK-WIN TASKS

- [x] 🟠 `dashboard.controller.js` line 115: change `activities.splice(limit)` → `activities.slice(0, limit)` (SKIPPED - code not found, line mismatch)

## From APPENDIX D — UPDATED QUICK-WIN LIST

- [x] 🔴 `AdminDashboard.jsx` line 26: change `/dashboard/stats` → `/api/dashboard/stats` (COMPLETED)
- [x] 🟠 `PastorDashboard.jsx` line 178: replace `85` with calculated value (COMPLETED)
- [x] 🟠 `TreasurerDashboard.jsx` line 171: replace `75` with calculated value (COMPLETED)
- [x] 🟠 `DepartmentHeadDashboard.jsx` line 172: replace `76` with calculated value (COMPLETED)
- [x] 🟠 `MemberDashboard.jsx` line 165: replace `85` with calculated value (COMPLETED)
- [ ] 🟠 `dashboard.controller.js` `getFinancialStats()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `dashboard.controller.js` `getFinancialHealth()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `dashboard.controller.js` `getDepartmentStats()` lines 254–259: replace zeros with real SQL
