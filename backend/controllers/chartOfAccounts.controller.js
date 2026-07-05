const BaseController = require('./BaseController');
const ChartOfAccountsRepository = require('../repositories/ChartOfAccountsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Chart of Accounts Controller
 * Handles chart of accounts management for double-entry accounting
 */
class ChartOfAccountsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ChartOfAccountsController');
  }

  /**
   * Get all chart of accounts with hierarchy
   */
  async getAllAccounts(req, res) {
    try {
      const { account_type, is_active } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (account_type) filters.account_type = account_type;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const accounts = await ChartOfAccountsRepository.findAll(filters, churchId);

      // Build hierarchy tree
      const accountMap = {};
      const rootAccounts = [];

      // First pass: create map
      accounts.forEach(account => {
        accountMap[account.id] = { ...account, children: [] };
      });

      // Second pass: build tree
      accounts.forEach(account => {
        if (account.parent_id && accountMap[account.parent_id]) {
          accountMap[account.parent_id].children.push(accountMap[account.id]);
        } else {
          rootAccounts.push(accountMap[account.id]);
        }
      });

      res.json({ success: true, data: rootAccounts, flat: accounts });
    } catch (error) {
      this.logger.error('getAllAccounts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch chart of accounts' });
    }
  }

  /**
   * Get chart of account by ID
   */
  async getAccountById(req, res) {
    try {
      const { id } = req.params;

      const account = await ChartOfAccountsRepository.getAccountById(id);

      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      // Get child accounts
      const children = await ChartOfAccountsRepository.getChildAccounts(id);

      res.json({
        success: true,
        data: {
          ...account,
          children
        }
      });
    } catch (error) {
      this.logger.error('getAccountById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch account' });
    }
  }

  /**
   * Create new chart of account
   */
  async createAccount(req, res) {
    try {
      const { account_code, account_name, account_type, parent_id } = req.body;

      // Validate account code format
      if (!/^\d{4}$/.test(account_code)) {
        return res.status(400).json({
          success: false,
          error: 'Account code must be 4 digits (e.g., 1000, 1100)'
        });
      }

      // Validate account type
      const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
      if (!validTypes.includes(account_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid account type. Must be one of: asset, liability, equity, income, expense'
        });
      }

      // Check if account code already exists
      const existingAccount = await ChartOfAccountsRepository.findByAccountCode(account_code);

      if (existingAccount) {
        return res.status(400).json({ success: false, error: 'Account code already exists' });
      }

      // If parent_id is provided, validate it exists
      if (parent_id) {
        const parentAccount = await ChartOfAccountsRepository.findByIdAndType(parent_id);

        if (!parentAccount) {
          return res.status(400).json({ success: false, error: 'Parent account not found' });
        }

        // Validate that parent and child have same account type
        if (parentAccount.account_type !== account_type) {
          return res.status(400).json({
            success: false,
            error: 'Child account must have same account type as parent'
          });
        }
      }

      const account = await ChartOfAccountsRepository.create({
        account_code,
        account_name,
        account_type,
        parent_id: parent_id || null
      });

      res.json({ success: true, data: account });
    } catch (error) {
      this.logger.error('createAccount', error);
      res.status(500).json({ success: false, error: 'Failed to create account' });
    }
  }

  /**
   * Update chart of account
   */
  async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const { account_name, account_type, parent_id, is_active } = req.body;

      // Check if account exists
      const existingAccount = await ChartOfAccountsRepository.findById(id);

      if (!existingAccount) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      // Validate account type if provided
      if (account_type) {
        const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
        if (!validTypes.includes(account_type)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid account type. Must be one of: asset, liability, equity, income, expense'
          });
        }
      }

      // If parent_id is provided, validate it exists and has same type
      if (parent_id) {
        const parentAccount = await ChartOfAccountsRepository.findByIdAndType(parent_id);

        if (!parentAccount) {
          return res.status(400).json({ success: false, error: 'Parent account not found' });
        }

        const finalAccountType = account_type || existingAccount.account_type;
        if (parentAccount.account_type !== finalAccountType) {
          return res.status(400).json({
            success: false,
            error: 'Child account must have same account type as parent'
          });
        }
      }

      const account = await ChartOfAccountsRepository.update(id, {
        account_name,
        account_type,
        parent_id,
        is_active
      });

      res.json({ success: true, data: account });
    } catch (error) {
      this.logger.error('updateAccount', error);
      res.status(500).json({ success: false, error: 'Failed to update account' });
    }
  }

  /**
   * Delete chart of account (only if no children and no journal entries)
   */
  async deleteAccount(req, res) {
    try {
      const { id } = req.params;

      // Check if account has children
      const childCount = await ChartOfAccountsRepository.countChildAccounts(id);

      if (childCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account with child accounts. Delete children first.'
        });
      }

      // Check if account has journal entries
      const journalEntryCount = await ChartOfAccountsRepository.countJournalEntryLines(id);

      if (journalEntryCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account with journal entries. Void the entries first.'
        });
      }

      const account = await ChartOfAccountsRepository.delete(id);

      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      this.logger.error('deleteAccount', error);
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(req, res) {
    try {
      const { id } = req.params;
      const { as_of_date } = req.query;

      const balanceData = await ChartOfAccountsRepository.getAccountBalance(id, as_of_date);

      const totalDebits = parseFloat(balanceData.total_debits);
      const totalCredits = parseFloat(balanceData.total_credits);

      // Get account type to calculate balance
      const accountType = await ChartOfAccountsRepository.getAccountType(id);

      if (!accountType) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      let balance = 0;

      // Calculate balance based on account type
      // Assets and expenses: debit increases balance
      // Liabilities, equity, and income: credit increases balance
      if (accountType === 'asset' || accountType === 'expense') {
        balance = totalDebits - totalCredits;
      } else {
        balance = totalCredits - totalDebits;
      }

      res.json({
        success: true,
        data: {
          account_id: id,
          account_type: accountType,
          total_debits: totalDebits,
          total_credits: totalCredits,
          balance: balance
        }
      });
    } catch (error) {
      this.logger.error('getAccountBalance', error);
      res.status(500).json({ success: false, error: 'Failed to get account balance' });
    }
  }
}

module.exports = new ChartOfAccountsController();
