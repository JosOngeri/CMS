# Phase 21 — DASHBOARD PAGES: CONCRETE FIXES FROM LIVE CODE AUDIT
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 21.1 `DepartmentHeadDashboard.jsx` — Two Backend Endpoints Missing

- [ ] 🔴 Create `GET /api/dashboard/department-health` route in `dashboard.routes.js` — this endpoint is called on line 54 of `DepartmentHeadDashboard.jsx` but does not exist in the backend; without it the health metrics always fall back to hardcoded zeros
- [ ] 🔴 Create the corresponding `getDepartmentHealth()` controller method in `dashboard.controller.js` that queries: average task completion rate, member participation count, and budget utilization percentage for the requesting user's department
- [ ] 🔴 Create `GET /api/dashboard/department-activity` route in `dashboard.routes.js` — called on line 62 of `DepartmentHeadDashboard.jsx` but does not exist in backend
- [ ] 🔴 Create the corresponding `getDepartmentActivity()` controller method that returns recent activity items filtered by `req.user.church_id` and the user's department(s)
- [ ] 🟠 Fix hardcoded `76%` health indicator on line 172 of `DepartmentHeadDashboard.jsx` — replace with calculated value from the new `department-health` endpoint response
- [ ] 🟠 Implement the `members` tab content in `DepartmentHeadDashboard.jsx` (currently empty) — fetch from `GET /api/departments/:id/members` and render a member list with role badges
- [ ] 🟠 Implement the `events` tab content — fetch from `GET /api/events?department=:id` and render upcoming event cards
- [ ] 🟠 Implement the `tasks` tab content — fetch from `GET /api/approvals?department=:id&status=pending` and render a task list with approve/reject buttons
- [ ] 🟠 Implement the `budget` tab content — fetch from `GET /api/treasury/budgets?department=:id` and render budget vs actual chart
- [ ] 🟡 Fix quick-action link `/departments/members/add` — verify this route exists in `dashboard.routes.jsx`; if not, create it or point to the correct existing route

### 21.2 `TreasuryDashboard.jsx` — Hardcoded Mock Financial Stats

- [ ] 🔴 Remove hardcoded mock stats on lines 53–60 of `TreasuryDashboard.jsx` (comment says "Use mock data for now since treasury stats endpoint doesn't exist") — replace with a real `GET /api/treasury/summary` call that returns `{ totalIncome, totalExpenses, netIncome, fundBalance }`
- [ ] 🔴 Implement `GET /api/treasury/summary` backend endpoint if it doesn't exist — should aggregate totals from `transactions` table filtered by `church_id` and optionally a date range
- [ ] 🟠 Fix hardcoded financial stats: `totalIncome`, `totalExpenses`, `netIncome`, `fundBalance`, `pendingExpenses`, `budgetVariance` must all come from the API, not literals
- [ ] 🟠 Implement `transactions` tab content in `TreasuryDashboard.jsx` — fetch from `GET /api/treasury/transactions` and render a filterable, paginated table
- [ ] 🟠 Implement `budgets` tab content — fetch from `GET /api/treasury/budgets` and render budget cards with progress bars
- [ ] 🟠 Implement `collections` tab content — fetch from `GET /api/payments?status=completed` grouped by category
- [ ] 🟠 Implement `reports` tab content — render links to trial balance, income statement, balance sheet reports with date range pickers
- [ ] 🟡 Fix quick-action links: `/dashboard/payments/process` and `/treasury/budgets/create` — verify these routes exist in `dashboard.routes.jsx` or update to correct paths

### 21.3 `TreasurerDashboard.jsx` — Backend Returns All Zeros

- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialStats()` method (lines 285–292) — it returns hardcoded zeros; replace with real queries: `SELECT SUM(amount) FROM payments WHERE church_id = $1 AND payment_date >= date_trunc('month', NOW())`
- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialHealth()` method (lines 305–308) — returns hardcoded zeros; implement real calculation: `budget_utilization = actual_spend / budget_total * 100`, `collection_rate = collected / expected * 100`
- [ ] 🔴 Fix `dashboard.controller.js` transactions endpoint (returns empty array) — implement `getRecentTransactions()` using `DashboardRepository.getRecentPaymentsActivity(10, churchId)`
- [ ] 🟠 Fix hardcoded `75%` health indicator on line 171 of `TreasurerDashboard.jsx` — calculate from real `financialHealth` API response: `Math.round((budgetUtilization + collectionRate) / 2)`
- [ ] 🟠 Implement `transactions` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `budgets` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `reports` tab with PDF/Excel export buttons

### 21.4 `PastorDashboard.jsx` — Missing Tab Content and Hardcoded Indicator

- [ ] 🟠 Fix hardcoded `85%` ministry health indicator on line 178 — calculate from real `ministryHealth` API response fields (`memberEngagement`, `departmentActivity`, `spiritualGrowth`)
- [ ] 🟠 Fix `GET /api/dashboard/ministry-health` response: the backend returns hardcoded `85, 92, 78` — implement real calculation using attendance records, department meeting logs, and small group participation
- [ ] 🟠 Implement `departments` tab content in `PastorDashboard.jsx` — fetch from `GET /api/departments` and render department health cards
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?status=pending` and render approval queue
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?upcoming=true` and render event calendar or list
- [ ] 🟠 Implement `members` tab content — fetch from `GET /api/members?status=active&limit=20` and render member highlights
- [ ] 🟡 Fix quick-action link `/reports/ministry` (line 146) — verify this route exists; if not, point to `/reports` instead
- [ ] 🟡 Add permission enforcement on quick action buttons: check `hasPermission('view_approvals')` etc. before rendering each button

### 21.5 `SuperAdminDashboard.jsx` — System Health Always Shows Healthy

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
