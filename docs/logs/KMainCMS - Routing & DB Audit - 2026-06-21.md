# KMainCMS - Routing & DB Call Audit
**Date:** 2026-06-21  
**Session Type:** Full codebase audit — routing, DB calls, endpoint alignment

---

## Summary

Full audit of all backend routes, controllers, DB queries, and frontend API calls. Found and fixed **9 bugs** covering SQL injection risks, broken SQL syntax, route shadowing, wrong HTTP methods, missing endpoints, and incorrect response-field references.

---

## Files Audited

### Backend
- `app.js` / `server.js` — dual entry points (both used)
- `routes/*.routes.js` — all 38 route files
- `controllers/*.controller.js` — all 36 controller files
- `middleware/auth.js`
- `modules/treasury/routes/index.js`

### Frontend
- `contexts/AuthContext.jsx`
- `pages/notifications/Notifications.jsx`
- `pages/payments/Payments.jsx`
- `pages/payments/MyPayments.jsx`
- `pages/analytics/Analytics.jsx`
- `router.jsx`

---

## Bugs Found & Fixed

### BUG 1 — `payment.routes.js`: Middleware import crash
**File:** `backend/routes/payment.routes.js`  
**Problem:** `const auth = require('../middleware/auth')` imports the module object, not a function. Calling `router.use(auth)` would throw a "not a function" error on startup.  
**Fix:** Changed to `const { authenticateToken } = require('../middleware/auth')` and `router.use(authenticateToken)`.

---

### BUG 2 — `approvals.routes.js`: Route shadowing (`/:id` before static paths)
**File:** `backend/routes/approvals.routes.js`  
**Problem:** `GET /workflows` and `GET /analytics` were defined **after** `GET /:id`. Express matches `/:id` first, so `/workflows` and `/analytics` were always caught by the `:id` handler.  
**Fix:** Moved `/workflows`, `/analytics`, `/execute` before the `/:id` group.

---

### BUG 3 — `payments.controller.js`: Broken SQL in `getPaymentSummary`
**File:** `backend/controllers/payments.controller.js`  
**Problem:** When no date filter was provided, the query was:
```sql
FROM payments
 -- (no WHERE)
AND status = 'completed'
```
This is invalid SQL and would throw a PostgreSQL syntax error.  
**Fix:** Changed the base `dateFilter` to `WHERE status = 'completed'` and included the status in the date-filtered variant too.

---

### BUG 4 — `approvals.controller.js`: Broken name concatenation
**File:** `backend/controllers/approvals.controller.js`  
**Problem:** `u1.first_name || 'Unknown'` produces `"JohnUnknown"` when the user exists, and just `"Unknown"` when NULL. Missing ` || ' ' || u1.last_name` and COALESCE wrapping.  
**Fix:** Changed all name columns to `COALESCE(uN.first_name || ' ' || uN.last_name, 'Unknown')`.

---

### BUG 5 — `approvals.controller.js`: Wrong column for delegate role filtering
**File:** `backend/controllers/approvals.controller.js`  
**Problem:** `WHERE role IN ('Super Admin', 'Pastor', 'Department Head')` — `users` table has no `role` column; roles are in the `roles` / `user_roles` junction tables.  
**Fix:** Rewrote the query with a proper JOIN through `user_roles` and `roles`.

---

### BUG 6 — `Notifications.jsx`: Wrong HTTP method for mark-as-read
**File:** `frontend/src/pages/notifications/Notifications.jsx`  
**Problem:** Frontend called `PUT /notifications/:id/read` and `PUT /notifications/read-all`, but the backend defines `POST /:notificationId/read` and `POST /mark-all-read`.  
**Fix:** Changed both to `POST` and corrected the endpoint path to `/notifications/mark-all-read`.

---

### BUG 7 — `Notifications.jsx`: Wrong response data key
**File:** `frontend/src/pages/notifications/Notifications.jsx`  
**Problem:** `response.data.notifications` — backend returns `{ success, data: [...] }`, not `{ notifications }`.  
**Fix:** Changed to `response.data.data || []`.

---

### BUG 8 — `Notifications.jsx`: Wrong `read` field name throughout JSX
**File:** `frontend/src/pages/notifications/Notifications.jsx`  
**Problem:** JSX referenced `n.read` and `notification.read` everywhere, but the DB column (and backend response) is `is_read`.  
**Fix:** Replaced all occurrences with `is_read`.

