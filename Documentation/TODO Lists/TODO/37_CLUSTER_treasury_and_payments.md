# CLUSTER — Treasury and Payments
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: TreasuryRepository, TreasuryDashboard, TreasurerDashboard, treasury.controller.js, treasury.routes.js, payments.controller.js, payments.routes.js, PaymentsRepository, M-Pesa, reconciliation, tax statements, receipts, budgets, funds, campaigns.

---

## From PHASE 1 — CRITICAL RUNTIME CRASHES

### Phase 1.2 — `backend/services/reconciliationService.js` — Wrong Variable Name

- [x] 🔴 Open `backend/services/reconciliationService.js`, go to line 188, change `pool.query(query, pending)` → `pool.query(query, params)` — `pending` is not defined in that scope; this crashes every call to `getUnreconciledPayments`
- [x] 🔴 Go to line 220 in the same file, change `WHERE reconciled IS NULL` → `WHERE reconciled_at IS NULL` — the column name is `reconciled_at`, not `reconciled`; wrong name causes SQL error
- [x] 🟠 Add `church_id` parameter to `getPaymentDetails(paymentId, churchId)` and add `AND church_id = $2` to the query so cross-tenant payment lookup is impossible
- [x] 🟠 Wrap the reconciliation update in a `BEGIN / COMMIT / ROLLBACK` transaction block to prevent partial state if the process crashes mid-reconciliation
- [x] 🟡 Add an `audit_log` INSERT inside `reconcilePayment()` that records `(payment_id, church_id, reconciled_by, reconciled_at, action='reconcile')` for financial audit trail
- [x] 🟡 Add row-level locking (`SELECT ... FOR UPDATE`) before modifying a payment's reconcile state to prevent race conditions when two users reconcile simultaneously

---

## From PHASE 2 — CRITICAL SECURITY: MULTI-TENANCY ISOLATION

### Phase 2.5 — `backend/repositories/TreasuryRepository.js` — Optional church_id Everywhere

- [x] 🔴 Fix `getAccountBalance(accountId, churchId)`: add `AND church_id = $2` — currently can access any church's account balance by ID
- [x] 🔴 Fix `createAccount(data, churchId)`: complete the incomplete function (lines 193–200) and add `church_id` to the INSERT columns
- [x] 🟠 Make `church_id` required (remove `= null` defaults) in: `getAccounts`, `getIncomeCategories`, `getExpenseCategories`, `getFinancialSummary`, `getTotalBalance`
- [x] 🟠 Fix line 163: parameter numbering uses `params.length + 1` inside a loop which can produce wrong `$n` numbers — use a `paramCount` counter variable instead
- [x] 🟡 Add UNIQUE constraint check before `createAccount` to prevent duplicate account numbers per church

### Phase 2.7 — `backend/repositories/TaxStatementRepository.js` — All Methods Missing church_id

- [x] 🔴 Add `churchId` parameter to `getAllTaxStatements(filters, churchId)` and add `WHERE ts.church_id = $1` to the query
- [x] 🔴 Add `churchId` parameter to `getTaxStatementById(id, churchId)` and add `AND ts.church_id = $2`
- [x] 🔴 Add `churchId` parameter to `getTaxDeductiblePayments(memberId, taxYear, churchId)` and add `AND p.church_id = $2`
- [x] 🔴 Add `churchId` parameter to `getMemberById(memberId, churchId)` and add `AND church_id = $2`
- [x] 🔴 Add `churchId` parameter to `generateTaxStatement(memberId, taxYear, generatedBy, churchId)` and propagate it through all sub-calls
- [x] 🟠 Fix line 157 variable name bug: `totalAmount` → `total_amount` to match the destructured parameter name
- [x] 🟡 Add a check in `checkExistingStatement(memberId, taxYear, churchId)`: if statement already exists, return it instead of allowing a duplicate insert

### Phase 2.10 — `backend/repositories/ReconciliationRepository.js` — Missing church_id on Updates

