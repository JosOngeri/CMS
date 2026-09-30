const ChartOfAccountsRepository = require('../repositories/ChartOfAccountsRepository');
const logger = require('../config/logging');

/**
 * Chart of Accounts Service
 * Handles business logic for chart of accounts including hierarchy building and balance calculations
 */
class ChartOfAccountsService {
  /**
   * Build hierarchy tree from flat account list
   * @param {Array} accounts - Flat list of accounts
   * @returns {Array} Hierarchical tree of accounts
   */
  buildAccountHierarchy(accounts) {
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

    return rootAccounts;
  }

  /**
   * Validate account code format
   * @param {string} accountCode - Account code to validate
   * @returns {Object} Validation result { valid: boolean, error: string }
   */
  validateAccountCode(accountCode) {
    if (!/^\d{4}$/.test(accountCode)) {
      return {
        valid: false,
        error: 'Account code must be 4 digits (e.g., 1000, 1100)'
      };
    }
    return { valid: true };
  }

  /**
   * Validate account type
   * @param {string} accountType - Account type to validate
   * @returns {Object} Validation result { valid: boolean, error: string }
   */
  validateAccountType(accountType) {
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(accountType)) {
      return {
        valid: false,
        error: 'Invalid account type. Must be one of: asset, liability, equity, income, expense'
      };
    }
    return { valid: true };
  }

  /**
   * Validate parent-child relationship
   * @param {string} parentId - Parent account ID
   * @param {string} accountType - Child account type
   * @returns {Promise<Object>} Validation result { valid: boolean, error: string }
   */
  async validateParentChildRelationship(parentId, accountType) {
    const parentAccount = await ChartOfAccountsRepository.findByIdAndType(parentId);

    if (!parentAccount) {
      return {
        valid: false,
        error: 'Parent account not found'
      };
    }

    if (parentAccount.account_type !== accountType) {
      return {
        valid: false,
        error: 'Child account must have same account type as parent'
      };
    }

    return { valid: true };
  }

  /**
   * Calculate account balance based on account type
   * @param {number} totalDebits - Total debits
   * @param {number} totalCredits - Total credits
   * @param {string} accountType - Account type
   * @returns {number} Calculated balance
   */
  calculateBalance(totalDebits, totalCredits, accountType) {
    // For asset and expense accounts: debit increases balance
    // For liability, equity, and income accounts: credit increases balance
    if (accountType === 'asset' || accountType === 'expense') {
      return totalDebits - totalCredits;
    } else {
      return totalCredits - totalDebits;
    }
  }

  /**
   * Validate account deletion
   * @param {string} accountId - Account ID to validate
   * @returns {Promise<Object>} Validation result { valid: boolean, error: string }
   */
  async validateAccountDeletion(accountId) {
    // Check if account has children
    const childCount = await ChartOfAccountsRepository.countChildAccounts(accountId);

    if (childCount > 0) {
      return {
        valid: false,
        error: 'Cannot delete account with child accounts. Delete children first.'
      };
    }

    // Check if account has journal entries
    const journalEntryCount = await ChartOfAccountsRepository.countJournalEntryLines(accountId);

    if (journalEntryCount > 0) {
      return {
        valid: false,
        error: 'Cannot delete account with journal entries. Void the entries first.'
      };
    }

    return { valid: true };
  }

  /**
   * Get account balance with calculation
   * @param {string} accountId - Account ID
   * @param {string} asOfDate - Optional as-of date
   * @returns {Promise<Object>} Balance data with calculated balance
   */
  async getAccountBalance(accountId, asOfDate) {
    const balanceData = await ChartOfAccountsRepository.getAccountBalance(accountId, asOfDate);
    const accountType = await ChartOfAccountsRepository.getAccountType(accountId);

    if (!accountType) {
      throw new Error('Account not found');
    }

    const totalDebits = parseFloat(balanceData.total_debits || 0);
    const totalCredits = parseFloat(balanceData.total_credits || 0);
    const balance = this.calculateBalance(totalDebits, totalCredits, accountType.account_type);

    return {
      ...balanceData,
      calculated_balance: balance,
      account_type: accountType.account_type
    };
  }

  /**
   * Create account with validation
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} Created account
   */
  async createAccount(accountData) {
    const { account_code, account_name, account_type, parent_id } = accountData;

    // Validate account code
    const codeValidation = this.validateAccountCode(account_code);
    if (!codeValidation.valid) {
      throw new Error(codeValidation.error);
    }

    // Validate account type
    const typeValidation = this.validateAccountType(account_type);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Check if account code already exists
    const existingAccount = await ChartOfAccountsRepository.findByAccountCode(account_code);
    if (existingAccount) {
      throw new Error('Account code already exists');
    }

    // If parent_id is provided, validate it
    if (parent_id) {
      const parentValidation = await this.validateParentChildRelationship(parent_id, account_type);
      if (!parentValidation.valid) {
        throw new Error(parentValidation.error);
      }
    }

    return await ChartOfAccountsRepository.create({
      account_code,
      account_name,
      account_type,
      parent_id: parent_id || null
    });
  }

  /**
   * Update account with validation
   * @param {string} accountId - Account ID
   * @param {Object} accountData - Account data to update
   * @returns {Promise<Object>} Updated account
   */
  async updateAccount(accountId, accountData) {
    const { account_name, account_type, parent_id, is_active } = accountData;

    // Check if account exists
    const existingAccount = await ChartOfAccountsRepository.findById(accountId);
    if (!existingAccount) {
      throw new Error('Account not found');
    }

    // Validate account type if provided
    if (account_type) {
      const typeValidation = this.validateAccountType(account_type);
      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }
    }

    // If parent_id is provided, validate it
    if (parent_id) {
      const finalAccountType = account_type || existingAccount.account_type;
      const parentValidation = await this.validateParentChildRelationship(parent_id, finalAccountType);
      if (!parentValidation.valid) {
        throw new Error(parentValidation.error);
      }
    }

    return await ChartOfAccountsRepository.update(accountId, {
      account_name,
      account_type,
      parent_id,
      is_active
    });
  }

  /**
   * Delete account with validation
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Deleted account
   */
  async deleteAccount(accountId) {
    const validation = await this.validateAccountDeletion(accountId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const account = await ChartOfAccountsRepository.delete(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }
}

module.exports = new ChartOfAccountsService();
