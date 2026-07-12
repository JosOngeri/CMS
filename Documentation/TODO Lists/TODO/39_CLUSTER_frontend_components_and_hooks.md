# CLUSTER — Frontend Components and Hooks
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: DataTable, Loading, StatsCard, ErrorBoundary, WebSocketManager, RealTimeActivityFeed, useDataFetch, useActivityFeed, useFieldPermissions, usePermission, ToastContext, ContentContext, TelegramContext.

---

## From PHASE 7 — FRONTEND HOOKS FIXES

### Phase 7.1 — `frontend/src/hooks/useActivityFeed.js` — Empty useEffects

- [x] 🔴 Implement lines 92–96 (empty `autoFetch` useEffect): call `fetchActivities(api)` inside the effect when `autoFetch && departmentId` — without this the hook never loads data automatically
- [x] 🔴 Implement lines 99–107 (empty polling useEffect): call `setInterval(() => fetchActivities(api), pollInterval)` inside and return a cleanup `clearInterval`
- [x] 🔴 Get `api` from `useAuth()` inside the hook itself instead of requiring callers to pass it as a parameter — prevents callers from forgetting
- [x] 🟠 Add error retry logic in `fetchActivities`: on failure, retry up to 2 times with a 1-second delay before setting the error state
- [x] 🟡 Add optimistic update: immediately append a new activity to the local state before the server confirms, then revert on error

### Phase 7.2 — `frontend/src/hooks/useDataFetch.js` — Memory Leak

- [x] 🟠 Add `AbortController` to `fetchData`: create `const controller = new AbortController()` before the fetch, pass `signal: controller.signal`, and return `() => controller.abort()` from the `useEffect` cleanup — without this, unmounted components still process responses
- [x] 🟠 Fix URL construction bug on line 73: the current `${url}${url.includes('?') ? '&' : '?'}page=${page}` fails if the URL already has a `?page=` param — parse the URL properly or use `URLSearchParams`
- [x] 🟡 Add retry logic with exponential backoff for network errors (not 4xx)
- [x] 🟡 Add request deduplication: if an identical URL is already in-flight, return the same promise rather than firing a second request

### Phase 7.3 — `frontend/src/hooks/useFieldPermissions.js` — Dependency Array Bug

- [x] 🟠 Wrap `fetchPermissions` in `useCallback([module, api])` so it has a stable reference
- [x] 🟠 Add `fetchPermissions` to the `useEffect` dependency array (line 12) — the current empty-ish deps causes ESLint exhaustive-deps warning and can miss updates
- [x] 🟡 Add a fallback: if the API call fails, return an empty permissions object with all fields readable but none writable
- [x] 🟡 Add permissions cache with 5-minute TTL per `module` key to avoid fetching on every render

### Phase 7.4 — `frontend/src/hooks/usePermission.js` — Hardcoded Admin Roles

- [x] 🟡 Move hardcoded `['Super Admin', 'Pastor', 'First Elder']` list (lines 59–61) to a constant in a shared config file `frontend/src/config/roles.js` so it's changed in one place
- [x] 🟡 Add permission hierarchy: if user `hasPermission('manage_members')`, automatically also satisfy `hasPermission('view_members')` without needing explicit permission assignment
- [x] 🟢 Add `useMemo` around expensive permission-check results that get called in render functions

---

## From PHASE 8 — FRONTEND CONTEXT FIXES

### Phase 8.1 — `frontend/src/contexts/AuthContext.jsx`

- [x] 🟠 Add token refresh logic: when the `api` interceptor receives a 401, call `POST /api/auth/refresh-token` with the refresh token cookie before clearing the user
- [x] 🟠 Add inactivity timeout: start a 30-minute timer on each API request; if it expires, call `logout()` and redirect to login
- [x] 🟠 Improve cache key generation on line 46: use `JSON.stringify({method, url, params, data})` and hash it with a simple `djb2` function to prevent key collisions
- [x] 🟡 Add request deduplication: if `api.get('/dashboard/stats')` is in-flight and another component calls the same endpoint, return the same promise rather than a second request
- [x] 🟡 Add offline detection using `navigator.onLine` and a `window 'online'/'offline'` event listener — queue requests while offline and flush when connection resumes
- [x] 🟢 Add request timeout: configure `axios` `timeout: 30000` (30 seconds)