- [x] 🔴 Add `churchId` to `verifyTransaction(id, status, notes, userId, editHistory, churchId)` and add `AND church_id = $6` to the WHERE clause — otherwise any user can verify any church's transactions
- [x] 🔴 Add `churchId` to `findById(id, churchId)` and add `AND church_id = $2`
- [x] 🟡 Verify `uuid_generate_v4()` function exists in the database schema; if not, replace with `gen_random_uuid()` (available without extension in PostgreSQL 13+)

---

## From PHASE 3 — CRITICAL SECURITY: CONTROLLER AUTHORIZATION GAPS

### Phase 3.4 — `backend/controllers/payments.controller.js` — No Role Check on Payment Creation

- [x] 🔴 Verify `POST /` in `payments.routes.js` has a role check — currently any authenticated user can create payment records; add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` or at minimum `authenticateToken`
- [x] 🔴 Add `church_id` scoping to all `getPayments`, `createPayment`, `updatePaymentStatus`, `getPledges`, `createPledge`, `addPledgePayment` calls — pass `req.user.church_id` to every repository method
- [x] 🔴 In `updatePaymentStatus`: add `requireRole(['Super Admin', 'Pastor', 'Treasurer'])` — currently any user can change a payment's status
- [x] 🟠 Add input validation on `createPayment`: require `amount` > 0 (number), `payment_date` (ISO date), `phone_number` matches E.164 format if provided, `payment_items` is non-empty array
- [x] 🟠 Add validation that `status` in `updatePaymentStatus` is one of `['pending','completed','failed','cancelled','refunded']`
- [x] 🟠 Add M-Pesa webhook signature verification: validate `X-Safaricom-Signature` header before processing any M-Pesa callback
- [x] 🟡 Add duplicate payment prevention: check for identical `(member_id, amount, payment_date, church_id)` within a 5-minute window before inserting
- [x] 🟡 Encrypt `phone_number` field at rest using `pgcrypto` or application-level AES before storing

### Phase 3.10 — `backend/controllers/treasury.controller.js` — No Authorization on Financial Data

- [x] 🔴 Add `hasTreasuryAccess()` middleware from `treasurySecurity.js` to ALL treasury routes — currently treasury endpoints have no authorization guard beyond `identityGuard`
- [ ] 🔴 Add validation on `createTransaction`: require `amount` > 0, `transaction_type` in `['income','expense','transfer']`, `account_id` present
- [ ] 🔴 Add `church_id` to all repository calls — pass `req.user.church_id` to every `TreasuryRepository` call
- [ ] 🟠 Add double-entry validation on `createTransaction`: every income must credit an account, every expense must debit — reject if the accounting equation doesn't balance
- [ ] 🟠 Add audit logging to every financial write: INSERT into `audit_log` `(table_name, record_id, action, performed_by, church_id, old_value, new_value, timestamp)`
- [ ] 🟡 Add approval requirement for transactions above a configurable threshold (default `KES 50,000`): auto-create an approval request instead of directly committing the transaction

---

## From PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

### Phase 4.2 — `backend/routes/payments.routes.js` — No Role on POST /

- [ ] 🔴 Add `requireRole(['Super Admin', 'Pastor', 'Treasurer', 'First Elder'])` to `POST /` — any authenticated user currently can create a payment record
- [ ] 🟠 Add church_id filter note in comments for all routes so future developers know it must be passed from controller

---

## From PHASE 12 — M-PESA AND PAYMENT INTEGRATION

### Phase 12.1 — M-Pesa Webhook Security

- [ ] 🔴 Add signature verification to `POST /api/mpesa/callback`: verify `X-Safaricom-Signature` header using Safaricom's public key before processing any callback data
- [ ] 🔴 Add `identityGuard` or IP whitelist to M-Pesa callback endpoint — only Safaricom IPs should be able to hit this endpoint
- [ ] 🟠 Store raw callback payload in `mpesa_raw_logs` table before processing so failed processing can be retried
- [ ] 🟠 Add idempotency: check `merchant_request_id` against existing records before inserting to prevent duplicate processing
- [ ] 🟡 Add M-Pesa STK push result handler: update payment status when push succeeds or fails

### Phase 12.2 — Payment Analytics

- [ ] 🟠 Implement `GET /api/payments/analytics` endpoint using real DB aggregations grouped by month
- [ ] 🟠 Implement `GET /api/payments/trends` endpoint returning 12-month giving trend data
- [ ] 🟡 Add `GET /api/payments/summary` breakdown by payment category (tithe, offering, building fund, etc.)
- [ ] 🟡 Implement refund flow: `POST /:paymentId/refund` → creates pending refund, `POST /refunds/:id/approve` → marks original payment as refunded and updates account balance

---

## From PHASE 13 — REPORTS AND ANALYTICS

### Phase 13.1 — Treasury Reports

- [ ] 🟠 Implement `GET /api/treasury/reports/trial-balance` with real double-entry accounting query: debit total = credit total assertion
- [ ] 🟠 Implement `GET /api/treasury/reports/income-statement` grouped by category for a date range
- [ ] 🟠 Implement `GET /api/treasury/reports/balance-sheet` showing assets, liabilities, and equity
- [ ] 🟠 Implement `GET /api/treasury/reports/cash-flow` showing operating, investing, and financing cash flows
- [ ] 🟠 Implement `GET /api/treasury/reports/fund-balance` per fund/campaign
- [ ] 🟡 Add PDF export for each report using `pdfkit` or `puppeteer` on the backend
- [ ] 🟡 Add Excel export for each report using `exceljs`

---

## From PHASE 16 — AUDIT LOGGING

### Phase 16.2 — Wire Audit Service into Controllers

- [ ] 🟠 Call `auditService.log(...)` in `treasury.controller.js` `createTransaction`, `approveTransaction`
- [ ] 🟠 Call `auditService.log(...)` in `payments.controller.js` `createPayment`, `updatePaymentStatus`

---

## From PHASE 21 — DASHBOARD PAGES: CONCRETE FIXES

### Phase 21.2 — `TreasuryDashboard.jsx` — Hardcoded Mock Financial Stats

- [ ] 🔴 Remove hardcoded mock stats on lines 53–60 of `TreasuryDashboard.jsx` (comment says "Use mock data for now since treasury stats endpoint doesn't exist") — replace with a real `GET /api/treasury/summary` call that returns `{ totalIncome, totalExpenses, netIncome, fundBalance }`
- [ ] 🔴 Implement `GET /api/treasury/summary` backend endpoint if it doesn't exist — should aggregate totals from `transactions` table filtered by `church_id` and optionally a date range
- [ ] 🟠 Fix hardcoded financial stats: `totalIncome`, `totalExpenses`, `netIncome`, `fundBalance`, `pendingExpenses`, `budgetVariance` must all come from the API, not literals
- [ ] 🟠 Implement `transactions` tab content in `TreasuryDashboard.jsx` — fetch from `GET /api/treasury/transactions` and render a filterable, paginated table
- [ ] 🟠 Implement `budgets` tab content — fetch from `GET /api/treasury/budgets` and render budget cards with progress bars
- [ ] 🟠 Implement `collections` tab content — fetch from `GET /api/payments?status=completed` grouped by category
- [ ] 🟠 Implement `reports` tab content — render links to trial balance, income statement, balance sheet reports with date range pickers
- [ ] 🟡 Fix quick-action links: `/dashboard/payments/process` and `/treasury/budgets/create` — verify these routes exist in `dashboard.routes.jsx` or update to correct paths

### Phase 21.3 — `TreasurerDashboard.jsx` — Backend Returns All Zeros

- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialStats()` method (lines 285–292) — it returns hardcoded zeros; replace with real queries: `SELECT SUM(amount) FROM payments WHERE church_id = $1 AND payment_date >= date_trunc('month', NOW())`
- [ ] 🔴 Fix `dashboard.controller.js` `getFinancialHealth()` method (lines 305–308) — returns hardcoded zeros; implement real calculation: `budget_utilization = actual_spend / budget_total * 100`, `collection_rate = collected / expected * 100`
- [ ] 🔴 Fix `dashboard.controller.js` transactions endpoint (returns empty array) — implement `getRecentTransactions()` using `DashboardRepository.getRecentPaymentsActivity(10, churchId)`
- [ ] 🟠 Fix hardcoded `75%` health indicator on line 171 of `TreasurerDashboard.jsx` — calculate from real `financialHealth` API response: `Math.round((budgetUtilization + collectionRate) / 2)`
- [ ] 🟠 Implement `transactions` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `budgets` tab in `TreasurerDashboard.jsx` with real data
- [ ] 🟠 Implement `reports` tab with PDF/Excel export buttons

