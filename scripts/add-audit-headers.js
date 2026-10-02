/**
 * Prepends compact audit headers (@known ledger refs) to re-audited files.
 * Idempotent: skips files already containing '@audit'.
 * Run: node scripts/add-audit-headers.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const HEADERS = {
  'backend/routes/events.routes.js': `/**
 * @audit Events routes — inline SQL, no repository layer.
 * @known BLOCKER: can_edit/can_delete/can_manage CASE binds literal 'Super Admin' vs hardcoded
 *        array -> always true; ANY authenticated user edits/deletes all events (lines ~212/456/539).
 *        Zero church_id anywhere; event department_id taken from body unchecked.
 *        See docs/reports/2026-10-02_22-49_line-by-line-ledger.md
 */`,
  'backend/routes/treasuryDashboard.routes.js': `/**
 * @audit Treasury dashboard routes.
 * @known BLOCKER: authenticateToken only — no finance role gate; members reach the 'days' SQLi
 *        endpoint + cross-tenant aggregates; mounts legacy unscoped treasuryController.getFundBalance.
 */`,
  'backend/helpers/websocket.js': `/**
 * @audit Activity WebSocket helper (ws).
 * @known BLOCKER: extractUserId trusts ?userId= with no token verification — unauthenticated
 *        impersonation + unauthenticated channel subscribe; pairs with server.js double io bind.
 */`,
  'backend/helpers/finance.js': `/**
 * @audit Finance helpers (trial balance / income statement / balance sheet).
 * @known BLOCKER: unterminated 'posted literal ~line 212 (balance sheet always throws);
 *        zero church_id — all reports aggregate across ALL tenants.
 */`,
  'backend/helpers/reportScheduler.js': `/**
 * @audit Scheduled report cron runner.
 * @known BLOCKER: interpolates report.columns/filter.field/filter.operator into SQL (stored SQLi
 *        executed on cron); no church filter; report.name unsanitized into output filename.
 */`,
  'backend/utils/mpesa.js': `/**
 * @audit M-Pesa Daraja helper (legacy path — see services/MpesaService.js).
 * @known HIGH: getConfig() reads mpesa_* settings with NO church filter and caches once globally —
 *        all tenants share one church's credentials; callback path differs from MpesaService.
 */`,
  'backend/controllers/telegram.controller.js': `/**
 * @audit Telegram controller (legacy surface — channels, auth, sync).
 * @known BLOCKER: verifyAuth NEVER compares the submitted code — returns success for any code,
 *        even when none was requested (!storedData -> success). Channel ops unscoped;
 *        getSettings/updateSettings global; codes logged plaintext; global.verificationCodes map.
 */`,
  'backend/controllers/members.controller.js': `/**
 * @audit Members controller.
 * @known BLOCKER: createMember inserts without church_id (repo lacks the column); updateMember/
 *        deleteMember run unconditionally even when the scoped existence read returns null ->
 *        cross-tenant member PII mutate/delete.
 */`,
  'backend/controllers/payments.controller.js': `/**
 * @audit Payments controller (standard path; M-Pesa flow in payment.controller.js).
 * @known BLOCKER: calls PaymentsRepository.checkDuplicatePayment — method does not exist -> 500 on
 *        every non-M-Pesa create; updatePaymentStatus(id,status,churchId) writes church UUID into
 *        repo's transactionId param; several mutations unscoped.
 */`,
  'backend/repositories/PaymentsRepository.js': `/**
 * @audit Payments repository (plural — standard payments/pledges/refunds).
 * @known BLOCKER: getRefunds defined TWICE (~lines 74/111 — second wins silently); createPayment
 *        omits church_id; updatePaymentStatus(id,status,transactionId) — callers pass churchId into
 *        transactionId slot; update/delete/verify/cancel/getPledgePayments unscoped.
 */`,
  'backend/repositories/MembersRepository.js': `/**
 * @audit Members repository.
 * @known BLOCKER: INSERT INTO members (~line 140) omits church_id — new members are tenantless and
 *        invisible to the scoped list queries (which DO filter church_id).
 */`,
  'backend/services/FixedAssetService.js': `/**
 * @audit Fixed-asset depreciation service.
 * @known ISSUE: bare identifier 'useful_life' at ~lines 23/79/81 (local var is usefulLife) ->
 *        ReferenceError in generateDepreciationSchedule for ALL methods (line 79 is straight-line).
 */`,
  'backend/helpers/workflowEngine.js': `/**
 * @audit Approval workflow engine.
 * @known ISSUE: processStep computes approvalCount+1 >= requiredApprovals BEFORE checking the
 *        assignment UPDATE matched — unassigned approver completes a step with 0 rows updated;
 *        no church scoping; steps[stepIndex] undefined-step unhandled.
 */`,
  'backend/repositories/UserSettingsRepository.js': `/**
 * @audit User settings/preferences repository (per-user scope — intentionally not church-scoped).
 * @known ISSUE: createUserPreferencesWithFields builds the INSERT column list from SET-clause
 *        strings ("field = $n") AND its placeholders collide with $1=user_id -> always fails;
 *        changePassword uses bcrypt cost 10 while helpers/security.js uses bcryptjs 12.
 */`,
  'backend/modules/treasury/controllers/fund.controller.js': `/**
 * @audit Treasury fund controller (modular surface — church-scoped).
 * @known ISSUE: deleteFund compares fund.current_balance !== 0 — pg returns numerics as strings
 *        ("0.00" !== 0 is always true) -> funds can never be deleted.
 */`,
  'backend/modules/treasury/controllers/expense.controller.js': `/**
 * @audit Treasury expense controller (modular surface — church-scoped).
 * @known ISSUE: approveExpense has no separation-of-duties check (can approve own submission);
 *        updateExpense spreads raw req.body into Expense -> status/submitted_by injectable via PUT.
 */`,
  'backend/modules/treasury/models/JournalEntry.js': `/**
 * @audit JournalEntry model (modular treasury).
 * @known ISSUE: canEdit() returns true for status 'posted' — posted entries can be mutated,
 *        defeating the reversal workflow (should be draft-only).
 */`,
  'backend/repositories/DepartmentRepository.js': `/**
 * @audit Department repository.
 * @known BLOCKER: getDepartmentMembers/getDepartmentAdmins use SELECT u.* (~lines 77/88) ->
 *        password_hash/mfa_secret returned to callers; getAvailableDepartments unscoped.
 */`,
  'frontend/src/components/common/Loading.jsx': `/**
 * @audit Loading spinners/skeletons.
 * @known ISSUE: InlineLoading calls useColorPalette() (~line 24) without importing it ->
 *        ReferenceError on render; colors is unused — delete the call.
 */`,
  'frontend/src/components/common/EmptyState.jsx': `/**
 * @audit Empty-state variants (Members/Events/Gallery/etc).
 * @known ISSUE: <action>/<secondaryAction> lowercase JSX (~lines 62/73) render literal DOM elements —
 *        the passed icon component never renders; action && onAction both required silently.
 */`,
  'frontend/src/pages/approvals/ApprovalInbox.jsx': `/**
 * @audit Approval inbox page.
 * @known BLOCKER: stub page — all 5 tabs render placeholder paragraphs; handleRejectApproval/
 *        handleDeleteApproval are defined but never invoked. Route /dashboard/approvals is live.
 */`,
  'frontend/src/hooks/useDataFetch.js': `/**
 * @audit Generic GET hook.
 * @known ISSUE: uses RAW axios (line ~39), not the AuthContext api instance — gets Bearer via
 *        main.jsx global interceptors but NOT the CSRF header; two fetch conventions coexist.
 */`,
};

let written = 0;
for (const [rel, header] of Object.entries(HEADERS)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`MISSING: ${rel}`); continue; }
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('@audit')) { console.log(`SKIP (has @audit): ${rel}`); continue; }
  fs.writeFileSync(file, header + '\n' + src);
  written++;
  console.log(`WROTE: ${rel}`);
}
console.log(`\nHeaders written: ${written}`);
