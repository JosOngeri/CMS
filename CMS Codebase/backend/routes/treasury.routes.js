const express = require('express');
const router = express.Router();
const treasuryController = require('../controllers/treasury.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const TreasurySecurityMiddleware = require('../middleware/treasurySecurity');
const treasuryModuleRoutes = require('../modules/treasury/routes');

// All routes require authentication
router.use(authenticateToken);

// All treasury routes require treasury access
router.use(TreasurySecurityMiddleware.hasTreasuryAccess);

// Mount modular treasury routes (NEW - Phase 1)
router.use('/module', treasuryModuleRoutes);

// Legacy routes using old treasury.controller (DEPRECATED - Will be removed)
// These routes are maintained for backward compatibility during migration

// Accounts
router.get('/accounts', treasuryController.getAccounts);
router.post('/accounts', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createAccount);
router.put('/accounts/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateAccount);
router.delete('/accounts/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteAccount);

// Transactions
router.get('/transactions', treasuryController.getTransactions);
router.post('/transactions', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createTransaction);
router.put('/transactions/:id/approve', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.approveTransaction);
router.put('/transactions/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateTransaction);
router.delete('/transactions/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteTransaction);

// Categories
router.get('/income-categories', treasuryController.getIncomeCategories);
router.get('/expense-categories', treasuryController.getExpenseCategories);

// Budgets
router.get('/budgets', treasuryController.getBudgets);
router.post('/budgets', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createBudget);
router.put('/budgets/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateBudget);
router.delete('/budgets/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteBudget);
router.get('/budgets/:budgetId/items', treasuryController.getBudgetItems);
router.post('/budgets/:budgetId/items', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createBudgetItem);
router.put('/budgets/:budgetId/items/:itemId', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateBudgetItem);
router.delete('/budgets/:budgetId/items/:itemId', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteBudgetItem);
router.get('/budgets/alerts', treasuryController.getBudgetAlerts);

// Funds
router.get('/funds', treasuryController.getFunds);
router.post('/funds', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createFund);
router.put('/funds/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateFund);
router.delete('/funds/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteFund);

// Reports
router.get('/summary', treasuryController.getFinancialSummary);

// Treasury Reports with church_id filtering (Phase 13)
const financialReportController = require('../modules/treasury/controllers/financialReport.controller');
router.get('/reports/trial-balance', financialReportController.getTrialBalance.bind(financialReportController));
router.get('/reports/income-statement', financialReportController.getIncomeStatement.bind(financialReportController));
router.get('/reports/balance-sheet', financialReportController.getBalanceSheet.bind(financialReportController));
router.get('/reports/cash-flow', financialReportController.getCashFlowStatement.bind(financialReportController));
router.get('/reports/fund-balance', financialReportController.getFundBalance.bind(financialReportController));

// Additional routes for frontend compatibility
router.get('/vendors', treasuryController.getVendors);
router.post('/vendors', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createVendor);
router.put('/vendors/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateVendor);
router.delete('/vendors/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteVendor);

router.get('/analytics', treasuryController.getAnalytics);

router.get('/recurring-payments', treasuryController.getRecurringPayments);
router.post('/recurring-payments', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createRecurringPayment);
router.put('/recurring-payments/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateRecurringPayment);
router.delete('/recurring-payments/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteRecurringPayment);
router.post('/recurring-payments/:id/pause', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.pauseRecurringPayment);
router.post('/recurring-payments/:id/activate', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.activateRecurringPayment);

router.get('/receipts', treasuryController.getReceipts);
router.get('/receipts/:id/pdf', treasuryController.downloadReceiptPDF);

router.get('/projects', treasuryController.getProjects);
router.post('/projects', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createProject);
router.put('/projects/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateProject);
router.delete('/projects/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteProject);

router.get('/pledges', treasuryController.getPledges);
router.post('/pledges', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createPledge);
router.put('/pledges/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updatePledge);
router.delete('/pledges/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deletePledge);

router.get('/campaigns', treasuryController.getCampaigns);
router.post('/campaigns', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createCampaign);
router.put('/campaigns/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateCampaign);
router.delete('/campaigns/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteCampaign);

// Fixed Assets
router.get('/fixed-assets', treasuryController.getFixedAssets);
router.post('/fixed-assets', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createFixedAsset);
router.put('/fixed-assets/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateFixedAsset);
router.delete('/fixed-assets/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteFixedAsset);

// Bank Reconciliations
router.get('/reconciliations', treasuryController.getReconciliations);
router.post('/reconciliations', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.createReconciliation);
router.put('/reconciliations/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), treasuryController.updateReconciliation);
router.delete('/reconciliations/:id', requireRole(['Super Admin', 'Pastor']), treasuryController.deleteReconciliation);

module.exports = router;