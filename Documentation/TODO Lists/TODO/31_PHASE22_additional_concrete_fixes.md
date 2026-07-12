# Phase 22 — ADDITIONAL CONCRETE FIXES (From All Subagents Combined)
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 22.1 Backend Dashboard Controller — Implement All Stub Methods

- [ ] 🔴 Implement `getSystemHealth()` in `dashboard.controller.js`: run `SELECT 1` query to verify DB, measure response latency, count active sessions, return structured health object
- [ ] 🔴 Implement `getFinancialStats()` in `dashboard.controller.js`: aggregate `SUM(amount) FROM payments WHERE church_id AND month = current_month` for income; `SUM(amount) FROM transactions WHERE type='expense' AND church_id AND month = current_month` for expenses
- [ ] 🔴 Implement `getFinancialHealth()` in `dashboard.controller.js`: calculate `budgetUtilization`, `collectionRate`, `expenseRatio` from real DB queries
- [ ] 🔴 Add `GET /api/dashboard/department-stats` response body: currently returns all zeros (lines 254–259); implement real query `SELECT COUNT(*) FROM department_members WHERE department_id = ANY(user_departments) AND church_id = $1`
- [ ] 🔴 Add `GET /api/dashboard/ministry-health` response body: implement real calculation using attendance data from `attendance_records`, department meeting completions, and giving participation rates

### 22.2 Dashboard Repository — Add Missing Query Methods

- [ ] 🟠 Add `getDepartmentHealth(userId, churchId)` to `DashboardRepository.js`: query task completion percentage, active member count, and budget utilization for the user's departments
- [ ] 🟠 Add `getDepartmentActivityFeed(userId, churchId, limit)` to `DashboardRepository.js`: query recent department events, member joins/leaves, budget changes
- [ ] 🟠 Add `getFinancialStatsSummary(churchId, startDate, endDate)` to `DashboardRepository.js`: aggregate income and expense totals from `payments` and `transactions` tables
- [ ] 🟠 Add `getMinistryHealth(churchId)` to `DashboardRepository.js`: calculate percentage of members with attendance in the last 4 weeks, departments with recent activity, and giving participation rate

### 22.3 Routing Verification

- [ ] 🟠 Verify `/reports/ministry` route exists in `frontend/src/router/dashboard.routes.jsx` — used as a quick-action link in `PastorDashboard.jsx`; if missing, create the route and a stub `MinistryReports.jsx` page
- [ ] 🟠 Verify `/dashboard/payments/process` route exists — used in `TreasuryDashboard.jsx`; if missing, point to `/payments/create` or the correct route
- [ ] 🟠 Verify `/dashboard/admin/settings` route exists — used in `SuperAdminDashboard.jsx`; if missing, point to `/settings` or create the route
- [ ] 🟠 Verify `/approvals/submit` route exists — used in `MemberDashboard.jsx`; if missing, point to `/approvals/new`
- [ ] 🟠 Verify `/payments/my` route exists — used in `MemberDashboard.jsx`; verify or alias to `/payments?filter=mine`
- [ ] 🟡 Add a `RouteGuard` that checks if a quick-action route exists before rendering the button — avoids dead links showing to users

### 22.4 Dashboard Health Indicators — Make All Dynamic

- [ ] 🟠 `PastorDashboard.jsx` line 178: replace hardcoded `85` with `Math.round((ministryHealth.memberEngagement + ministryHealth.departmentActivity + ministryHealth.spiritualGrowth) / 3)`
- [ ] 🟠 `TreasurerDashboard.jsx` line 171: replace hardcoded `75` with `Math.round((financialHealth.budgetUtilization + financialHealth.collectionRate) / 2)`
- [ ] 🟠 `DepartmentHeadDashboard.jsx` line 172: replace hardcoded `76` with `Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)`
- [ ] 🟠 `MemberDashboard.jsx` line 165: replace hardcoded `85` with `Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)`

### 22.5 Permission Enforcement on Quick Actions

- [ ] 🟡 In `PastorDashboard.jsx`: wrap each quick-action button in `<ProtectedComponent permission="...">` — the `permission` prop is defined in the actions array but never enforced in the render loop
- [ ] 🟡 In `TreasurerDashboard.jsx`: add `hasPermission('create_transaction')` check before rendering `Process Payment` quick action
- [ ] 🟡 In `SuperAdminDashboard.jsx`: add `requireRole('Super Admin')` check before rendering admin quick actions
- [ ] 🟡 In `DepartmentHeadDashboard.jsx`: add `hasPermission('manage_department')` check before rendering department management actions