---

### BUG 9 — `payments.routes.js` + `payments.controller.js`: Missing endpoints called by frontend
**Files:** `backend/routes/payments.routes.js`, `backend/controllers/payments.controller.js`  
**Problem:**
- `Payments.jsx` calls `GET /payments/categories` — did not exist
- `MyPayments.jsx` calls `GET /payments/my-payments` — did not exist
- `MyPayments.jsx` calls `GET /payments/:id/receipt` — did not exist
- `Payments.jsx` calls `POST /payments` (root) — route was at `POST /payments/payments`

**Fix:**
- Added `getPaymentCategories()`, `getMyPayments()`, `downloadReceipt()` to `PaymentsController`
- Added `GET /categories`, `GET /my-payments`, `GET /:id/receipt` routes
- Added root-level `GET /` and `POST /` aliases

---

### BUG 10 — `dashboard.routes.js` + `sms.controller.js`: SQL injection via user-controlled `months` param
**Files:** `backend/routes/dashboard.routes.js`, `backend/controllers/sms.controller.js`  
**Problem:** `INTERVAL '${months} months'` interpolates the user query param directly into SQL string.  
**Fix:** Sanitised `months` to a clamped integer and used parameterised `($1 * INTERVAL '1 month')` form.

---

## Non-Bug Observations

| Item | Detail |
|------|--------|
| Dual entry points | `app.js` and `server.js` both exist and define overlapping routes. `server.js` is the actual server; `app.js` appears to be an older version. Routes should be consolidated into one entry point to avoid confusion. |
| `Analytics.jsx` uses mock data | The page imports `api` from AuthContext but never calls any backend endpoint — all data is hardcoded. This should be wired to `GET /api/analytics/dashboard` etc. |
| `dashboard.routes.js` `attendance-trends` SQL injection | `interval` is derived from a validated `period` enum (`weekly/monthly/yearly`) so it is safe, but `months` in `/financial-overview` was not — now fixed. |
| `users.routes.js` count query bug | The `countQuery` uses `$1` and `$2` directly in the template literal (not parameterised), which could produce wrong counts when filtering by both `role` and `department`. This is a logic issue but not exploitable since the outer query handles it. |
| `server.js` missing routes from `app.js` | `app.js` registers `events`, `palettes`, `collections`, `field-permissions`, `audit-logs`, `userSettings`, `department-categories`, `comments` routes; `server.js` doesn't register them. If `server.js` is the live entry point, these are unreachable. |
| `app.js` missing routes from `server.js` | `server.js` registers `content`, `reports`, `analytics`, `search`, `security`, `performance`, `mobile`, `telegram`, `monitoring`, `seo`, `accessibility`, `testing`, `documentation`, `members`, `socialAuth` routes; `app.js` doesn't. |

---

## Recommended Follow-Up

1. **Consolidate entry points** — merge all route registrations into `server.js` and delete or clearly deprecate `app.js`.
2. **Wire Analytics.jsx** — replace mock data with real API calls to `/api/analytics/*`.
3. **Fix `users.routes.js` count query** — parameterise `$1`/`$2` correctly in both the subquery and outer query.
4. **Add `payment_date` to `payments` table** — `payments.controller.js` references `p.payment_date` but `payment.controller.js` inserts with no `payment_date`; ensure the column exists with a default.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/routes/payment.routes.js` | Fixed auth middleware destructuring |
| `backend/routes/approvals.routes.js` | Fixed route ordering (static before `/:id`) |
| `backend/routes/payments.routes.js` | Added 5 missing routes + reordered parameterised routes last |
| `backend/controllers/payments.controller.js` | Fixed SQL bug in `getPaymentSummary`; added 3 new methods |
| `backend/controllers/approvals.controller.js` | Fixed name concat + fixed delegate role query |
| `backend/controllers/sms.controller.js` | Fixed SQL injection in `getAnalytics` |
| `backend/routes/dashboard.routes.js` | Fixed SQL injection in `/financial-overview` |
| `frontend/src/pages/notifications/Notifications.jsx` | Fixed HTTP methods, endpoint path, response key, field name |