### Phase 8.2 — `frontend/src/contexts/ContentContext.jsx` — Uses Plain Axios

- [x] 🟠 Replace all `axios.get`, `axios.post`, `axios.put`, `axios.delete` calls with `const { api } = useAuth()` and use `api.get`, `api.post`, etc. — plain axios bypasses CSRF token injection, auth headers, and the response cache
- [x] 🟠 Add per-operation loading states: `isCreating`, `isUpdating`, `isDeleting` booleans in addition to the global `isLoading`
- [x] 🟡 Add optimistic updates for `deleteContent`: immediately remove from local `content` state, then revert if the API call fails
- [x] 🟡 Add pagination support: add `page`, `limit`, `totalCount` state and a `fetchPage(page)` function
- [x] 🟡 Add content draft support: allow saving with `status: 'draft'` and separate draft list from published list

### Phase 8.3 — `frontend/src/contexts/TelegramContext.jsx` — Uses Plain Axios

- [x] 🟠 Replace all plain `axios.*` calls with the AuthContext `api` instance (same fix as ContentContext)
- [x] 🟠 Add per-operation loading states: `isPosting`, `isSyncing`, `isUpdating` per channel
- [x] 🟡 Add message history state and a `fetchChannelHistory(channelId, limit)` function
- [x] 🟡 Add channel analytics state and a `fetchChannelAnalytics(channelId)` function
- [x] 🟡 Add webhook management: `createWebhook(channelId, url)` and `deleteWebhook(channelId)` functions

### Phase 8.4 — `frontend/src/contexts/ToastContext.jsx` — Hardcoded Timeout

- [x] 🟡 Make timeout configurable per toast: `showToast(message, type, { duration: 5000 })` instead of always 3000ms
- [x] 🟡 Add toast position configuration: accept `position: 'top-right' | 'bottom-center' | 'top-center'` and apply Tailwind class accordingly
- [x] 🟡 Add stacking limit: automatically dismiss the oldest toast when more than 5 are queued
- [x] 🟡 Add toast deduplication: if the same message is already visible, don't show it again
- [x] 🟢 Replace inline styles (lines 36–58) with Tailwind CSS classes for consistency
- [x] 🟢 Add enter/exit CSS transition animations using Tailwind `transition`, `opacity`, `translate-y`

---

## From PHASE 9 — FRONTEND COMPONENT FIXES

### Phase 9.1 — `frontend/src/components/common/DataTable.jsx` — Broken Selection and Stubbed Export

- [x] 🔴 Fix row selection: change from index-based `Set(paginatedData.map((_, index) => index))` to ID-based `Set(paginatedData.map(row => row.id))` — index-based selection breaks when pagination changes the visible rows
- [x] 🟠 Implement Excel export (line 109 stub): install `xlsx` package, add `XLSX.utils.json_to_sheet(data)` and `XLSX.writeFile(wb, 'export.xlsx')` in the Excel handler
- [x] 🟠 Implement PDF export (line 109 stub): install `jspdf` and `jspdf-autotable`, add `doc.autoTable({ columns, body: data })` in the PDF handler
- [ ] 🟡 Add server-side sorting: when `onSortChange` prop is provided, call it with `{ key, direction }` instead of sorting locally
- [ ] 🟡 Add column visibility toggle: add a gear icon dropdown that shows/hides columns, storing the selection in `localStorage`
- [ ] 🟡 Add keyboard navigation: arrow keys to move between rows, Enter to activate row action
- [ ] 🟢 Add row expansion: accept an `expandedRowComponent` prop that renders below a row when it is clicked

### Phase 9.2 — `frontend/src/components/ErrorBoundary.jsx` — No Error Reporting

