/**
 * Account Routes
 * Chart of Accounts endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { AccountController } = require('../controllers');

const router = express.Router();
const accountController = new AccountController(pool);

// Validation rules
const accountValidation = [
  body('account_number').trim().notEmpty().withMessage('Account number is required'),
  body('account_name').trim().notEmpty().withMessage('Account name is required'),
  body('account_type').isIn(['asset', 'liability', 'equity', 'income', 'expense'])
    .withMessage('Valid account type required'),
  body('sub_type').optional().isString(),
  body('parent_account_id').optional().isUUID(),
  body('fund_id').optional().isUUID(),
  body('description').optional().isString()
];

// GET /api/treasury/accounts - List all accounts
router.get('/',
  authenticateToken,
  accountController.getAccounts.bind(accountController)
);

// GET /api/treasury/accounts/hierarchy - Get account hierarchy
router.get('/hierarchy',
  authenticateToken,
  accountController.getHierarchy.bind(accountController)
);

// GET /api/treasury/accounts/trial-balance - Get trial balance
router.get('/trial-balance',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  accountController.getTrialBalance.bind(accountController)
);

// GET /api/treasury/accounts/:id - Get account by ID
router.get('/:id',
  authenticateToken,
  accountController.getAccountById.bind(accountController)
);

// POST /api/treasury/accounts - Create account
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  accountValidation,
  accountController.createAccount.bind(accountController)
);

// PUT /api/treasury/accounts/:id - Update account
router.put('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  accountController.updateAccount.bind(accountController)
);

// DELETE /api/treasury/accounts/:id - Delete account
router.delete('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  accountController.deleteAccount.bind(accountController)
);

module.exports = router;
