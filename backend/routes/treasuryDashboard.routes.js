/**
 * @audit Treasury dashboard routes.
 * @known FIXED: finance-role gate added; 'days' SQLi parameterized at the repo; churchId now
 *        threaded into every controller->repo call. Still mounts legacy treasuryController.
 *        getFundBalance (scoped via controller when it accepts church_id — verify).
 */
const express = require('express');
const router = express.Router();
const treasuryDashboardController = require('../controllers/treasuryDashboard.controller');
const treasuryController = require('../controllers/treasury.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Financial aggregates are leadership-only — same role set as modules/treasury.
const FINANCE_ROLES = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'];
router.use(authenticateToken, requireRole(FINANCE_ROLES));

// Get dashboard summary
router.get('/summary', treasuryDashboardController.getDashboardSummary);

// Get income vs expense chart data
router.get('/income-vs-expense', treasuryDashboardController.getIncomeVsExpense);

// Get fund balances
router.get('/fund-balances', treasuryController.getFundBalance.bind(treasuryController));

// Get recent transactions
router.get('/recent-transactions', treasuryDashboardController.getRecentTransactions);

// Get budget status
router.get('/budget-status', treasuryDashboardController.getBudgetStatus);

// Get alert summary
router.get('/alert-summary', treasuryDashboardController.getAlertSummary);

// Get top expenses
router.get('/top-expenses', treasuryDashboardController.getTopExpenses);

// Get financial reports
router.get('/reports', treasuryDashboardController.getFinancialReports);

module.exports = router;
