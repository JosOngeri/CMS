# KMainCMS Granular Implementation Task List

This document provides a line-by-line breakdown of the tasks required to complete the KMainCMS frontend transformation.

## Phase 1: Foundation & System Integrity

### 1.1 Route Architecture (`frontend/src/router/dashboard.routes.jsx`)
- [ ] **Restructure Exports:** Move from a flat array to grouped sub-objects (e.g., `pastorRoutes`, `treasuryRoutes`, `adminRoutes`).
- [ ] **Path De-duplication:** 
    - [ ] Remove duplicate `payments` entries.
    - [ ] Rename `treasury/reports` to distinguish from general `reports`.
- [ ] **Implement Strict Layouts:** Ensure role-specific routes are wrapped in a `RoleGuard` component.

### 1.2 Sidebar & Navigation (`frontend/src/components/layout/Sidebar.jsx`)
- [ ] **Permission Filter Logic:** Implement a helper function `filterRoutesByPermission(routes, userPermissions)`.
- [ ] **Active State Refinement:** Fix CSS classes to use `var(--color-primary-500)` for active links instead of hardcoded hex codes.
- [ ] **Nested Menu Support:** Add accordion support for Treasury and Admin sub-menus.

### 1.3 Design Token Migration
- [ ] **Standardize Tailwind Config:** Ensure `tailwind.config.js` includes the CSS variable mappings for all semantic tokens (Success, Warning, Error).
- [ ] **Audit `PastorDashboard.jsx`:**
    - [ ] Replace `bg-green-100` with `bg-[var(--color-success)]-100`.
    - [ ] Replace `bg-purple-100` with `bg-[var(--color-secondary)]-100`.
- [ ] **Component Library Sync:** Update `Card.jsx` and `StatsCard.jsx` to inherit border colors from `var(--color-border)`.

---

## Phase 2: The Pastor's "Ministry Radar"

### 2.1 Members Tab (`frontend/src/pages/dashboard/PastorDashboard.jsx`)
- [ ] **Member Lifecycle Timeline:**
    - [ ] Create `MemberTimeline.jsx` component.
    - [ ] Integration: `GET /api/members/events` (baptisms, new joins, anniversaries).
- [ ] **Quick Stats Grid:** Implement "Missing in Action" (MIA) tracker for members not attended in 3+ weeks.

### 2.2 Ministry Health Analytics
- [ ] **Engagement Chart:** 
    - [ ] Implementation using `AreaChart` from Recharts.
    - [ ] Data: Weekly attendance vs. digital giving engagement.
- [ ] **Department Pulse:** 
    - [ ] Implement a `BarChart` showing "Task Completion" per department.

### 2.3 Approvals Integration
- [ ] **Actionable Feed:** Replace the "Coming Soon" card with a list of `ApprovalCard` components.
- [ ] **Fast-Action Buttons:** "Approve/Reject" buttons directly in the dashboard feed.

---

## Phase 3: Treasury & Financial Integrity

### 3.1 Financial Overview (`frontend/src/pages/treasury/TreasuryDashboard.jsx`)
- [ ] **Cash Flow Trend:** `LineChart` showing Income vs. Expenses over the last 6 months.
- [ ] **Fund Balances:** A specialized table showing "Restricted" vs. "Unrestricted" funds.

### 3.2 Reconciliation Engine
- [ ] **Bank Feed UI:** Create a side-by-side view for "Bank Statement" vs. "System Ledger".
- [ ] **Auto-Match Logic:** Highlight potential matches based on date and amount.

### 3.3 Receipting System
- [ ] **PDF Generator:** Integrate `jspdf` for generating digital contribution receipts.
- [ ] **Batch Emailing:** Add a "Send All Receipts" button for end-of-year statements.

---

## Phase 4: UX & Performance Polish

### 4.1 Skeleton Screen Implementation
- [ ] **Create `StatsCardSkeleton.jsx`**: Shimmer effect for the 4 top-level stats.
- [ ] **Create `TableSkeleton.jsx`**: Placeholder rows for Member and Transaction lists.
- [ ] **Global Replace:** Swap `FullPageLoading` with these skeletons in `PastorDashboard` and `TreasuryDashboard`.

### 4.2 Error Handling & Resiliency
- [ ] **Empty State Customization:** Create unique icons for "No Transactions", "No Members Found", and "No Pending Approvals".
- [ ] **Retry Logic:** Add a "Refresh Data" button to all dashboard cards that uses a `forceUpdate` flag.

---

## Phase 5: Backend Readiness (API Requirements)

- [ ] `GET /api/dashboard/ministry-health`: Finalize the aggregation logic in the controller.
- [ ] `GET /api/treasury/cash-flow`: Create the SQL view for monthly aggregations.
- [ ] `POST /api/approvals/:id/quick-action`: Lightweight endpoint for dashboard-level approvals.
- [ ] `GET /api/system/health`: WebSocket implementation for latency and DB status.
