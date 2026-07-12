# Route Mounting Validation

**Generated:** 2026-06-20

This document validates that route files are properly mounted in the server configuration.

---

## Server Configuration Analysis

### Routes Mounted in server.js

| Prefix | Route File Expected |
|--------|-------------------|
| `/api/auth` | `routes/auth.routes.js` |
| `/api/auth` | `routes/auth.routes.js` |
| `/api/users` | `routes/users.routes.js` |
| `/api/user-settings` | `routes/user-settings.routes.js` |
| `/api/content` | `routes/content.routes.js` |
| `/api/departments` | `routes/departments.routes.js` |
| `/api/department` | `routes/department.routes.js` |
| `/api/department-categories` | `routes/department-categories.routes.js` |
| `/api/treasury` | `routes/treasury.routes.js` |
| `/api/payments` | `routes/payments.routes.js` |
| `/api/events` | `routes/events.routes.js` |
| `/api/sms` | `routes/sms.routes.js` |
| `/api/documents` | `routes/documents.routes.js` |
| `/api/approvals` | `routes/approvals.routes.js` |
| `/api/notifications` | `routes/notifications.routes.js` |
| `/api/reports` | `routes/reports.routes.js` |
| `/api/analytics` | `routes/analytics.routes.js` |
| `/api/search` | `routes/search.routes.js` |
| `/api/security` | `routes/security.routes.js` |
| `/api/performance` | `routes/performance.routes.js` |
| `/api/mobile` | `routes/mobile.routes.js` |
| `/api/settings` | `routes/settings.routes.js` |
| `/api/members` | `routes/members.routes.js` |
| `/api/announcements` | `routes/announcements.routes.js` |
| `/api/gallery` | `routes/gallery.routes.js` |
| `/api/palettes` | `routes/palettes.routes.js` |
| `/api/comments` | `routes/comments.routes.js` |
| `/api/field-permissions` | `routes/field-permissions.routes.js` |
| `/api/audit-logs` | `routes/audit-logs.routes.js` |
| `/api/collections` | `routes/collections.routes.js` |
| `/api/telegram` | `routes/telegram.routes.js` |
| `/api/dashboard` | `routes/dashboard.routes.js` |
| `/api/monitoring` | `routes/monitoring.routes.js` |
| `/api/seo` | `routes/seo.routes.js` |
| `/api/accessibility` | `routes/accessibility.routes.js` |
| `/api/testing` | `routes/testing.routes.js` |
| `/api/documentation` | `routes/documentation.routes.js` |

**Total in server.js:** 37

### Routes Mounted in app.js

| Prefix | Route File Expected |
|--------|-------------------|
| `/api/health` | `routes/health.routes.js` |
| `/api/auth` | `routes/auth.routes.js` |
| `/api/users` | `routes/users.routes.js` |
| `/api/user-settings` | `routes/user-settings.routes.js` |
| `/api/announcements` | `routes/announcements.routes.js` |
| `/api/departments` | `routes/departments.routes.js` |
| `/api/department` | `routes/department.routes.js` |
| `/api/department-categories` | `routes/department-categories.routes.js` |
| `/api/payments` | `routes/payments.routes.js` |
| `/api/events` | `routes/events.routes.js` |
| `/api/sms` | `routes/sms.routes.js` |
| `/api/dashboard` | `routes/dashboard.routes.js` |
| `/api/treasury` | `routes/treasury.routes.js` |
| `/api/settings` | `routes/settings.routes.js` |
| `/api/gallery` | `routes/gallery.routes.js` |
| `/api/palettes` | `routes/palettes.routes.js` |
| `/api/notifications` | `routes/notifications.routes.js` |
| `/api/approvals` | `routes/approvals.routes.js` |
| `/api/comments` | `routes/comments.routes.js` |
| `/api/field-permissions` | `routes/field-permissions.routes.js` |
| `/api/audit-logs` | `routes/audit-logs.routes.js` |
| `/api/collections` | `routes/collections.routes.js` |
| `/api/documents` | `routes/documents.routes.js` |

**Total in app.js:** 23

---

## Discrepancies Between server.js and app.js

### Routes Only in server.js (Not in app.js)

- `/api/content`
- `/api/reports`
- `/api/analytics`
- `/api/search`
- `/api/security`
- `/api/performance`
- `/api/mobile`
- `/api/members`
- `/api/telegram`
- `/api/monitoring`
- `/api/seo`
- `/api/accessibility`
- `/api/testing`
- `/api/documentation`

### Routes Only in app.js (Not in server.js)

- `/api/health`

---

