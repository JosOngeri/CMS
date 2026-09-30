const BaseController = require('./BaseController');
const ChartOfAccountsRepository = require('../repositories/ChartOfAccountsRepository');
const ChartOfAccountsService = require('../services/ChartOfAccountsService');
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

      // Build hierarchy tree using service
      const rootAccounts = ChartOfAccountsService.buildAccountHierarchy(accounts);

      return this.success(res, { hierarchy: rootAccounts, flat: accounts });
    } catch (error) {
      this.logger.error('getAllAccounts', error);
      return this.error(res, 'Failed to fetch chart of accounts');
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
        return this.notFound(res, 'Account not found');
      }

      // Get child accounts
      const children = await ChartOfAccountsRepository.getChildAccounts(id);

      return this.success(res, {
        ...account,
        children
      });
    } catch (error) {
      this.logger.error('getAccountById', error);
      return this.error(res, 'Failed to fetch account');
    }
  }

  /**
   * Create new chart of account
   */
  async createAccount(req, res) {
    try {
      const { account_code, account_name, account_type, parent_id } = req.body;

      const account = await ChartOfAccountsService.createAccount({
        account_code,
        account_name,
        account_type,
        parent_id
      });

      return this.success(res, account, 'Account created successfully', 201);
    } catch (error) {
      this.logger.error('createAccount', error);
      if (error.message.includes('not found') || error.message.includes('already exists') || error.message.includes('must be')) {
        return this.error(res, error.message, 400);
      }
      return this.error(res, 'Failed to create account');
    }
  }

  /**
   * Update chart of account
   */
  async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const { account_name, account_type, parent_id, is_active } = req.body;

      const account = await ChartOfAccountsService.updateAccount(id, {
        account_name,
        account_type,
        parent_id,
        is_active
      });

      return this.success(res, account, 'Account updated successfully');
    } catch (error) {
      this.logger.error('updateAccount', error);
      if (error.message.includes('not found') || error.message.includes('must be')) {
        return this.error(res, error.message, 400);
      }
      return this.error(res, 'Failed to update account');
    }
  }

  /**
   * Delete chart of account (only if no children and no journal entries)
   */
  async deleteAccount(req, res) {
    try {
      const { id } = req.params;

      await ChartOfAccountsService.deleteAccount(id);

      return this.success(res, null, 'Account deleted successfully');
    } catch (error) {
      this.logger.error('deleteAccount', error);
      if (error.message.includes('Cannot delete') || error.message.includes('not found')) {
        return this.error(res, error.message, 400);
      }
      return this.error(res, 'Failed to delete account');
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(req, res) {
    try {
      const { id } = req.params;
      const { as_of_date } = req.query;

      const balanceData = await ChartOfAccountsService.getAccountBalance(id, as_of_date);

      return this.success(res, balanceData);
    } catch (error) {
      this.logger.error('getAccountBalance', error);
      if (error.message.includes('not found')) {
        return this.notFound(res, 'Account not found');
      }
      return this.error(res, 'Failed to fetch account balance');
    }
  }
}

module.exports = new ChartOfAccountsController();
