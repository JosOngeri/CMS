/**
 * Treasury Routes Index
 * Main treasury routes aggregator
 */

const express = require('express');
const accountRoutes = require('./account.routes');
const fundRoutes = require('./fund.routes');
const journalEntryRoutes = require('./journalEntry.routes');
const expenseRoutes = require('./expense.routes');
const budgetRoutes = require('./budget.routes');
const { authenticateToken, requireRole } = require('../../../middleware/auth');

const router = express.Router();

// Church books are finance-role only — previously every GET was open to any
// authenticated user (a Child could read accounts/funds/budgets/expenses)
const FINANCE_ROLES = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'];
router.use(authenticateToken, requireRole(FINANCE_ROLES));

// Mount domain-specific routes
router.use('/accounts', accountRoutes);
router.use('/funds', fundRoutes);
router.use('/journal-entries', journalEntryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);

module.exports = router;
