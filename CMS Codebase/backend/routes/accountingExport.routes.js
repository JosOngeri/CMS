const express = require('express');
const router = express.Router();
const accountingExportController = require('../controllers/accountingExport.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all exports
router.get('/', accountingExportController.getAllExports);

// Get export by ID
router.get('/:id', accountingExportController.getExportById);

// Export journal entries
router.post('/journal-entries', requireRole(['Super Admin', 'Pastor', 'Treasurer']), accountingExportController.exportJournalEntries);

// Export chart of accounts
router.post('/chart-of-accounts', requireRole(['Super Admin', 'Pastor', 'Treasurer']), accountingExportController.exportChartOfAccounts);

// Export transactions
router.post('/transactions', requireRole(['Super Admin', 'Pastor', 'Treasurer']), accountingExportController.exportTransactions);

module.exports = router;
