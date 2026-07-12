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
const transactionRoutes = require('./transaction.routes');
const vendorRoutes = require('./vendor.routes');
const reconciliationRoutes = require('./reconciliation.routes');
const financialReportRoutes = require('./financialReport.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

// Mount domain-specific routes
router.use('/accounts', accountRoutes);
router.use('/funds', fundRoutes);
router.use('/journal-entries', journalEntryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);
router.use('/transactions', transactionRoutes);
router.use('/vendors', vendorRoutes);
router.use('/reconciliations', reconciliationRoutes);
router.use('/reports', financialReportRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