---

## From PHASE 6 (Second Pass — lines 1497+) — Backend Repositories Cleanup

### Phase 6.1 — backend/repositories/TreasuryRepository.js (938 lines — needs splitting)

- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/AssetRepository.js and move all asset methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/VendorRepository.js and move all vendor methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/FundRepository.js and move all fund methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/AccountRepository.js and move all account methods
- [ ] 🔴 TreasuryRepository.js — Create backend/repositories/BudgetLineRepository.js and move all budget line methods
- [ ] 🟠 Update all references to TreasuryRepository throughout controllers and services
- [ ] 🟠 Confirm all new split repositories still add church_id filters
- [ ] 🟡 Delete original TreasuryRepository.js once all methods are migrated

### Phase 6.6 — backend/repositories/MemberGivingRepository.js

- [ ] 🟠 Fix N+1 query patterns — consolidate correlated subqueries into JOINs
- [ ] 🟠 Add church_id filter to all queries
- [ ] 🟡 Add getTopGivers(churchId, year, limit) method

---

## From PHASE 7 (Second Pass — lines 1540+) — Backend Services Cleanup

### Phase 7.1 — backend/services/reconciliationService.js

- [ ] 🔴 Fix line 188 — define pending variable (likely missing DB query result)
- [ ] 🔴 Add try/catch around full reconciliation flow
- [ ] 🔴 Write unit test for reconciliation logic
- [ ] 🟠 Add rollback mechanism if reconciliation fails midway

