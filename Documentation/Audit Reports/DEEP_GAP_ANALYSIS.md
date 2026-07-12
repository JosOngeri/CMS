# KMainCMS Deep Gap Analysis & Hyper-Granular Task List

This document identifies "hidden" architectural and UX gaps discovered through deep code inspection and provides a surgical plan to resolve them.

## 1. Architectural Gaps

### 1.1 Route Security & Role Integrity
*   **Gap:** All dashboard routes are behind `ProtectedRoute`, but lack granular `RoleGuard` enforcement. A "Member" can attempt to access `/dashboard/treasury`.
*   **Fix:** Implement a `RoleGuard` component and wrap specific route groups.
*   **Tasks:**
    - [ ] Create `frontend/src/components/common/RoleGuard.jsx`.
    - [ ] Refactor `dashboard.routes.jsx` to use a `roles` property in route definitions.
    - [ ] Wrap `treasury` routes in `RoleGuard(['Treasurer', 'Super Admin'])`.
    - [ ] Wrap `admin` routes in `RoleGuard(['Super Admin'])`.

### 1.2 Flat vs. Scalable Sidebar
*   **Gap:** `Sidebar.jsx` uses a flat array and hardcoded link logic, making it impossible to support the 20+ Treasury sub-routes without UI clutter.
*   **Fix:** Refactor Sidebar to support a hierarchical "Menu Tree" with accordions.
*   **Tasks:**
    - [ ] Define a `SIDEBAR_CONFIG` object in `frontend/src/config/navigation.js`.
    - [ ] Add `children` support to sidebar items for sub-menus.
    - [ ] Implement `SidebarAccordion.jsx` for nested items (Treasury, Admin).

### 1.3 Backend "Stale Logic" & Stub Controllers
*   **Gap:** `DashboardController.js` and others return hardcoded "100%" or empty arrays for high-value metrics.
*   **Fix:** Replace hardcoded returns with actual SQL aggregations in `DashboardRepository.js`.
*   **Tasks:**
    - [ ] **Ministry Health:** Implement logic in `DashboardRepository.getMinistryHealth` using `attendance` and `engagement_logs` tables.
    - [ ] **Treasury Pulse:** Implement `getFinancialStats` using `transactions` and `ledgers` tables.
    - [ ] **System Pulse:** Connect `getSystemHealth` to actual DB and Redis health checks.

---

## 2. Design System & UX Gaps

### 2.1 Color Token "Leakage"
*   **Gap:** `StatsCard.jsx` and `PastorDashboard.jsx` use literal Tailwind classes (`text-green-600`, `bg-purple-100`) which don't update when the theme changes.
*   **Fix:** Create a set of utility classes in `index.css` that map to semantic tokens.
*   **Tasks:**
    - [ ] In `index.css`, create `.text-success`, `.bg-success-light`, `.text-error`, etc.
    - [ ] Update `StatsCard.jsx` to use these semantic utility classes.
    - [ ] Audit `QuickActionsPanel.jsx` for hardcoded color values.

### 2.2 Skeleton Shimmer Implementation
*   **Gap:** `Loading.jsx` uses `animate-pulse` (simple opacity change) instead of a professional "Shimmer" (sliding gradient).
*   **Fix:** Implement a global `@keyframes shimmer` and skeleton primitives.
*   **Tasks:**
    - [ ] Add `shimmer` animation to `index.css`.
    - [ ] Create `frontend/src/components/common/Skeleton.jsx` with `TextSkeleton`, `CircleSkeleton`, and `BoxSkeleton` variants.
    - [ ] Replace `CardLoading` with a structured `DashboardSkeleton` that mirrors the real layout.

### 2.3 Dashboard "Retry & Resiliency"
*   **Gap:** If an API call fails, the dashboard shows an `EmptyState` or a toast, but lacks a local "Try Again" button for that specific card.
*   **Fix:** Implement an `ErrorBoundary` wrapper for dashboard cards with a retry callback.
*   **Tasks:**
    - [ ] Create `ComponentErrorBoundary.jsx`.
    - [ ] Add a `onRetry` prop to `Card.jsx`.
    - [ ] Implement local loading states per card rather than one global `loading` state for the whole page.

---

## 3. Data Flow & Performance Gaps

### 3.1 Global State Overuse
*   **Gap:** `ContentContext.jsx` is becoming a "kitchen sink" for all dashboard data, potentially causing unnecessary re-renders.
*   **Fix:** Use local `useDataFetch` hooks with `SWR` or `React Query` style caching for specific dashboard modules.
*   **Tasks:**
    - [ ] Audit `ContentContext.jsx` and extract "Member Pulse" data into a dedicated hook.
    - [ ] Implement `useDashboardData(role)` hook to manage role-specific data fetching.

### 3.2 Missing Real-time Updates
*   **Gap:** Approvals and System Health require manual refreshes.
*   **Fix:** Integrate a lightweight WebSocket "Heartbeat" for SuperAdmin and Pastor notifications.
*   **Tasks:**
    - [ ] Set up `SocketContext.js` on the frontend.
    - [ ] Add `socket.io-client` and listen for `approvals:new` and `system:health` events.

---

## 4. Hyper-Granular Backend Tasks

### 4.1 `DashboardRepository.js` Deep Work
- [ ] **Method:** `getMinistryHealth(churchId)`
    - SQL: Join `members` with `attendance_records` over 4 weeks to calculate "Active Engagement Rate".
- [ ] **Method:** `getFinancialSummary(churchId)`
    - SQL: Sum `transactions` where `type='income'` vs `type='expense'` for the current month.
- [ ] **Method:** `getSystemMetrics()`
    - Logic: Use `process.memoryUsage()` and a `SELECT 1` ping to DB.

### 4.2 `ApprovalsController.js` Refinement
- [ ] Add `POST /api/approvals/bulk-action` to handle multiple approvals at once (Pastor UX).
- [ ] Implement "Auto-Reject" logic for requests older than 30 days.