- [x] 🟠 Replace `console.error(...)` in `componentDidCatch` (line 16) with a call to an error reporting API: `api.post('/api/logs/client-error', { error: error.message, stack: errorInfo.componentStack, url: window.location.href })`
- [x] 🟡 Add `resetErrorBoundary` prop callback so parent components can trigger a recovery
- [x] 🟡 Add `fallback` prop to accept a custom fallback UI instead of the hardcoded one
- [x] 🟡 Fix `import.meta.env.DEV` check (line 31) — also check `process.env.NODE_ENV === 'development'` for non-Vite build compatibility

### Phase 9.5 — `frontend/src/components/common/Loading.jsx` — Hardcoded Columns

- [x] 🟡 Make `TableLoading` columns configurable: add `columns` prop (default 5) so the skeleton matches the actual table structure
- [x] 🟢 Make `withLoading` HOC accept a `LoadingComponent` prop instead of always using `FullPageLoading`
- [x] 🟢 Add `progress` prop to `FullPageLoading` for showing percentage on long operations

### Phase 9.6 — `frontend/src/components/common/StatsCard.jsx` — No States

- [x] 🟡 Add `isLoading` prop: when true, show a skeleton pulse instead of the actual value
- [x] 🟡 Add `error` prop: when set, show an error indicator with a retry button
- [x] 🟡 Add `subtitle` prop for secondary description text below the value
- [x] 🟢 Add `trendPeriod` prop (e.g., `"vs last week"`) to display alongside the change indicator

---

## From PHASE 11 — SEO AND TELEGRAM

### Phase 11.3 — `frontend/src/components/WebSocketManager.jsx`

- [ ] 🟠 Add authentication to WebSocket connection: pass `auth: { token: csrfToken }` in the `socket.io-client` connect options
- [ ] 🟠 Add reconnection logic with exponential backoff: configure `reconnectionDelay: 1000`, `reconnectionDelayMax: 10000`, `reconnectionAttempts: 5`
- [ ] 🟠 Join church-specific rooms on connection: `socket.emit('join-church', { church_id: user.church_id })` so broadcasts are scoped
- [ ] 🟡 Add connection status indicator: expose `isConnected` boolean to the parent so UI can show a red/green dot
- [ ] 🟡 Add message queue: buffer outgoing messages while disconnected and flush on reconnect

### Phase 11.4 — `frontend/src/components/RealTimeActivityFeed.jsx`

- [ ] 🟠 Connect to WebSocket `activity` event: listen for `socket.on('new-activity', callback)` and prepend to the feed array
- [ ] 🟠 Add church_id room filtering: only process activities that match `activity.church_id === user.church_id`
- [ ] 🟡 Add virtual scrolling for long feeds using `react-window` or `react-virtual` to prevent DOM bloat
- [ ] 🟡 Add "X new activities" banner that appears when new items arrive while the user is scrolled down

---

## From PHASE 17 — TESTING

### Phase 17.3 — Frontend Unit Tests

- [ ] 🟠 Write test for `useActivityFeed.js`: mount hook, confirm `fetchActivities` is called on mount (tests the auto-fetch useEffect fix)
- [ ] 🟠 Write test for `DataTable.jsx`: select all rows on page 1, go to page 2 — confirm selection is by ID not index (after fix)
- [ ] 🟠 Write test for `ProtectedRoute.jsx`: confirm no `console.log` calls in production build
- [ ] 🟡 Write test for `AuthContext.jsx`: mock a 401 response and confirm token refresh is attempted before logout (after fix)

---

## From PHASE 20 — FINAL VERIFICATION

### Phase 20.3 — Frontend Verification

- [ ] 🟠 Open the Network tab and confirm no frontend API calls use plain `axios` (all should go through AuthContext `api` instance)
- [ ] 🟠 Confirm DataTable row selection persists correctly across page changes after the ID-based fix
- [ ] 🟠 Confirm `useActivityFeed` auto-loads data on mount (console should not show empty effects)
- [ ] 🟡 Check browser console for zero React `exhaustive-deps` warnings after dependency array fixes
- [ ] 🟡 Verify `ProtectedRoute` logs nothing to console in a production build

---

## From PHASE 9 (Second Pass — lines 1592+) — Frontend Design System

### Phase 9.1 — Design Token Migration

