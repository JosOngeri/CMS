/**
 * Account Controller
 * Handles Chart of Accounts operations
 */

const { validationResult } = require('express-validator');
const AccountRepository = require('../repositories/account.repository');
const Account = require('../models/Account');
const logger = require('../../../config/logging');

class AccountController {
  constructor(pool) {
    this.accountRepo = new AccountRepository(pool);
  }

  /**
   * Get all accounts
   */
  async getAccounts(req, res) {
    try {
      const { account_type, is_active, include_balance } = req.query;
      
      const accounts = await this.accountRepo.findAll({
        account_type,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        include_balance: include_balance === 'true'
      });
      
      res.json({ accounts });
    } catch (error) {
      logger.error('Get accounts error:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(req, res) {
    try {
      const { id } = req.params;
      const account = await this.accountRepo.findById(id);
      
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      
      res.json({ account });
    } catch (error) {
      logger.error('Get account by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch account' });
    }
  }

  /**
   * Create new account
   */
  async createAccount(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const account = new Account(req.body);
      const created = await this.accountRepo.create(account);
      
      logger.info(`Account created: ${created.account_number} - ${created.account_name}`);
      res.status(201).json({ account: created });
    } catch (error) {
      logger.error('Create account error:', error);
      
      if (error.message.includes('duplicate')) {
        return res.status(409).json({ error: 'Account number already exists' });
      }
      
      res.status(500).json({ error: error.message || 'Failed to create account' });
    }
  }

  /**
   * Update account
   */
  async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const account = new Account({ ...req.body, id });
      
      const updated = await this.accountRepo.update(id, account);
      
      if (!updated) {
        return res.status(404).json({ error: 'Account not found' });
      }
      
      logger.info(`Account updated: ${updated.account_number}`);
      res.json({ account: updated });
    } catch (error) {
      logger.error('Update account error:', error);
      res.status(500).json({ error: error.message || 'Failed to update account' });
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.accountRepo.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Account not found' });
      }
      
      logger.info(`Account deleted: ${deleted.account_number}`);
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete account' });
    }
  }

  /**
   * Get account hierarchy
   */
  async getHierarchy(req, res) {
    try {
      const hierarchy = await this.accountRepo.getHierarchy();
      res.json({ hierarchy });
    } catch (error) {
      logger.error('Get hierarchy error:', error);
      res.status(500).json({ error: 'Failed to fetch account hierarchy' });
    }
  }

  /**
   * Get trial balance
   */
  async getTrialBalance(req, res) {
    try {
      const { as_of_date } = req.query;
      const trialBalance = await this.accountRepo.getTrialBalance(as_of_date);
      
      // Calculate totals
      const totals = trialBalance.reduce((acc, account) => {
        if (['asset', 'expense'].includes(account.account_type)) {
          acc.total_debits += parseFloat(account.total_debits);
        } else {
          acc.total_credits += parseFloat(account.total_credits);
        }
        return acc;
      }, { total_debits: 0, total_credits: 0 });
      
      res.json({ 
        trial_balance: trialBalance,
        totals,
        is_balanced: Math.abs(totals.total_debits - totals.total_credits) < 0.01
      });
    } catch (error) {
      logger.error('Get trial balance error:', error);
      res.status(500).json({ error: 'Failed to generate trial balance' });
    }
  }
}

module.exports = AccountController;
