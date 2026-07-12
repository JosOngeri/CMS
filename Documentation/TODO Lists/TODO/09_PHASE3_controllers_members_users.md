# Phase 3: Controller Auth — Members & Users Controllers
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

The Members controller allows any authenticated user to delete members (permanent data loss risk). The Users controller uses two different repositories inconsistently and has no role checks on user management operations.

---

## PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### 3.5 `backend/controllers/members.controller.js` — No Auth on Delete

- [ ] 🔴 Add `requireRole(['Super Admin'])` middleware to `deleteMember` route — currently any authenticated user can delete any member
- [ ] 🔴 Change `deleteMember` to a SOFT delete: set `is_active = false, deleted_at = NOW()` instead of `DELETE FROM` — prevents permanent data loss
- [ ] 🟠 Add `church_id` filter to ALL member queries: `getAllMembers`, `getMemberById`, `createMember`, `updateMember` — pass `req.user.church_id`
- [ ] 🟠 Add input validation on `createMember`: require `first_name` and `last_name` (strings, 1–100 chars), validate `email` format, validate `phone` against E.164 pattern
- [ ] 🟠 Add duplicate check on `createMember`: query for existing member with same `(email, church_id)` or `(phone, church_id)` and return 409 if found
- [ ] 🟡 Add audit log insert on every member create/update/soft-delete recording `(member_id, changed_by, change_type, church_id, timestamp)`

### 3.6 `backend/controllers/users.controller.js` — Inconsistent Repository and No Auth

- [ ] 🔴 Fix inconsistent repository naming: pick ONE (`UserRepository` or `UsersRepository`) and use it everywhere — line 24 uses `UsersRepository` while line 189 uses `UserRepository`
- [ ] 🔴 Remove duplicate code blocks in `getUserById` (lines 59–80) and `createUser` (lines 116–126) — these appear to be copy-paste errors; consolidate into single implementation paths
- [ ] 🔴 Add `requireRole(['Super Admin'])` to `createUser`, `deleteUser`, `updateUser` routes — currently any user can manage other users
- [ ] 🟠 Add validation on `createUser`: require `email` (valid format), `password` (min 12 chars, complexity check), `role` (must be in allowed enum)
- [ ] 🟠 Add privilege escalation prevention: a user cannot assign a role higher than their own — if requester is `First Elder`, they cannot create `Super Admin` or `Pastor` users
- [ ] 🟠 Pass `req.user.church_id` to all repository calls in `getAllUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`
- [ ] 🟡 Add audit log on role assignment: record `(target_user_id, role_assigned, assigned_by, church_id, timestamp)`

---

*Previous: `08_PHASE3_controllers_approvals_payments.md` | Next: `10_PHASE3_controllers_search_auth_dashboard_treasury.md`*
