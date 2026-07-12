const BaseController = require('./BaseController');
const TreasuryRepository = require('../repositories/TreasuryRepository');
const { createLogger } = require('../helpers/controllerLogger');
const { sendBudgetAlertSMS, sendExpenseApprovalSMS, sendJournalEntrySMS, sendFinancialReportSMS } = require('../helpers/treasurySMSIntegration');
const auditService = require('../services/auditService');

/**
 * Treasury Controller (DEPRECATED)
 * 
 * ⚠️ DEPRECATION NOTICE ⚠️
 * This controller is being replaced by modular treasury controllers.
 * Please use the new modular architecture:
 * - Transaction Controller: modules/treasury/controllers/transaction.controller.js
 * - Vendor Controller: modules/treasury/controllers/vendor.controller.js
 * - Reconciliation Controller: modules/treasury/controllers/reconciliation.controller.js
 * - Financial Report Controller: modules/treasury/controllers/financialReport.controller.js
 * - Analytics Controller: modules/treasury/controllers/analytics.controller.js
 * 
 * Migration Status: Phase 1 Complete (27/57 methods migrated)
 * Remaining methods: Projects, Pledges, Campaigns, Fixed Assets, Receipts, Recurring Payments
 * 
 * For new development, use the modular controllers at /api/treasury/module/*
 * Legacy routes maintained for backward compatibility during migration.
 */
