# Phase 13 — Reports and Analytics
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 13 — REPORTS AND ANALYTICS

### 13.1 Treasury Reports

- [x] 🟠 Implement `GET /api/treasury/reports/trial-balance` with real double-entry accounting query: debit total = credit total assertion
- [x] 🟠 Implement `GET /api/treasury/reports/income-statement` grouped by category for a date range
- [x] 🟠 Implement `GET /api/treasury/reports/balance-sheet` showing assets, liabilities, and equity
- [x] 🟠 Implement `GET /api/treasury/reports/cash-flow` showing operating, investing, and financing cash flows
- [x] 🟠 Implement `GET /api/treasury/reports/fund-balance` per fund/campaign
- [ ] 🟡 Add PDF export for each report using `pdfkit` or `puppeteer` on the backend
- [ ] 🟡 Add Excel export for each report using `exceljs`

### 13.2 Member Reports

- [x] 🟠 Implement `GET /api/reports/membership-growth` returning month-over-month member count with `church_id` filter
- [x] 🟠 Implement `GET /api/reports/attendance-trend` returning weekly attendance for the past 52 weeks
- [x] 🟡 Implement `GET /api/reports/member-demographics` returning age group, gender, and location breakdowns
- [x] 🟡 Add birthday report: `GET /api/members?filter=birthday_this_month` for pastoral care

### 13.3 Analytics Dashboard

- [x] 🟠 Implement `GET /api/analytics/user-activity` returning daily active users for the past 30 days
- [x] 🟠 Implement `GET /api/analytics/content-views` returning page view counts per content item
- [x] 🟡 Add heatmap data endpoint: `GET /api/analytics/heatmap?period=7d` returning hourly activity counts
