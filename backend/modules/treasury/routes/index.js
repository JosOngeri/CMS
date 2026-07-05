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

const router = express.Router();

// Mount domain-specific routes
router.use('/accounts', accountRoutes);
router.use('/funds', fundRoutes);
router.use('/journal-entries', journalEntryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);

module.exports = router;
