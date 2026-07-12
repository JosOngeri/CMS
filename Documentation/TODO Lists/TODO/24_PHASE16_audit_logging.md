# Phase 16 — AUDIT LOGGING (Missing Everywhere)
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 16.1 Create Centralized Audit Service

- [x] 🟠 Create `backend/services/auditService.js` with a `log(churchId, userId, action, tableName, recordId, oldValue, newValue)` function that inserts into `audit_log`
- [x] 🟠 Create the `audit_log` table if not already in schema: `id UUID`, `church_id UUID`, `user_id UUID`, `action VARCHAR(50)`, `table_name VARCHAR(100)`, `record_id UUID`, `old_value JSONB`, `new_value JSONB`, `ip_address INET`, `user_agent TEXT`, `created_at TIMESTAMPTZ`
- [x] 🟠 Add indexes on `audit_log`: `(church_id, created_at)`, `(user_id, created_at)`, `(table_name, record_id)`

### 16.2 Wire Audit Service into Controllers

- [x] 🟠 Call `auditService.log(...)` in `members.controller.js` `createMember`, `updateMember`, `deleteMember`
- [x] 🟠 Call `auditService.log(...)` in `users.controller.js` `createUser`, `updateUser`, `deleteUser`
- [x] 🟠 Call `auditService.log(...)` in `treasury.controller.js` `createTransaction`, `approveTransaction`
- [x] 🟠 Call `auditService.log(...)` in `approvals.controller.js` `approveRequest`, `rejectRequest`, `delegateRequest`
- [x] 🟠 Call `auditService.log(...)` in `security.controller.js` `blockIP`, `unblockIP`, `updateSecuritySettings`
- [x] 🟠 Call `auditService.log(...)` in `payments.controller.js` `createPayment`, `updatePaymentStatus`
- [x] 🟡 Expose audit log to authorized users: `GET /api/audit-logs?table=members&recordId=xxx` — already mounted in `app.js`, verify the controller and repository are implemented
