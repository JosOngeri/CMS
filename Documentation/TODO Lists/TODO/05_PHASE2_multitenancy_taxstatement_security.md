# Phase 2: Multi-Tenancy — TaxStatementRepository & SecurityRepository
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

Tax statements contain sensitive financial PII. Security logs contain IP addresses and authentication data. Both repositories currently have zero church scoping — any user can see any church's data. Fix all 🔴 items immediately.

---

## PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION (church_id Everywhere)

### 2.7 `backend/repositories/TaxStatementRepository.js` — All Methods Missing church_id

- [ ] 🔴 Add `churchId` parameter to `getAllTaxStatements(filters, churchId)` and add `WHERE ts.church_id = $1` to the query
- [ ] 🔴 Add `churchId` parameter to `getTaxStatementById(id, churchId)` and add `AND ts.church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getTaxDeductiblePayments(memberId, taxYear, churchId)` and add `AND p.church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `getMemberById(memberId, churchId)` and add `AND church_id = $2`
- [ ] 🔴 Add `churchId` parameter to `generateTaxStatement(memberId, taxYear, generatedBy, churchId)` and propagate it through all sub-calls
- [ ] 🟠 Fix line 157 variable name bug: `totalAmount` → `total_amount` to match the destructured parameter name
- [ ] 🟡 Add a check in `checkExistingStatement(memberId, taxYear, churchId)`: if statement already exists, return it instead of allowing a duplicate insert

### 2.8 `backend/repositories/SecurityRepository.js` — All Global, No church_id

- [ ] 🔴 Add `churchId` parameter to `getSecurityLogs(limit, churchId)` and add `WHERE church_id = $1`
- [ ] 🔴 Add `churchId` parameter to `getFailedLoginAttempts(churchId)` and add `WHERE church_id = $1`
- [ ] 🔴 Add `churchId` parameter to `getBlockedIPs(churchId)` — IP blocks should be per-church
- [ ] 🔴 Add `churchId` parameter to `blockIP(ipAddress, reason, blockedBy, churchId)` and include it in the INSERT
- [ ] 🔴 Add `churchId` parameter to `unblockIP(ipAddress, churchId)` and add `AND church_id = $2` to the DELETE
- [ ] 🔴 Fix `getSecuritySettings(churchId)` (line 60): change hardcoded `WHERE id = 1` → `WHERE church_id = $1` — settings must be per-church
- [ ] 🔴 Fix `getSecurityAnalytics(churchId)`: add church_id filter; remove line 84 hardcoded `85 as compliance_score` — replace with real calculation
- [ ] 🔴 Fix line 93 `getRecentSecurityEvents`: change column `timestamp` → `created_at` to match actual column name
- [ ] 🟠 Add `churchId` parameter to `getActiveSessions(userId, churchId)` and `revokeAllUserSessions(userId, churchId)` — session management must respect church scope

---

*Previous: `04_PHASE2_multitenancy_treasury_dashboard.md` | Next: `06_PHASE2_multitenancy_approvals_reconciliation_model.md`*
