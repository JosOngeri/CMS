/**
 * @audit Treasury dashboard routes.
 * @known BLOCKER: authenticateToken only — no finance role gate; members reach the 'days' SQLi
 *        endpoint + cross-tenant aggregates; mounts legacy unscoped treasuryController.getFundBalance.
 */
const express = require('express');
const router = express.Router();
const treasuryDashboardController = require('../controllers/treasuryDashboard.controller');
const treasuryController = require('../controllers/treasury.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

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
