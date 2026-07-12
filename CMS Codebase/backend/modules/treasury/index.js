/**
 * Treasury Module
 * Main entry point for treasury domain module
 * Exports models, repositories, controllers, and routes
 */

const models = require('./models');
const repositories = require('./repositories');
const controllers = require('./controllers');
const routes = require('./routes');

module.exports = {
  // Models
  models,
  
  // Repositories
  repositories,
  
  // Controllers
  controllers,
  
  // Routes
  routes,
  
  // Convenience exports
  Account: models.Account,
  Fund: models.Fund,
  JournalEntry: models.JournalEntry,
  JournalEntryLine: models.JournalEntryLine,
  Expense: models.Expense,
  Budget: models.Budget,
  
  AccountRepository: repositories.AccountRepository,
  FundRepository: repositories.FundRepository,
  JournalEntryRepository: repositories.JournalEntryRepository,
  ExpenseRepository: repositories.ExpenseRepository,
  BudgetRepository: repositories.BudgetRepository,
  
  AccountController: controllers.AccountController,
  FundController: controllers.FundController,
  JournalEntryController: controllers.JournalEntryController,
  ExpenseController: controllers.ExpenseController,
  BudgetController: controllers.BudgetController
};
