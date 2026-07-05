/**
 * Treasury Repositories Index
 * Exports all treasury repositories
 */

const AccountRepository = require('./account.repository');
const FundRepository = require('./fund.repository');
const JournalEntryRepository = require('./journalEntry.repository');
const ExpenseRepository = require('./expense.repository');
const BudgetRepository = require('./budget.repository');

module.exports = {
  AccountRepository,
  FundRepository,
  JournalEntryRepository,
  ExpenseRepository,
  BudgetRepository
};
