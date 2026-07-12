# Phase 2: Multi-Tenancy — TreasuryRepository & DashboardRepository
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

Financial data is the most sensitive data in the system. These two repositories have optional or missing `church_id` parameters, meaning financial records and dashboard statistics can bleed between churches.

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.5 `backend/repositories/TreasuryRepository.js` — Optional church_id Everywhere

- [ ] 🔴 Fix `getAccountBalance(accountId, churchId)`: add `AND church_id = $2` — currently can access any church's account balance by ID
- [ ] 🔴 Fix `createAccount(data, churchId)`: complete the incomplete function (lines 193–200) and add `church_id` to the INSERT columns
- [ ] 🟠 Make `church_id` required (remove `= null` defaults) in: `getAccounts`, `getIncomeCategories`, `getExpenseCategories`, `getFinancialSummary`, `getTotalBalance`
- [ ] 🟠 Fix line 163: parameter numbering uses `params.length + 1` inside a loop which can produce wrong `$n` numbers — use a `paramCount` counter variable instead
- [ ] 🟡 Add UNIQUE constraint check before `createAccount` to prevent duplicate account numbers per church

### 2.6 `backend/repositories/DashboardRepository.js` — All church_id Optional

- [ ] 🟠 Make `churchId` required (not optional) in ALL 17 methods: `getSummary`, `getAnnouncementCount`, `getMemberCount`, `getEventCount`, `getFinancialSummary`, `getPendingApprovals`, `getRecentPaymentsActivity`, `getRecentAnnouncements`, `getUpcomingEvents`, `getRecentMembers`, `getUserDepartmentAssignments`, `getUserPendingApprovals`, `getUserUpcomingEvents`, `getUserContributions`, `getUserAttendanceRate`, `getUserContributionRate`, `getUserActivityLevel`
- [ ] 🟠 In `getRecentPaymentsActivity` (line 104): add `AND m.church_id = p.church_id` to the members JOIN to prevent cross-church member name leakage
- [ ] 🟠 In `getRecentAnnouncements` (line 125): add `AND u.church_id = a.church_id` to the users JOIN
- [ ] 🟠 In `getUserDepartmentAssignments` (line 184): add `JOIN departments d ON dm.department_id = d.id AND d.church_id = $2` to scope department membership to the correct church

---

*Previous: `03_PHASE2_multitenancy_user_repos.md` | Next: `05_PHASE2_multitenancy_taxstatement_security.md`*
