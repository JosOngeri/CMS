# Phase 20 — FINAL VERIFICATION CHECKLIST
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 20.1 Security Verification

- [ ] 🔴 Confirm `pool` is imported in `auth.js` — check line 1 or 2 of the file after the fix
- [ ] 🔴 Confirm `req.church_id` (not `req.churchId`) is used in `identityGuard.js` line 44
- [ ] 🔴 Confirm `tenantResolver.js` uses parameterized queries for `SET LOCAL app.current_church_id`
- [ ] 🔴 Test that a user from Church A cannot see members of Church B after all church_id fixes
- [ ] 🔴 Test that any unauthenticated request to a previously unguarded route (`/api/settings`, `/api/gallery`, `/api/events`) now returns 401
- [ ] 🔴 Test that a regular member cannot approve an approval request
- [ ] 🔴 Test that a regular member cannot create a payment status change
- [ ] 🔴 Test that the `reconciliationService.getUnreconciledPayments` function does not crash (was `pending` bug)

### 20.2 Data Integrity Verification

- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM members WHERE church_id IS NULL` — should be 0 after fixes
- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM payments WHERE church_id IS NULL` — should be 0
- [ ] 🟠 Run a query: `SELECT COUNT(*) FROM settings WHERE church_id IS NULL` — should be 0 after settings fix
- [ ] 🟠 Verify all 30 default settings exist for each church after the migration
- [ ] 🟡 Run `EXPLAIN ANALYZE` on the most common search query to confirm `church_id` index is being used

### 20.3 Frontend Verification

- [ ] 🟠 Open the Network tab and confirm no frontend API calls use plain `axios` (all should go through AuthContext `api` instance)
- [ ] 🟠 Confirm DataTable row selection persists correctly across page changes after the ID-based fix
- [ ] 🟠 Confirm `useActivityFeed` auto-loads data on mount (console should not show empty effects)
- [ ] 🟡 Check browser console for zero React `exhaustive-deps` warnings after dependency array fixes
- [ ] 🟡 Verify `ProtectedRoute` logs nothing to console in a production build