- [ ] 🟠 frontend/tailwind.config.js — Add CSS variable mappings for all semantic tokens
- [ ] 🟠 frontend/tailwind.config.js — Add: success, warning, error, surface, border, muted
- [ ] 🟠 frontend/src/index.css — Add utility classes: .text-success, .bg-success-light, .text-error, .bg-error-light, .text-warning, .bg-warning-light
- [ ] 🟠 frontend/src/components/common/StatsCard.jsx — Replace all literal Tailwind color classes with semantic tokens
- [ ] 🟠 frontend/src/components/common/Card.jsx — Inherit border color from var(--color-border)
- [ ] 🟡 frontend/src/components/common/QuickActionsPanel.jsx — Audit and replace all hardcoded color values
- [ ] 🟡 frontend/src/contexts/ColorPaletteContext.jsx — Export full semantic scale including Success, Warning, Error, Surface, Border
- [ ] 🟡 Grep entire frontend/src/ for text-green- and replace with semantic classes
- [ ] 🟡 Grep entire frontend/src/ for text-red- and replace with semantic classes
- [ ] 🟡 Grep entire frontend/src/ for text-yellow- and replace with semantic classes
- [ ] 🟡 Grep entire frontend/src/ for bg-green- and replace with semantic classes
- [ ] 🟡 Grep entire frontend/src/ for bg-red- and replace with semantic classes

### Phase 9.2 — Skeleton Shimmer System

- [ ] 🟠 frontend/src/index.css — Add @keyframes shimmer animation with sliding gradient
- [ ] 🟠 Create frontend/src/components/common/Skeleton.jsx with three variants:
- [ ] 🟠 TextSkeleton — single line of shimmer text
- [ ] 🟠 CircleSkeleton — circular avatar placeholder
- [ ] 🟠 BoxSkeleton — rectangular block placeholder
- [ ] 🟠 Create frontend/src/components/common/StatsCardSkeleton.jsx — mirrors StatsCard layout
- [ ] 🟠 Create frontend/src/components/common/TableSkeleton.jsx — 5 placeholder rows
- [ ] 🟠 Create frontend/src/components/common/DashboardSkeleton.jsx — full dashboard layout skeleton
- [ ] 🟡 Replace FullPageLoading in PastorDashboard.jsx with DashboardSkeleton
- [ ] 🟡 Replace FullPageLoading in TreasuryDashboard.jsx with DashboardSkeleton
- [ ] 🟡 Replace FullPageLoading in SuperAdminDashboard.jsx with DashboardSkeleton
- [ ] 🟡 Replace CardLoading with StatsCardSkeleton in all dashboard pages

### Phase 9.3 — Toast / Notification System

- [ ] 🟡 Create frontend/src/contexts/NotificationContext.jsx
- [ ] 🟡 Create frontend/src/components/common/ToastContainer.jsx using Tailwind only
- [ ] 🟡 Uninstall react-toastify after migration
- [ ] 🟡 Update all toast.success(), toast.error(), toast.info() calls to use new context

### Phase 9.4 — Error Boundaries

- [ ] 🟠 Create frontend/src/components/common/ComponentErrorBoundary.jsx
- [ ] 🟠 Add onRetry prop that clears error state and re-fetches
- [ ] 🟠 Add Card.jsx onRetry prop that shows "Try Again" button on error
- [ ] 🟠 Wrap all dashboard card sections in <ComponentErrorBoundary>
- [ ] 🟡 Wrap all page-level components in <ComponentErrorBoundary>
- [ ] 🟡 Add 28 error boundaries to UI primitive components (DataTable, Modal, etc.)

---

## From PHASE 10 (Second Pass — lines 1638+) — Frontend Context & State

### Phase 10.1 — frontend/src/contexts/ContentContext.jsx

- [ ] 🟠 Extract "Member Pulse" data into frontend/src/hooks/useMemberPulse.js
- [ ] 🟠 Extract "Activity Feed" data into frontend/src/hooks/useActivityFeed.js
- [ ] 🟠 Extract "Analytics" data into frontend/src/hooks/useAnalytics.js
- [ ] 🟠 Add useMemo to all derived values to prevent unnecessary re-renders
- [ ] 🟡 Create frontend/src/hooks/useDashboardData(role) hook for role-specific data fetching

