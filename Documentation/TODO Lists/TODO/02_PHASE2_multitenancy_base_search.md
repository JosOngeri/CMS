# Phase 2: Multi-Tenancy — BaseRepository & SearchRepository
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

These fixes close the most dangerous security gap in the system: **cross-church data leakage**. Without `church_id` on every query, any authenticated user can read any other church's data. Fix all 🔴 items first.

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.1 `backend/repositories/BaseRepository.js` — SQL Injection via Column Names

- [ ] 🔴 Go to `findAll()` line 36 — `key` from `Object.entries(filters)` is interpolated directly into SQL (`${key} = $n`); add a column whitelist check before using any filter key: `const allowedColumns = await this.getTableColumns(); if (!allowedColumns.includes(key)) continue;`
- [ ] 🔴 Go to `create()` line 50 and `update()` line 66 — same column-name injection risk; add the same whitelist check for all keys from `Object.keys(data)`
- [ ] 🟠 Add `church_id` support to `create(data, churchId)` — if `churchId` is provided, append it to the INSERT columns and values
- [ ] 🟠 Make `church_id` parameter REQUIRED (not optional) in `findById`, `findAll`, `update`, and `delete` — change default `= null` to a required positional argument
- [ ] 🟡 Add a `beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` method set to the base class so child repositories can do multi-step operations safely
- [ ] 🟡 Add `softDelete(id, churchId)` method that sets `is_active = false, deleted_at = NOW()` instead of hard-deleting

### 2.2 `backend/repositories/SearchRepository.js` — No church_id on Any Query

- [ ] 🔴 Add `churchId` parameter to ALL 15 search functions: `saveSearch`, `getSavedSearches`, `deleteSavedSearch`, `getMemberSuggestions`, `getContentSuggestions`, `getDepartmentSuggestions`, `searchMembers`, `searchContent`, `searchDepartments`, `searchDocuments`, `searchUsers`, `globalSearchMembers`, `globalSearchDocuments`, `globalSearchEvents`, `globalSearchAnnouncements`, `globalSearchDepartments`
- [ ] 🔴 Add `AND church_id = $1` (or `AND m.church_id = $1`) to EVERY query in SearchRepository
- [ ] 🔴 Fix line 125: `globalSearchMembers` queries the `users` table; change to `members` table — users are platform accounts, members are church-specific people
- [ ] 🔴 Fix line 135: `globalSearchDocuments` uses `name` column; change to `title` column
- [ ] 🔴 Fix ILIKE pattern — queries pass `searchQuery` directly; wrap in wildcards: `$2` value should be `%${query}%` not just `query`
- [ ] 🟠 Replace hardcoded `LIMIT 5` and `LIMIT 20` with a `limit` parameter defaulting to 20
- [ ] 🟡 Add a `search_history` table insert in `saveSearch` that records `(user_id, church_id, query, created_at)` for search analytics

---

*Previous: `01_PHASE1_runtime_crashes.md` | Next: `03_PHASE2_multitenancy_user_repos.md`*