## Route Files vs Mounting

| Route File | Mounted in server.js | Mounted in app.js | Status |
|------------|---------------------|------------------|--------|
| `accessibility.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `analytics.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `announcements.routes.js` | ✅ | ✅ | ✅ OK |
| `approvals.routes.js` | ✅ | ✅ | ✅ OK |
| `audit-logs.routes.js` | ✅ | ✅ | ✅ OK |
| `auth.routes.js` | ✅ | ✅ | ✅ OK |
| `collections.routes.js` | ✅ | ✅ | ✅ OK |
| `comments.routes.js` | ✅ | ✅ | ✅ OK |
| `content.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `dashboard.routes.js` | ✅ | ✅ | ✅ OK |
| `department-categories.routes.js` | ✅ | ✅ | ✅ OK |
| `department.routes.js` | ✅ | ✅ | ✅ OK |
| `departments.routes.js` | ✅ | ✅ | ✅ OK |
| `documentation.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `documents.routes.js` | ✅ | ✅ | ✅ OK |
| `events.routes.js` | ✅ | ✅ | ✅ OK |
| `fieldPermissions.routes.js` | ❌ | ❌ | ❌ Not mounted |
| `gallery.routes.js` | ✅ | ✅ | ✅ OK |
| `members.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `mobile.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `monitoring.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `notifications.routes.js` | ✅ | ✅ | ✅ OK |
| `palette.routes.js` | ❌ | ❌ | ❌ Not mounted |
| `payment.routes.js` | ❌ | ❌ | ❌ Not mounted |
| `payments.routes.js` | ✅ | ✅ | ✅ OK |
| `performance.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `reports.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `search.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `security.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `seo.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `settings.routes.js` | ✅ | ✅ | ✅ OK |
| `sms.routes.js` | ✅ | ✅ | ✅ OK |
| `socialAuth.routes.js` | ❌ | ❌ | ❌ Not mounted |
| `telegram.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `testing.routes.js` | ✅ | ❌ | ⚠️ Only in server.js |
| `treasury.routes.js` | ✅ | ✅ | ✅ OK |
| `users.routes.js` | ✅ | ✅ | ✅ OK |
| `userSettings.routes.js` | ❌ | ❌ | ❌ Not mounted |

### Mounted Routes Without Corresponding Files

| Prefix | Expected File | Status |
|--------|---------------|--------|
| `/api/user-settings` | `routes/user-settings.routes.js` | ❌ Missing |
| `/api/palettes` | `routes/palettes.routes.js` | ❌ Missing |
| `/api/field-permissions` | `routes/field-permissions.routes.js` | ❌ Missing |

---

## Treasury Module Routes

| Treasury Route File | Expected Mount Point |
|---------------------|---------------------|
| `account.routes.js` | `/api/treasury/account` |
| `budget.routes.js` | `/api/treasury/budget` |
| `expense.routes.js` | `/api/treasury/expense` |
| `fund.routes.js` | `/api/treasury/fund` |
| `index.js` | `/api/treasury/index` |
| `journalEntry.routes.js` | `/api/treasury/journalEntry` |

**Treasury mounted in server.js:** ✅
**Treasury mounted in app.js:** ✅

⚠️ **Note:** app.js mounts treasury at `/api/modules/treasury/routes` which is different from server.js

---

## Critical Missing Routes

| Route | File | In server.js | In app.js | Importance |
|-------|------|-------------|----------|------------|
| `/api/users` | `users.routes.js` | ✅ | ✅ | HIGH - User management  |
| `/api/user-settings` | `userSettings.routes.js` | ✅ | ✅ | HIGH - User preferences  |
| `/api/events` | `events.routes.js` | ✅ | ✅ | HIGH - Event management  |
| `/api/department` | `department.routes.js` | ✅ | ✅ | HIGH - Department management  |
| `/api/department-categories` | `department-categories.routes.js` | ✅ | ✅ | MEDIUM - Department categories  |
| `/api/palettes` | `palette.routes.js` | ✅ | ✅ | MEDIUM - UI theming  |
| `/api/comments` | `comments.routes.js` | ✅ | ✅ | MEDIUM - Comments system  |
| `/api/field-permissions` | `fieldPermissions.routes.js` | ✅ | ✅ | MEDIUM - Field-level permissions  |
| `/api/audit-logs` | `audit-logs.routes.js` | ✅ | ✅ | HIGH - Audit trail  |
| `/api/collections` | `collections.routes.js` | ✅ | ✅ | MEDIUM - Collections  |

---

*This document is auto-generated by validate-route-mounting.js*
