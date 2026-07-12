# Phase 3: Controller Auth — Security & Notifications Controllers
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

Phase 3 fixes authorization gaps at the controller level. Even with Phase 2 church_id fixes in place, controllers that don't check *who* is making the request allow any authenticated user to perform admin-only actions. This file covers the Security and Notifications controllers.

---

## PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### 3.1 `backend/controllers/security.controller.js` — No Auth on Any Endpoint

- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `blockIP` route — currently ANY authenticated user can block IPs
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `unblockIP` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `revokeAllUserSessions` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `updateSecuritySettings` route
- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to the `getSecuritySettings` route
- [ ] 🟠 Add `req.user.church_id` to all repository calls in this controller so security operations are scoped per church
- [ ] 🟠 Add input validation on `blockIP`: verify `ipAddress` matches `^(\d{1,3}\.){3}\d{1,3}$` before passing to repository
- [ ] 🟠 Add `church_id` filter to `getSecurityLogs`, `getFailedLoginAttempts`, `getBlockedIPs` calls
- [ ] 🟡 Add audit log entry to every security action (block/unblock/settings change) recording `(action, performed_by, ip_affected, church_id, timestamp)`

### 3.2 `backend/controllers/notifications.controller.js` — Anyone Can Create Notifications

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'First Elder'])` middleware to `createNotification` route — currently any user can create notifications for any other user
- [ ] 🔴 In `markAsRead(notificationId)`: add `AND user_id = req.user.id` to the query so users can only mark their own notifications as read
- [ ] 🔴 In `deleteNotification(notificationId)`: add `AND user_id = req.user.id` to the query — ownership check
- [ ] 🟠 Add input validation on `limit` parameter in `getNotifications` — cap at 100, reject negative values
- [ ] 🟠 Sanitize notification `title` and `message` fields to prevent stored XSS
- [ ] 🟡 Add rate limiting on `createNotification` endpoint (max 50 notifications per minute per user)

---

*Previous: `06_PHASE2_multitenancy_approvals_reconciliation_model.md` | Next: `08_PHASE3_controllers_approvals_payments.md`*
