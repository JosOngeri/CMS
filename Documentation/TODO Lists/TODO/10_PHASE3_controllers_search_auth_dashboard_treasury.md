# Phase 3: Controller Auth — Search, Auth, Dashboard & Treasury Controllers
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

This file completes Phase 3. It covers the four remaining controllers with authorization gaps: Search (returns all-church results), Auth (missing password validation and lockout), Dashboard (stub values, no church_id), and Treasury (no financial authorization guard).

---

## PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### 3.7 `backend/controllers/search.controller.js` — SQL Injection and No church_id

- [ ] 🔴 Validate `query` length in `globalSearch`: add maximum 200 characters check alongside the existing 2-character minimum
- [ ] 🔴 Pass `req.user.church_id` to ALL search repository calls — currently searches return results from all churches
- [ ] 🟠 Add rate limiting specifically to `globalSearch` and `advancedSearch`: max 30 requests per minute per user
- [ ] 🟠 Add validation on `advancedSearch` filters: validate each filter key against an allowlist before passing to repository
- [ ] 🟡 Add search query sanitization: strip SQL metacharacters before constructing ILIKE queries
- [ ] 🟡 Log search queries to a `search_history` table `(user_id, church_id, query, result_count, created_at)` for analytics

### 3.8 `backend/controllers/auth.controller.js` — Multiple Critical Gaps

- [ ] 🔴 Wire up `validatePasswordStrength` on registration: it is imported on line 12 but never called; call it in `register()` before creating the user and return 400 if it fails
- [ ] 🔴 Replace direct SQL query in `register()` (lines 117–124) with the appropriate repository method — using raw queries bypasses validation layers
- [ ] 🔴 Add account lockout: after 5 failed login attempts for the same email, set `locked_until = NOW() + INTERVAL '15 minutes'` and return 429
- [ ] 🟠 Add check in `login()`: if `user.locked_until > NOW()`, return 429 with remaining lockout time
- [ ] 🟠 Validate `email` and `password` are present in `login()` before querying DB — return 400 if either is missing
- [ ] 🟠 On successful login, reset `failed_login_attempts` counter to 0
- [ ] 🟠 Add email verification flow: on `register()`, set `email_verified = false` and send a verification email with a signed token; add `POST /verify-email` handler that sets `email_verified = true`
- [ ] 🟡 In `logout()`: invalidate the refresh token in the DB (set `used = true`) not just clear the cookie — otherwise the refresh token can still be used after logout
- [ ] 🟡 Add `church_id` to the registration flow: require `church_id` or `church_slug` in the registration body and associate the new user with that church

### 3.9 `backend/controllers/dashboard.controller.js` — Stubs and No church_id

- [ ] 🔴 Add validation that `req.user.church_id` exists before any dashboard query — return 403 if missing
- [ ] 🟠 Pass `req.user.church_id` to ALL `DashboardRepository` method calls (currently missing in `getStats`, `getActivity`, `getPersonalStats`, `getPersonalStatus`, `getPersonalActivity`)
- [ ] 🟠 Fix line 115: change `activities.splice(limit)` → `activities.slice(0, limit)` — `splice` mutates the array in place and removes items; `slice` is the correct non-mutating version
- [ ] 🟠 Add `limit` validation in `getActivity` and `getPersonalActivity`: clamp between 1 and 100, reject negative values
- [ ] 🟠 Implement `getSystemHealth()` fully: instead of hardcoded stub values, query real metrics: DB connection pool status, last migration run date, memory usage, uptime, error rate from logs
- [ ] 🟡 Add Redis caching to `getStats()` with 60-second TTL — these aggregation queries are expensive and run on every dashboard load

### 3.10 `backend/controllers/treasury.controller.js` — No Authorization on Financial Data

- [ ] 🔴 Add `hasTreasuryAccess()` middleware from `treasurySecurity.js` to ALL treasury routes — currently treasury endpoints have no authorization guard beyond `identityGuard`
- [ ] 🔴 Add validation on `createTransaction`: require `amount` > 0, `transaction_type` in `['income','expense','transfer']`, `account_id` present
- [ ] 🔴 Add `church_id` to all repository calls — pass `req.user.church_id` to every `TreasuryRepository` call
- [ ] 🟠 Add double-entry validation on `createTransaction`: every income must credit an account, every expense must debit — reject if the accounting equation doesn't balance
- [ ] 🟠 Add audit logging to every financial write: INSERT into `audit_log` `(table_name, record_id, action, performed_by, church_id, old_value, new_value, timestamp)`
- [ ] 🟡 Add approval requirement for transactions above a configurable threshold (default `KES 50,000`): auto-create an approval request instead of directly committing the transaction

---

*Previous: `09_PHASE3_controllers_members_users.md`*
*After completing all Phase 3 tasks, continue with Phase 4 (Route-Level Gaps) in the master file: `MASTER_TODO_LIST.md` starting at line 292*