### Phase 7.3 — backend/services/kopokopo.js

- [ ] 🟠 Fix undefined model/service references that cause runtime errors
- [ ] 🟠 Replace any require() for non-existent files
- [ ] 🟠 Move to backend/services/PaymentGatewayService.js and register KopoKopo as a provider

### Phase 7.5 — New Services to Create

- [ ] 🟠 Create backend/services/AuditingService.js — centralized audit trail for all financial changes
- [ ] 🟠 Create backend/services/PaymentGatewayService.js — abstraction layer for KopoKopo and M-Pesa
- [ ] 🟡 Create backend/services/JournalEntryService.js — double-entry validation logic

---

## From PHASE 24 — BACKEND API HARDENING

### Phase 24.1 — Input Validation (Treasury/Payment Controllers)

- [ ] 🟠 backend/controllers/treasury.controller.js — Validate all monetary amounts are positive numbers
- [ ] 🟠 backend/controllers/treasury.controller.js — Validate currency code is a known ISO 4217 code
- [ ] 🟠 backend/controllers/payments.controller.js — Validate M-Pesa phone number format before initiating payment
- [ ] 🟠 backend/controllers/payments.controller.js — Validate payment amount is within configured limits
- [ ] 🟡 Create backend/validators/treasuryValidator.js — all treasury-related validation schemas

---

## From APPENDIX A — QUICK-WIN TASKS

- [ ] 🔴 `reconciliationService.js` line 188: change `pending` → `params`
- [ ] 🔴 `reconciliationService.js` line 220: change `reconciled IS NULL` → `reconciled_at IS NULL`
- [ ] 🟠 `TaxStatementRepository.js` line 157: change `totalAmount` → `total_amount`
- [ ] 🟠 `payments.routes.js`: add role check to `POST /`

---

## From APPENDIX D — UPDATED QUICK-WIN LIST (From Dashboard Audit)

- [ ] 🟠 `dashboard.controller.js` `getFinancialStats()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `dashboard.controller.js` `getFinancialHealth()`: replace hardcoded zeros with real SQL
- [ ] 🟠 `TreasurerDashboard.jsx` line 171: replace `75` with calculated value
