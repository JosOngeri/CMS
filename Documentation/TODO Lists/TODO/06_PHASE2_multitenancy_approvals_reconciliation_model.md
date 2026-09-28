# Phase 2: Multi-Tenancy — ApprovalsRepository, ReconciliationRepository & User Model
**Part of:** Msabato CMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

This file completes Phase 2 of the multi-tenancy isolation work. ApprovalsRepository has an SQL injection bug in addition to missing church scoping. ReconciliationRepository allows cross-church transaction verification. The User model has zero church filtering on all lookups.

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.9 `backend/repositories/ApprovalsRepository.js` — SQL Injection and Missing church_id

- [ ] 🔴 Fix SQL injection in `getAll()` line 22: validate `filters.sort` against an allowlist `['created_at','updated_at','status','priority']` before interpolating into ORDER BY
- [ ] 🟠 Add `churchId` parameter to `createWorkflow(data, churchId)` and include church_id in the INSERT (line 148–158)
- [ ] 🟠 Add `churchId` parameter to `getActiveWorkflows(churchId)` and add `WHERE church_id = $1` (line 160–163)
- [ ] 🟠 Add `churchId` parameter to `getApprovalAnalytics(churchId)` and add `WHERE church_id = $1` (line 165–177)
- [ ] 🟠 Make `church_id` required (not optional) in `getAll`, `getById`, `create`, `updateStatus`, `getPendingCount`, `getByRequester`, `getWithDetails`
- [ ] 🟡 Add check in `updateStatus` that `approverId !== request.requester_id` to prevent self-approval

### 2.10 `backend/repositories/ReconciliationRepository.js` — Missing church_id on Updates

- [ ] 🔴 Add `churchId` to `verifyTransaction(id, status, notes, userId, editHistory, churchId)` and add `AND church_id = $6` to the WHERE clause — otherwise any user can verify any church's transactions
- [ ] 🔴 Add `churchId` to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🟡 Verify `uuid_generate_v4()` function exists in the database schema; if not, replace with `gen_random_uuid()` (available without extension in PostgreSQL 13+)

### 2.11 `backend/models/User.js` — Zero church_id Filtering

- [ ] 🔴 Add `churchId` parameter to `findByEmail(email, churchId)` and add `AND church_id = $2` when churchId is provided
- [ ] 🔴 Add `churchId` parameter to `findByUsername(username, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getAll(limit, offset, churchId)` and add `WHERE church_id = $3`
- [ ] 🔴 Add `churchId` parameter to `getDepartmentMembers(departmentId, churchId)` and add department's church_id join check
- [ ] 🟠 Add soft delete support: add `deletedAt` field to UPDATE instead of hard DELETE
- [ ] 🟡 Add `create(userData, churchId)` — include `church_id` in every INSERT so new users always belong to a church

---

*Previous: `05_PHASE2_multitenancy_taxstatement_security.md` | Next: `07_PHASE3_controllers_security_notifications.md`*
