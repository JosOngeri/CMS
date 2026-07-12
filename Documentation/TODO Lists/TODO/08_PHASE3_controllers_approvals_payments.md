# Phase 3: Controller Auth — Approvals & Payments Controllers
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

The Approvals controller has a stub delegation function and allows any user to approve requests (including their own). The Payments controller allows any authenticated user to create and modify financial records. Both are critical authorization gaps.

---

## PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### 3.3 `backend/controllers/approvals.controller.js` — Delegation Stub and No Auth

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer'])` to `approveRequest` and `rejectRequest` routes — currently any user can approve any request
- [ ] 🔴 Implement `delegateRequest()` properly (line 199 is a stub): save `delegateTo` to the approval record's `delegated_to` column, send a notification to the delegate, update status to `'delegated'`
- [ ] 🔴 Add self-approval prevention: in `approveRequest`, check `approval.requester_id !== req.user.id` — if equal, return 403 `{ success: false, error: 'Cannot approve your own request' }`
- [ ] 🟠 Add church_id scope to all repository calls: pass `req.user.church_id` to every `ApprovalsRepository` method
- [ ] 🟠 Add input validation on `createApproval`: require `title` (string, 3–255 chars), `description` (string, 10–5000 chars), `request_type` (enum check)
- [ ] 🟠 Fire a notification when approval status changes — call `NotificationService.sendRealTimeNotification(requester_id, {...})` inside `approveRequest` and `rejectRequest`
- [ ] 🟡 Wire the workflow engine that is already imported (line 1) — on `createWorkflow`, actually call the engine to register the workflow steps

### 3.4 `backend/controllers/payments.controller.js` — No Role Check on Payment Creation

- [ ] 🔴 Verify `POST /` in `payments.routes.js` has a role check — currently any authenticated user can create payment records; add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` or at minimum `authenticateToken`
- [ ] 🔴 Add `church_id` scoping to all `getPayments`, `createPayment`, `updatePaymentStatus`, `getPledges`, `createPledge`, `addPledgePayment` calls — pass `req.user.church_id` to every repository method
- [ ] 🔴 In `updatePaymentStatus`: add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` — currently any user can change a payment's status
- [ ] 🟠 Add input validation on `createPayment`: require `amount` > 0 (number), `payment_date` (ISO date), `phone_number` matches E.164 format if provided, `payment_items` is non-empty array
- [ ] 🟠 Add validation that `status` in `updatePaymentStatus` is one of `['pending','completed','failed','cancelled','refunded']`
- [ ] 🟠 Add M-Pesa webhook signature verification: validate `X-Safaricom-Signature` header before processing any M-Pesa callback
- [ ] 🟡 Add duplicate payment prevention: check for identical `(member_id, amount, payment_date, church_id)` within a 5-minute window before inserting
- [ ] 🟡 Encrypt `phone_number` field at rest using `pgcrypto` or application-level AES before storing

---

*Previous: `07_PHASE3_controllers_security_notifications.md` | Next: `09_PHASE3_controllers_members_users.md`*