class TreasuryController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TreasuryController');
    this.logger.warn('TreasuryController is deprecated. Use modular treasury controllers instead.');
  }

  /**
   * Get all church accounts (DEPRECATED - Use Account Controller)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAccounts(req, res) {
    this.logger.warn('getAccounts is deprecated. Use /api/treasury/module/accounts instead');
    try {
      const churchId = req.user.church_id;
      const accounts = await TreasuryRepository.getAccounts(churchId);
      res.json({ success: true, data: accounts });
    } catch (error) {
      this.logger.error('getAccounts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
  }

  /**
   * Create a new church account (DEPRECATED - Use Account Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.accountName - Account name
   * @param {string} req.body.accountNumber - Account number
   * @param {string} req.body.bankName - Bank name
   * @param {string} [req.body.accountType] - Account type
   * @param {number} [req.body.balance] - Initial balance
   * @param {string} [req.body.currency] - Currency code
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createAccount(req, res) {
    this.logger.warn('createAccount is deprecated. Use /api/treasury/module/accounts instead');
    try {
      const { accountName, accountNumber, bankName, accountType, balance, currency } = req.body;

      const account = await TreasuryRepository.createAccount({
        accountName,
        accountNumber,
        bankName,
        accountType,
        balance,
        currency
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: account
      });
    } catch (error) {
      this.logger.error('createAccount', error);
      res.status(500).json({ success: false, error: 'Failed to create account' });
    }
  }

  /**
   * Get transactions with filtering (DEPRECATED - Use Transaction Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.type] - Transaction type filter
   * @param {string} [req.query.categoryId] - Category ID filter
   * @param {string} [req.query.accountId] - Account ID filter
   * @param {string} [req.query.status] - Status filter
   * @param {string} [req.query.startDate] - Start date filter
   * @param {string} [req.query.endDate] - End date filter
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactions(req, res) {
    this.logger.warn('getTransactions is deprecated. Use /api/treasury/module/transactions instead');
    try {
      const { type, categoryId, accountId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
      const churchId = req.user.church_id;

      const transactions = await TreasuryRepository.getFilteredTransactions(
        { type, categoryId, accountId, status, startDate, endDate, limit, offset },
        churchId
      );

      res.json({ success: true, data: transactions });
    } catch (error) {
      this.logger.error('getTransactions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
  }

  /**
   * Create a new transaction (DEPRECATED - Use Transaction Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.transactionType - Transaction type (income/expense)
   * @param {string} req.body.categoryId - Category ID
   * @param {string} req.body.accountId - Account ID
   * @param {number} req.body.amount - Transaction amount
   * @param {string} req.body.description - Transaction description
   * @param {string} [req.body.referenceNumber] - Reference number
   * @param {string} req.body.transactionDate - Transaction date
   * @param {string} req.body.paymentMethod - Payment method
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createTransaction(req, res) {
    this.logger.warn('createTransaction is deprecated. Use /api/treasury/module/transactions instead');
    try {
      const { transactionType, categoryId, accountId, amount, description, referenceNumber, transactionDate, paymentMethod } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const transaction = await TreasuryRepository.createTransaction({
        transactionType,
        categoryId,
        accountId,
        amount,
        description,
        referenceNumber,
        transactionDate,
        recordedBy: userId,
        paymentMethod
      });

      // Log audit event
      await auditService.log(
        churchId,
        userId,
        'CREATE',
        'transactions',
        transaction.id,
        null,
        transaction,
        req.ip,
        req.get('user-agent')
      );

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });
    } catch (error) {
      this.logger.error('createTransaction', error);
      res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
  }

  /**
   * Approve a transaction
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Transaction ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const approved = await TreasuryRepository.approveTransaction(id, userId);

      if (!approved) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      // Log audit event
      await auditService.log(
        churchId,
        userId,
        'APPROVE',
        'transactions',
        id,
        { status: 'pending' },
        { status: 'approved' },
        req.ip,
        req.get('user-agent')
      );

      sendExpenseApprovalSMS(approved, 'approved').catch(smsError => {
        this.logger.error('Failed to send expense approval SMS', smsError);
      });

      res.json({
        success: true,
        message: 'Transaction approved successfully',
        data: approved
      });
    } catch (error) {
      this.logger.error('approveTransaction', error);
      res.status(500).json({ success: false, error: 'Failed to approve transaction' });
    }
  }

  /**
   * Get income categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getIncomeCategories(req, res) {
    try {
      const churchId = req.user.church_id;
      const categories = await TreasuryRepository.getIncomeCategories(churchId);
      res.json({ success: true, data: categories });
    } catch (error) {
      this.logger.error('getIncomeCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch income categories' });
    }
  }

  /**
   * Get expense categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getExpenseCategories(req, res) {
    try {
      const churchId = req.user.church_id;
      const categories = await TreasuryRepository.getExpenseCategories(churchId);
      res.json({ success: true, data: categories });
    } catch (error) {
      this.logger.error('getExpenseCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch expense categories' });
    }
  }

  /**
   * Get budgets with filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.fiscalYear] - Fiscal year filter
   * @param {string} [req.query.status] - Status filter
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBudgets(req, res) {
    try {
      const budgets = await TreasuryRepository.getBudgets(fiscalYear, status);

      res.json({ success: true, data: budgets });
    } catch (error) {
      this.logger.error('getBudgets', error);
      res.status(500).json({ success: false, error: 'Failed to fetch budgets' });
    }
  }

  /**
   * Create a new budget
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Budget name
   * @param {string} req.body.fiscalYear - Fiscal year
   * @param {string} req.body.startDate - Start date
   * @param {string} req.body.endDate - End date
   * @param {number} [req.body.totalIncomeBudget] - Total income budget
   * @param {number} [req.body.totalExpenseBudget] - Total expense budget
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createBudget(req, res) {
    try {
      const { name, fiscalYear, startDate, endDate, totalIncomeBudget, totalExpenseBudget } = req.body;
      const userId = req.user.id;

      const budget = await TreasuryRepository.createBudget({
        name,
        fiscalYear,
        startDate,
        endDate,
        totalIncomeBudget,
        totalExpenseBudget,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } catch (error) {
      this.logger.error('createBudget', error);
      res.status(500).json({ success: false, error: 'Failed to create budget' });
    }
  }

  /**
   * Get budget items for a specific budget
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.budgetId - Budget ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBudgetItems(req, res) {
    try {
      const { budgetId } = req.params;

      const budgetItems = await TreasuryRepository.getBudgetItems(budgetId);

      res.json({ success: true, data: budgetItems });
    } catch (error) {
      this.logger.error('getBudgetItems', error);
      res.status(500).json({ success: false, error: 'Failed to fetch budget items' });
    }
  }

  /**
   * Create a budget item
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.budgetId - Budget ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.categoryId - Category ID
   * @param {string} req.body.categoryType - Category type (income/expense)
   * @param {number} req.body.amount - Budgeted amount
   * @param {string} [req.body.notes] - Notes
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createBudgetItem(req, res) {
    try {
      const { budgetId } = req.params;
      const { categoryId, categoryType, amount, notes } = req.body;

      const budgetItem = await TreasuryRepository.createBudgetItem({
        budgetId,
        categoryId,
        categoryType,
        amount,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Budget item created successfully',
        data: budgetItem
      });
    } catch (error) {
      this.logger.error('createBudgetItem', error);
      res.status(500).json({ success: false, error: 'Failed to create budget item' });
    }
  }

  /**
   * Get financial summary
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date filter
   * @param {string} [req.query.endDate] - End date filter
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFinancialSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;

      const summary = await TreasuryRepository.getFinancialSummary(churchId, startDate, endDate);
      const totalBalance = await TreasuryRepository.getTotalBalance(churchId);

      const totalIncome = parseFloat(summary?.total_income || 0);
      const totalExpense = parseFloat(summary?.total_expense || 0);

      res.json({
        success: true,
        data: {
          totalIncome,
          totalExpense,
          netIncome: totalIncome - totalExpense,
          totalBalance,
        }
      });
    } catch (error) {
      this.logger.error('getFinancialSummary', error);
      res.status(500).json({ success: false, error: 'Failed to fetch financial summary' });
    }
  }

  /**
   * Get budget alerts (budgets running low)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBudgetAlerts(req, res) {
    try {
      const alerts = await TreasuryRepository.getBudgetAlertsDetailed();
      res.json({ success: true, alerts });
    } catch (error) {
      this.logger.error('getBudgetAlerts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch budget alerts' });
    }
  }

  /**
   * Update a vendor (DEPRECATED - Use Vendor Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Vendor ID
   * @param {Object} req.body - Request body
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateVendor(req, res) {
    this.logger.warn('updateVendor is deprecated. Use /api/treasury/module/vendors instead');
    try {
      const { id } = req.params;
      const { name, contactPerson, email, phone, address } = req.body;
      const vendor = await TreasuryRepository.updateVendor(id, { name, contactPerson, email, phone, address });
      res.json({ success: true, vendor });
    } catch (error) {
      this.logger.error('updateVendor', error);
      res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
  }

  /**
   * Delete a vendor (DEPRECATED - Use Vendor Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Vendor ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteVendor(req, res) {
    this.logger.warn('deleteVendor is deprecated. Use /api/treasury/module/vendors instead');
    try {
      await TreasuryRepository.deleteVendor(req.params.id);
      res.json({ success: true, message: 'Vendor deleted' });
    } catch (error) {
      this.logger.error('deleteVendor', error);
      res.status(500).json({ success: false, error: 'Failed to delete vendor' });
    }
  }

  /**
   * Get treasury analytics
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.date_from] - Start date for analytics
   * @param {string} [req.query.date_to] - End date for analytics
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAnalytics(req, res) {
    try {
      const { date_from, date_to } = req.query;
      const analytics = await TreasuryRepository.getAnalytics(date_from, date_to);
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }

  /**
   * Update a recurring payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Recurring payment ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateRecurringPayment(req, res) {
    try {
      const { id } = req.params;
      const { name, amount, frequency, startDate, description, status } = req.body;
      const payment = await TreasuryRepository.updateRecurringPayment(id, { name, amount, frequency, startDate, description, status });
      res.json({ success: true, payment });
    } catch (error) {
      this.logger.error('updateRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to update recurring payment' });
    }
  }

  /**
   * Delete a recurring payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Recurring payment ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteRecurringPayment(req, res) {
    try {
      await TreasuryRepository.deleteRecurringPayment(req.params.id);
      res.json({ success: true, message: 'Recurring payment deleted' });
    } catch (error) {
      this.logger.error('deleteRecurringPayment', error);
      res.status(500).json({ success: false, error: 'Failed to delete recurring payment' });
    }
  }

  /**
   * Get receipts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getReceipts(req, res) {
    try {
      const receipts = await TreasuryRepository.getReceipts();
      res.json({ success: true, receipts });
    } catch (error) {
      this.logger.error('getReceipts', error);
      res.status(500).json({ success: false, error: 'Failed to fetch receipts' });
    }
  }

  /**
   * Download receipt PDF
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Receipt ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async downloadReceiptPDF(req, res) {
    try {
      const { id } = req.params;
      const receipt = await TreasuryRepository.findReceiptById(id);
      if (!receipt) {
        return res.status(404).json({ success: false, error: 'Receipt not found' });
      }
      res.json({ success: true, receipt });
    } catch (error) {
      this.logger.error('downloadReceiptPDF', error);
      res.status(500).json({ success: false, error: 'Failed to download receipt' });
    }
  }

  /**
   * Get projects
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getProjects(req, res) {
    try {
      const projects = await TreasuryRepository.getProjects();
      res.json({ success: true, projects });
    } catch (error) {
      this.logger.error('getProjects', error);
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
  }

  /**
   * Create a project
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Project name
   * @param {string} [req.body.description] - Project description
   * @param {number} req.body.budget - Project budget
   * @param {string} req.body.startDate - Start date
   * @param {string} req.body.endDate - End date
   * @param {string} [req.body.status] - Project status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createProject(req, res) {
    try {
      const { name, description, budget, startDate, endDate, status } = req.body;
      const project = await TreasuryRepository.createProject({ name, description, budget, startDate, endDate, status });
      res.status(201).json({ success: true, project });
    } catch (error) {
      this.logger.error('createProject', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  }

  /**
   * Update a project
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Project ID
   * @param {Object} req.body - Request body with project fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { name, description, budget, startDate, endDate, status } = req.body;
      const project = await TreasuryRepository.updateProject(id, { name, description, budget, startDate, endDate, status });
      res.json({ success: true, project });
    } catch (error) {
      this.logger.error('updateProject', error);
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  }

  /**
   * Delete a project
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Project ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteProject(req, res) {
    try {
      await TreasuryRepository.deleteProject(req.params.id);
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      this.logger.error('deleteProject', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  }

  /**
   * Get pledges
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPledges(req, res) {
    try {
      const pledges = await TreasuryRepository.getPledges();
      res.json({ success: true, pledges });
    } catch (error) {
      this.logger.error('getPledges', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledges' });
    }
  }

  /**
   * Create a pledge
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.memberId - Member ID
   * @param {number} req.body.amount - Pledge amount
   * @param {string} req.body.pledgeType - Pledge type
   * @param {string} req.body.startDate - Start date
   * @param {string} req.body.endDate - End date
   * @param {string} req.body.frequency - Payment frequency
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPledge(req, res) {
    try {
      const { memberId, amount, pledgeType, startDate, endDate, frequency } = req.body;
      const pledge = await TreasuryRepository.createPledge({ memberId, amount, pledgeType, startDate, endDate, frequency });
      res.status(201).json({ success: true, pledge });
    } catch (error) {
      this.logger.error('createPledge', error);
      res.status(500).json({ success: false, error: 'Failed to create pledge' });
    }
  }

  /**
   * Update a pledge
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Pledge ID
   * @param {Object} req.body - Request body with pledge fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePledge(req, res) {
    try {
      const { id } = req.params;
      const { amount, pledgeType, startDate, endDate, frequency, status } = req.body;
      const pledge = await TreasuryRepository.updatePledge(id, { amount, pledgeType, startDate, endDate, frequency, status });
      res.json({ success: true, pledge });
    } catch (error) {
      this.logger.error('updatePledge', error);
      res.status(500).json({ success: false, error: 'Failed to update pledge' });
    }
  }

  /**
   * Delete a pledge
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Pledge ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deletePledge(req, res) {
    try {
      await TreasuryRepository.deletePledge(req.params.id);
      res.json({ success: true, message: 'Pledge deleted' });
    } catch (error) {
      this.logger.error('deletePledge', error);
      res.status(500).json({ success: false, error: 'Failed to delete pledge' });
    }
  }

  /**
   * Get pledge campaigns
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCampaigns(req, res) {
    try {
      const campaigns = await TreasuryRepository.getCampaigns();
      res.json({ success: true, campaigns });
    } catch (error) {
      this.logger.error('getCampaigns', error);
      res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
    }
  }

  /**
   * Create a pledge campaign
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Campaign name
   * @param {string} [req.body.description] - Campaign description
   * @param {number} req.body.targetAmount - Target amount
   * @param {string} req.body.startDate - Start date
   * @param {string} req.body.endDate - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createCampaign(req, res) {
    try {
      const { name, description, targetAmount, startDate, endDate } = req.body;
      const campaign = await TreasuryRepository.createCampaign({ name, description, targetAmount, startDate, endDate });
      res.status(201).json({ success: true, campaign });
    } catch (error) {
      this.logger.error('createCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
    }
  }

  /**
   * Generate Trial Balance report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.as_of_date] - As of date for trial balance
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTrialBalance(req, res) {
    try {
      const { as_of_date } = req.query;

      const accounts = await TreasuryRepository.getTrialBalance(as_of_date);

      let totalDebits = 0;
      let totalCredits = 0;

      const processedAccounts = accounts.map(account => {
        let balance = 0;
        if (account.account_type === 'asset' || account.account_type === 'expense') {
          balance = account.total_debits - account.total_credits;
        } else {
          balance = account.total_credits - account.total_debits;
        }

        totalDebits += account.total_debits;
        totalCredits += account.total_credits;

        return {
          ...account,
          balance: balance
        };
      });

      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      res.json({
        success: true,
        data: {
          as_of_date: as_of_date || new Date(),
          accounts: processedAccounts,
          total_debits: totalDebits,
          total_credits: totalCredits,
          is_balanced: isBalanced,
          difference: totalDebits - totalCredits
        }
      });
    } catch (error) {
      this.logger.error('getTrialBalance', error);
      res.status(500).json({ success: false, error: 'Failed to generate trial balance' });
    }
  }

  /**
   * Generate Income Statement report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.start_date] - Report start date
   * @param {string} [req.query.end_date] - Report end date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getIncomeStatement(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, error: 'Start date and end date are required' });
      }

      const incomeAccounts = await TreasuryRepository.getIncomeStatementAccounts('income', start_date, end_date);
      const expenseAccounts = await TreasuryRepository.getIncomeStatementAccounts('expense', start_date, end_date);

      // Calculate totals
      const totalIncome = incomeAccounts.reduce((sum, acc) => sum + (acc.total_credits - acc.total_debits), 0);
      const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.total_debits - acc.total_credits), 0);
      const netIncome = totalIncome - totalExpenses;

      res.json({
        success: true,
        data: {
          period: { start_date, end_date },
          income: incomeAccounts.map(acc => ({
            ...acc,
            amount: acc.total_credits - acc.total_debits
          })),
          expenses: expenseAccounts.map(acc => ({
            ...acc,
            amount: acc.total_debits - acc.total_credits
          })),
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_income: netIncome
        }
      });
    } catch (error) {
      this.logger.error('getIncomeStatement', error);
      res.status(500).json({ success: false, error: 'Failed to generate income statement' });
    }
  }

  /**
   * Generate Balance Sheet report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.as_of_date] - As of date for balance sheet
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getBalanceSheet(req, res) {
    try {
      const { as_of_date } = req.query;

      const assets = await TreasuryRepository.getBalanceSheetAccounts('asset', as_of_date);
      const liabilities = await TreasuryRepository.getBalanceSheetAccounts('liability', as_of_date);
      const equity = await TreasuryRepository.getBalanceSheetAccounts('equity', as_of_date);

      // Calculate totals
      const totalAssets = assets.reduce((sum, acc) => sum + (acc.total_debits - acc.total_credits), 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + (acc.total_credits - acc.total_debits), 0);
      const totalEquity = equity.reduce((sum, acc) => sum + (acc.total_credits - acc.total_debits), 0);

      const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

      res.json({
        success: true,
        data: {
          as_of_date: as_of_date || new Date(),
          assets: assets.map(acc => ({
            ...acc,
            balance: acc.total_debits - acc.total_credits
          })),
          liabilities: liabilities.map(acc => ({
            ...acc,
            balance: acc.total_credits - acc.total_debits
          })),
          equity: equity.map(acc => ({
            ...acc,
            balance: acc.total_credits - acc.total_debits
          })),
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          total_equity: totalEquity,
          total_liabilities_and_equity: totalLiabilities + totalEquity,
          is_balanced: isBalanced
        }
      });
    } catch (error) {
      this.logger.error('getBalanceSheet', error);
      res.status(500).json({ success: false, error: 'Failed to generate balance sheet' });
    }
  }

  /**
   * Update an account
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Account ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateAccount(req, res) {
    try {
      const { id } = req.params;
      const { accountName, accountNumber, bankName, accountType, balance, currency } = req.body;
      const account = await TreasuryRepository.updateAccount(id, {
        accountName,
        accountNumber,
        bankName,
        accountType,
        balance,
        currency
      });
      res.json({ success: true, data: account });
    } catch (error) {
      this.logger.error('updateAccount', error);
      res.status(500).json({ success: false, error: 'Failed to update account' });
    }
  }

  /**
   * Delete an account
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Account ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAccount(req, res) {
    try {
      await TreasuryRepository.deleteAccount(req.params.id);
      res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      this.logger.error('deleteAccount', error);
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  }

  /**
   * Update a transaction
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Transaction ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const { amount, description, categoryId, accountId, status, transactionDate } = req.body;
      const transaction = await TreasuryRepository.updateTransaction(id, {
        amount,
        description,
        categoryId,
        accountId,
        status,
        transactionDate
      });
      res.json({ success: true, data: transaction });
    } catch (error) {
      this.logger.error('updateTransaction', error);
      res.status(500).json({ success: false, error: 'Failed to update transaction' });
    }
  }

  /**
   * Delete a transaction
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Transaction ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteTransaction(req, res) {
    try {
      await TreasuryRepository.deleteTransaction(req.params.id);
      res.json({ success: true, message: 'Transaction deleted' });
    } catch (error) {
      this.logger.error('deleteTransaction', error);
      res.status(500).json({ success: false, error: 'Failed to delete transaction' });
    }
  }

  /**
   * Update a budget
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Budget ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const { budgetName, fiscalYear, fundId, accountId, budgetedAmount, actualAmount, status } = req.body;
      const budget = await TreasuryRepository.updateBudget(id, {
        budgetName,
        fiscalYear,
        fundId,
        accountId,
        budgetedAmount,
        actualAmount,
        status
      });
      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('updateBudget', error);
      res.status(500).json({ success: false, error: 'Failed to update budget' });
    }
  }

  /**
   * Delete a budget
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Budget ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteBudget(req, res) {
    try {
      await TreasuryRepository.deleteBudget(req.params.id);
      res.json({ success: true, message: 'Budget deleted' });
    } catch (error) {
      this.logger.error('deleteBudget', error);
      res.status(500).json({ success: false, error: 'Failed to delete budget' });
    }
  }

  /**
   * Update a budget item
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.budgetId - Budget ID
   * @param {string} req.params.itemId - Budget item ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateBudgetItem(req, res) {
    try {
      const { budgetId, itemId } = req.params;
      const { itemName, budgetedAmount, actualAmount, description } = req.body;
      const item = await TreasuryRepository.updateBudgetItem(itemId, {
        itemName,
        budgetedAmount,
        actualAmount,
        description
      });
      res.json({ success: true, data: item });
    } catch (error) {
      this.logger.error('updateBudgetItem', error);
      res.status(500).json({ success: false, error: 'Failed to update budget item' });
    }
  }

  /**
   * Delete a budget item
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.budgetId - Budget ID
   * @param {string} req.params.itemId - Budget item ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteBudgetItem(req, res) {
    try {
      await TreasuryRepository.deleteBudgetItem(req.params.itemId);
      res.json({ success: true, message: 'Budget item deleted' });
    } catch (error) {
      this.logger.error('deleteBudgetItem', error);
      res.status(500).json({ success: false, error: 'Failed to delete budget item' });
    }
  }

  /**
   * Get funds
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFunds(req, res) {
    try {
      const churchId = req.user.church_id;
      const funds = await TreasuryRepository.getFunds(churchId);
      res.json({ success: true, data: funds });
    } catch (error) {
      this.logger.error('getFunds', error);
      res.status(500).json({ success: false, error: 'Failed to fetch funds' });
    }
  }

  /**
   * Create a fund
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.fundName - Fund name
   * @param {string} req.body.fundCode - Fund code
   * @param {string} [req.body.description] - Fund description
   * @param {string} [req.body.fundType] - Fund type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createFund(req, res) {
    try {
      const { fundName, fundCode, description, fundType } = req.body;
      const fund = await TreasuryRepository.createFund({
        fundName,
        fundCode,
        description,
        fundType
      });
      res.status(201).json({
        success: true,
        message: 'Fund created successfully',
        data: fund
      });
    } catch (error) {
      this.logger.error('createFund', error);
      res.status(500).json({ success: false, error: 'Failed to create fund' });
    }
  }

  /**
   * Update a fund
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Fund ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateFund(req, res) {
    try {
      const { id } = req.params;
      const { fundName, fundCode, description, fundType, isActive } = req.body;
      const fund = await TreasuryRepository.updateFund(id, {
        fundName,
        fundCode,
        description,
        fundType,
        isActive
      });
      res.json({ success: true, data: fund });
    } catch (error) {
      this.logger.error('updateFund', error);
      res.status(500).json({ success: false, error: 'Failed to update fund' });
    }
  }

  /**
   * Delete a fund
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Fund ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteFund(req, res) {
    try {
      await TreasuryRepository.deleteFund(req.params.id);
      res.json({ success: true, message: 'Fund deleted' });
    } catch (error) {
      this.logger.error('deleteFund', error);
      res.status(500).json({ success: false, error: 'Failed to delete fund' });
    }
  }

  /**
   * Get cash flow statement
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCashFlowStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;
      const cashFlow = await TreasuryRepository.getCashFlowStatement(churchId, startDate, endDate);
      res.json({ success: true, data: cashFlow });
    } catch (error) {
      this.logger.error('getCashFlowStatement', error);
      res.status(500).json({ success: false, error: 'Failed to generate cash flow statement' });
    }
  }

  /**
   * Get fund balance report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFundBalance(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;
      const fundBalance = await TreasuryRepository.getFundBalance(churchId, startDate, endDate);
      res.json({ success: true, data: fundBalance });
    } catch (error) {
      this.logger.error('getFundBalance', error);
      res.status(500).json({ success: false, error: 'Failed to generate fund balance report' });
    }
  }

  /**
   * Update a campaign
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Campaign ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const { campaignName, description, goalAmount, startDate, endDate, status } = req.body;
      const campaign = await TreasuryRepository.updateCampaign(id, {
        campaignName,
        description,
        goalAmount,
        startDate,
        endDate,
        status
      });
      res.json({ success: true, data: campaign });
    } catch (error) {
      this.logger.error('updateCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to update campaign' });
    }
  }

  /**
   * Delete a campaign
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Campaign ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteCampaign(req, res) {
    try {
      await TreasuryRepository.deleteCampaign(req.params.id);
      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      this.logger.error('deleteCampaign', error);
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
    }
  }

  /**
   * Get fixed assets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFixedAssets(req, res) {
    try {
      const churchId = req.user.church_id;
      const assets = await TreasuryRepository.getFixedAssets(churchId);
      res.json({ success: true, data: assets });
    } catch (error) {
      this.logger.error('getFixedAssets', error);
      res.status(500).json({ success: false, error: 'Failed to fetch fixed assets' });
    }
  }

  /**
   * Create a fixed asset
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.assetName - Asset name
   * @param {string} req.body.assetCode - Asset code
   * @param {number} req.body.purchasePrice - Purchase price
   * @param {string} req.body.purchaseDate - Purchase date
   * @param {number} [req.body.depreciationRate] - Depreciation rate
   * @param {string} [req.body.location] - Asset location
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createFixedAsset(req, res) {
    try {
      const { assetName, assetCode, purchasePrice, purchaseDate, depreciationRate, location } = req.body;
      const asset = await TreasuryRepository.createFixedAsset({
        assetName,
        assetCode,
        purchasePrice,
        purchaseDate,
        depreciationRate,
        location
      });
      res.status(201).json({
        success: true,
        message: 'Fixed asset created successfully',
        data: asset
      });
    } catch (error) {
      this.logger.error('createFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to create fixed asset' });
    }
  }

  /**
   * Update a fixed asset
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Asset ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateFixedAsset(req, res) {
    try {
      const { id } = req.params;
      const { assetName, assetCode, purchasePrice, purchaseDate, depreciationRate, location, currentValue, status } = req.body;
      const asset = await TreasuryRepository.updateFixedAsset(id, {
        assetName,
        assetCode,
        purchasePrice,
        purchaseDate,
        depreciationRate,
        location,
        currentValue,
        status
      });
      res.json({ success: true, data: asset });
    } catch (error) {
      this.logger.error('updateFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to update fixed asset' });
    }
  }

  /**
   * Delete a fixed asset
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Asset ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteFixedAsset(req, res) {
    try {
      await TreasuryRepository.deleteFixedAsset(req.params.id);
      res.json({ success: true, message: 'Fixed asset deleted' });
    } catch (error) {
      this.logger.error('deleteFixedAsset', error);
      res.status(500).json({ success: false, error: 'Failed to delete fixed asset' });
    }
  }

  /**
   * Get bank reconciliations (DEPRECATED - Use Reconciliation Controller)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getReconciliations(req, res) {
    this.logger.warn('getReconciliations is deprecated. Use /api/treasury/module/reconciliations instead');
    try {
      const churchId = req.user.church_id;
      const reconciliations = await TreasuryRepository.getReconciliations(churchId);
      res.json({ success: true, data: reconciliations });
    } catch (error) {
      this.logger.error('getReconciliations', error);
      res.status(500).json({ success: false, error: 'Failed to fetch reconciliations' });
    }
  }

  /**
   * Create a bank reconciliation (DEPRECATED - Use Reconciliation Controller)
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.accountId - Account ID
   * @param {string} req.body.statementDate - Statement date
   * @param {number} req.body.statementBalance - Statement balance
   * @param {number} req.body.bookBalance - Book balance
   * @param {string} [req.body.notes] - Notes
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createReconciliation(req, res) {
    this.logger.warn('createReconciliation is deprecated. Use /api/treasury/module/reconciliations instead');
    try {
      const { accountId, statementDate, statementBalance, bookBalance, notes } = req.body;
      const reconciliation = await TreasuryRepository.createReconciliation({
        accountId,
        statementDate,
        statementBalance,
        bookBalance,
        notes
      });
      res.status(201).json({
        success: true,
        message: 'Reconciliation created successfully',
        data: reconciliation
      });
    } catch (error) {
      this.logger.error('createReconciliation', error);
      res.status(500).json({ success: false, error: 'Failed to create reconciliation' });
    }
  }

  /**
   * Update a bank reconciliation
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Reconciliation ID
   * @param {Object} req.body - Request body with fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateReconciliation(req, res) {
    try {
      const { id } = req.params;
      const { statementDate, statementBalance, bookBalance, notes, status } = req.body;
      const reconciliation = await TreasuryRepository.updateReconciliation(id, {
        statementDate,
        statementBalance,
        bookBalance,
        notes,
        status
      });
      res.json({ success: true, data: reconciliation });
    } catch (error) {
      this.logger.error('updateReconciliation', error);
      res.status(500).json({ success: false, error: 'Failed to update reconciliation' });
    }
  }

  /**
   * Delete a bank reconciliation
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Reconciliation ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteReconciliation(req, res) {
    try {
      await TreasuryRepository.deleteReconciliation(req.params.id);
      res.json({ success: true, message: 'Reconciliation deleted' });
    } catch (error) {
      this.logger.error('deleteReconciliation', error);
      res.status(500).json({ success: false, error: 'Failed to delete reconciliation' });
    }
  }
}

module.exports = new TreasuryController();