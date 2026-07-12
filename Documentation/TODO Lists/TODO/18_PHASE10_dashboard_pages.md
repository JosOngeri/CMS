# Phase 10 — Dashboard Pages (Stubbed / Incomplete)
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 10 — DASHBOARD PAGES (Stubbed / Incomplete)

### 10.1 `frontend/src/pages/dashboard/` — Pastor Dashboard

- [ ] 🟠 Verify `PastorDashboard.jsx` fetches from `GET /api/dashboard/stats` with `church_id` in the request — confirm church data doesn't bleed across tenants
- [ ] 🟠 Add real attendance trend chart using fetched data — not hardcoded mock arrays
- [ ] 🟠 Add real giving trend chart using `GET /api/treasury/summary` data
- [ ] 🟠 Display pending approvals count badge (fetch from `GET /api/approvals/pending-count`)
- [ ] 🟡 Add real-time notification badge that updates via WebSocket when new approvals arrive
- [ ] 🟡 Add quick-action buttons: `Add Announcement`, `Create Event`, `Record Offering` — each navigating to the correct form

### 10.2 `frontend/src/pages/dashboard/` — Treasurer Dashboard

- [ ] 🟠 Verify `TreasuryDashboard.jsx` (or `TreasurerDashboard.jsx`) fetches all data from `GET /api/treasury/*` endpoints with proper church_id scoping
- [ ] 🟠 Implement real budget vs. actual chart using `GET /api/treasury/budgets` and `GET /api/treasury/summary` data
- [ ] 🟠 Implement fund balance table with live data from `GET /api/treasury/funds`
- [ ] 🟠 Show unreconciled transaction count badge from `GET /api/reconciliation/pending-count`
- [ ] 🟡 Add export button for financial summary PDF using `jsPDF`
- [ ] 🟡 Add date range picker for filtering all treasury widgets

### 10.3 `frontend/src/pages/dashboard/` — Super Admin Dashboard

- [ ] 🟠 Implement system health panel using `GET /api/dashboard/system-health` — display DB status, uptime, memory usage
- [ ] 🟠 Add cross-church stats view (Super Admin only): total churches, total users, total revenue
- [ ] 🟠 Display security events feed from `GET /api/security/logs?limit=10`
- [ ] 🟡 Add user activity heatmap (7-day rolling) using `GET /api/analytics/user-activity`

### 10.4 `frontend/src/pages/dashboard/` — Member Dashboard

- [ ] 🟠 Implement personal giving history using `GET /api/payments/my-payments`
- [ ] 🟠 Implement personal attendance record using user-specific dashboard endpoint
- [ ] 🟠 Show upcoming events the member is registered for
- [ ] 🟡 Add pledge progress bar: `pledged amount vs. paid amount` from `GET /api/payments/pledges`

### 10.5 `frontend/src/pages/dashboard/` — Department Head Dashboard

- [ ] 🟠 Implement department member list using `GET /api/departments/:id/members`
- [ ] 🟠 Implement department activity feed using `useActivityFeed` hook (after fixing the empty useEffects in Phase 7.1)
- [ ] 🟠 Display department pending approvals count
- [ ] 🟡 Add quick-add member to department button
