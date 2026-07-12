# Phase 9 — Frontend Component Fixes
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 9 — FRONTEND COMPONENT FIXES

### 9.1 `frontend/src/components/common/DataTable.jsx` — Broken Selection and Stubbed Export

- [ ] 🔴 Fix row selection: change from index-based `Set(paginatedData.map((_, index) => index))` to ID-based `Set(paginatedData.map(row => row.id))` — index-based selection breaks when pagination changes the visible rows
- [ ] 🟠 Implement Excel export (line 109 stub): install `xlsx` package, add `XLSX.utils.json_to_sheet(data)` and `XLSX.writeFile(wb, 'export.xlsx')` in the Excel handler
- [ ] 🟠 Implement PDF export (line 109 stub): install `jspdf` and `jspdf-autotable`, add `doc.autoTable({ columns, body: data })` in the PDF handler
- [ ] 🟡 Add server-side sorting: when `onSortChange` prop is provided, call it with `{ key, direction }` instead of sorting locally so the parent can re-fetch
- [ ] 🟡 Add column visibility toggle: add a gear icon dropdown that shows/hides columns, storing the selection in `localStorage`
- [ ] 🟡 Add keyboard navigation: arrow keys to move between rows, Enter to activate row action
- [ ] 🟢 Add row expansion: accept an `expandedRowComponent` prop that renders below a row when it is clicked

### 9.2 `frontend/src/components/ErrorBoundary.jsx` — No Error Reporting

- [ ] 🟠 Replace `console.error(...)` in `componentDidCatch` (line 16) with a call to an error reporting API: `api.post('/api/logs/client-error', { error: error.message, stack: errorInfo.componentStack, url: window.location.href })`
- [ ] 🟡 Add `resetErrorBoundary` prop callback so parent components can trigger a recovery
- [ ] 🟡 Add `fallback` prop to accept a custom fallback UI instead of the hardcoded one
- [ ] 🟡 Fix `import.meta.env.DEV` check (line 31) — also check `process.env.NODE_ENV === 'development'` for non-Vite build compatibility

### 9.3 `frontend/src/components/ProtectedRoute.jsx` — Console Logs in Production

- [ ] 🟠 Remove or wrap all `console.log` statements (lines 10, 24, 37, 42) in `import.meta.env.DEV &&` conditions — these leak routing logic and auth state in production browser consoles
- [ ] 🟡 Make redirect paths configurable via props: `<ProtectedRoute redirectTo="/login">` instead of hardcoded `"/"`
- [ ] 🟡 Preserve the intended path as a `?redirect=` query param so after login the user is sent back to where they were going
- [ ] 🟢 Add role-based protection: accept a `requiredRoles` prop in addition to `permission` and `permissions`

### 9.4 `frontend/src/components/common/ProtectedComponent.jsx` — Stubbed Access Request

- [ ] 🟠 Implement `RequestAccessButton` `onClick` handler (line 119 `console.log` stub): call `api.post('/api/access-requests', { feature, requested_by: user.id })` and show a toast on success
- [ ] 🟡 Add loading state to `RequestAccessButton`: disable and show spinner after clicking until API responds
- [ ] 🟡 Track request status: store the pending request ID in state and change button text to `"Request Sent"` so users can't double-submit

### 9.5 `frontend/src/components/common/Loading.jsx` — Hardcoded Columns

- [ ] 🟡 Make `TableLoading` columns configurable: add `columns` prop (default 5) so the skeleton matches the actual table structure
- [ ] 🟢 Make `withLoading` HOC accept a `LoadingComponent` prop instead of always using `FullPageLoading`
- [ ] 🟢 Add `progress` prop to `FullPageLoading` for showing percentage on long operations

### 9.6 `frontend/src/components/common/StatsCard.jsx` — No States

- [ ] 🟡 Add `isLoading` prop: when true, show a skeleton pulse instead of the actual value
- [ ] 🟡 Add `error` prop: when set, show an error indicator with a retry button
- [ ] 🟡 Add `subtitle` prop for secondary description text below the value
- [ ] 🟢 Add `trendPeriod` prop (e.g., `"vs last week"`) to display alongside the change indicator
