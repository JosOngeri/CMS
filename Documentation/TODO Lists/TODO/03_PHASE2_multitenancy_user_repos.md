# Phase 2: Multi-Tenancy — UserRepository & UsersRepository
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

Both user repositories lack `church_id` scoping — meaning user lookups (login, password reset, member directory) can cross church boundaries. Fix all 🔴 items immediately.

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.3 `backend/repositories/UserRepository.js` — No church_id Anywhere

- [ ] 🔴 Add `churchId` param to `findByEmail(email, churchId)` and add `AND church_id = $2` when churchId is provided
- [ ] 🔴 Add `churchId` param to `findByUsername(username, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findByPhone(phone, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findById(id, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` param to `findByResetToken(token, churchId)` — password reset tokens should be scoped to a church
- [ ] 🔴 Add `churchId` as required first parameter to `getMemberDirectory(filters, churchId)` and add `WHERE u.church_id = $1` to the query
- [ ] 🔴 Add `churchId` param to `getUserWithDepartments(id, churchId)` and add church filter to both user and department joins
- [ ] 🔴 Add `churchId` param to `updateUserProfile(id, updates, churchId)` and add `AND church_id = $n` to the WHERE clause
- [ ] 🔴 Add `churchId` param to `assignRole(userId, roleId, churchId)` — confirm user belongs to church before assigning role
- [ ] 🔴 Add `churchId` param to `removeRole(userId, roleId, churchId)` — same check
- [ ] 🔴 Add `churchId` param to `deactivateUser(id, churchId)` and `activateUser(id, churchId)` — add `AND church_id = $2`
- [ ] 🟠 Fix line 96: validate `role` against an allowed list before interpolating into SQL
- [ ] 🟡 Verify `generate_user_slug` PostgreSQL function exists in `complete_schema.sql`; if not, add it

### 2.4 `backend/repositories/UsersRepository.js` — N+1 Query and Wrong Column

- [ ] 🔴 Fix `createUser()` line 156: change `password` column → `password_hash` to match the actual schema column name
- [ ] 🟠 Fix N+1 in `updateUserRoles()` (lines 120–127): replace per-role `SELECT id FROM roles WHERE name = $1` queries inside a loop with a single `SELECT id, name FROM roles WHERE name = ANY($1)` bulk query
- [ ] 🟠 Add `church_id` check to the `DELETE FROM user_roles` statement (line 118) — currently deletes all roles without verifying church ownership
- [ ] 🟠 Add `churchId` param to `findByEmail`, `findByUsername`, `findByResetToken` (lines 8–30) — currently missing church scope
- [ ] 🟠 Add `churchId` param to `updateResetToken` and `updatePassword` (lines 32–46)
- [ ] 🟡 Make `church_id` non-optional in `getActiveUsers`, `getAllWithRoles`, `getUserByIdWithRoles` — change `= null` defaults to required params

---

*Previous: `02_PHASE2_multitenancy_base_search.md` | Next: `04_PHASE2_multitenancy_treasury_dashboard.md`*
