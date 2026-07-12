# Phase 17 — TESTING
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 17.1 Backend Unit Tests

- [ ] 🟠 Write unit test for `auth.middleware.js` `requireDepartmentPermission`: test correct permission (200), wrong permission (403), missing pool (should not crash after fix)
- [ ] 🟠 Write unit test for `tenantResolver.js`: test valid slug (sets `req.church_id`), invalid slug (404), suspended church (403)
- [ ] 🟠 Write unit test for `reconciliationService.js` `getUnreconciledPayments`: confirm `params` variable is used (regression test for the `pending` bug)
- [ ] 🟠 Write unit test for `BaseRepository.js` `findAll`: confirm column name injection is blocked (SQL returns error for disallowed column names)
- [ ] 🟠 Write unit test for `SearchRepository.js` `globalSearchMembers`: confirm results only include records from the provided `church_id`
- [ ] 🟠 Write unit test for `auth.controller.js` `login`: test account lockout after 5 failed attempts
- [ ] 🟠 Write unit test for `payments.controller.js` `createPayment`: test that `amount <= 0` is rejected with 400
- [ ] 🟡 Write unit test for `treasurySecurity.js` `ipWhitelist`: test exact match allowed, non-listed IP blocked, CIDR range after fix

### 17.2 Backend Integration Tests

- [ ] 🟠 Write integration test: login as church A user, attempt to read church B member — confirm 403
- [ ] 🟠 Write integration test: create a payment as a regular member (should fail with 403 after fix)
- [ ] 🟠 Write integration test: create a security action (blockIP) as a non-admin — confirm 403 after fix
- [ ] 🟠 Write integration test: approve your own approval request — confirm 403 after fix
- [ ] 🟡 Write integration test: full registration flow including email verification
- [ ] 🟡 Write integration test: full treasury transaction with approval workflow

### 17.3 Frontend Unit Tests

- [ ] 🟠 Write test for `useActivityFeed.js`: mount hook, confirm `fetchActivities` is called on mount (tests the auto-fetch useEffect fix)
- [ ] 🟠 Write test for `DataTable.jsx`: select all rows on page 1, go to page 2 — confirm selection is by ID not index (after fix)
- [ ] 🟠 Write test for `ProtectedRoute.jsx`: confirm no `console.log` calls in production build
- [ ] 🟡 Write test for `AuthContext.jsx`: mock a 401 response and confirm token refresh is attempted before logout (after fix)