### Phase 10.2 — frontend/src/contexts/AuthContext.jsx

- [ ] 🟠 Replace axios with auth-api instance that includes CSRF token
- [ ] 🟠 Ensure auth-api auto-attaches Bearer token on every request
- [ ] 🟠 Add useMemo around value object to prevent re-renders
- [ ] 🟡 Add auto-refresh token logic (refresh 1 minute before expiry)

### Phase 10.4 — WebSocket / Real-Time

- [ ] 🟠 Create frontend/src/contexts/SocketContext.js
- [ ] 🟠 Install socket.io-client if not already installed
- [ ] 🟠 Connect on login, disconnect on logout
- [ ] 🟠 Listen for approvals:new event — update approvals badge counter
- [ ] 🟠 Listen for system:health event — update SuperAdmin system monitor
- [ ] 🟠 Listen for notification:new event — show toast notification
- [ ] 🟡 Listen for chat:message event — update chat badge
- [ ] 🟡 Add reconnection logic with exponential backoff
- [ ] 🟡 Add connection status indicator in header ("Live" green dot)

---

## From PHASE 11 (Second Pass — lines 1665+) — Frontend UI Components

### Phase 11.1 — frontend/src/components/common/DataTable.jsx

- [ ] 🟠 Add mobile card view fallback for screens smaller than md breakpoint
- [ ] 🟠 Create CardViewRow.jsx sub-component for mobile list items
- [ ] 🟠 Add useMobile() hook to toggle between table and card view
- [ ] 🟠 Wrap table in <div className="overflow-x-auto"> for horizontal scroll on medium screens
- [ ] 🟡 Add column resizing support
- [ ] 🟡 Add column visibility toggle (show/hide columns)
- [ ] 🟡 Persist column preferences in localStorage

### Phase 11.2 — frontend/src/components/common/Loading.jsx

- [ ] 🟠 Replace animate-pulse with @keyframes shimmer sliding gradient animation
- [ ] 🟡 Add size variants: sm, md, lg
- [ ] 🟡 Add inline mode (shows next to text)

---

## From PHASE 25 — FRONTEND COMPONENT COMPLETENESS

### Phase 25.1 — Activity Feed Components

- [ ] 🟠 frontend/src/components/common/ActivityFeed.jsx — Connect to GET /api/activity-feed real endpoint
- [ ] 🟠 frontend/src/components/common/RealTimeActivityFeed.jsx — Connect to Socket.IO for real-time updates
- [ ] 🟠 frontend/src/components/common/RealTimeActivityFeed.jsx — Add reconnection logic
- [ ] 🟡 Add activity type icons (member joined, payment made, approval requested, etc.)
- [ ] 🟡 Add "Load more" pagination button at bottom of feed
- [ ] 🟡 Add activity filter (All, Members, Finance, Approvals)

### Phase 25.3 — Stats Cards

- [ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add trend arrow (up/down from previous period)
- [ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add percentage change label
- [ ] 🟠 frontend/src/components/common/StatsCard.jsx — Add isLoading prop that shows StatsCardSkeleton
- [ ] 🟡 frontend/src/components/common/StatsCard.jsx — Add onClick prop for drill-down navigation
- [ ] 🟡 frontend/src/components/common/StatsCard.jsx — Add tooltip with more detail on hover

---

## From APPENDIX A — QUICK-WIN TASKS

- [ ] 🟠 `useActivityFeed.js` lines 92–96: implement the empty auto-fetch useEffect
- [ ] 🟠 `useActivityFeed.js` lines 99–107: implement the empty polling useEffect
- [ ] 🟠 `ProtectedRoute.jsx` lines 10, 24, 37, 42: wrap console.logs in `import.meta.env.DEV &&`

## From APPENDIX D — UPDATED QUICK-WIN LIST (From Dashboard Audit)

- [ ] 🔴 `RealTimeActivityFeed.jsx` line 24: change `/dashboard/activity` → `/api/dashboard/activity`
