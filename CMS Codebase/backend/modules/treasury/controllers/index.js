/**
 * Treasury Controllers Index
 * Exports all treasury domain controllers
 */

const AccountController = require('./account.controller');
const FundController = require('./fund.controller');
const JournalEntryController = require('./journalEntry.controller');
const ExpenseController = require('./expense.controller');
const BudgetController = require('./budget.controller');
const TransactionController = require('./transaction.controller');
const VendorController = require('./vendor.controller');
const ReconciliationController = require('./reconciliation.controller');
const FinancialReportController = require('./financialReport.controller');
const AnalyticsController = require('./analytics.controller');

module.exports = {
  AccountController,
  FundController,
  JournalEntryController,
  ExpenseController,
  BudgetController,
  TransactionController,
  VendorController,
  ReconciliationController,
  FinancialReportController,
  AnalyticsController
};
