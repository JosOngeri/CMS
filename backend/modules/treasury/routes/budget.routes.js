/**
 * Budget Routes
 * Budget management endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { BudgetController } = require('../controllers');

const router = express.Router();
const budgetController = new BudgetController(pool);

// Validation rules
const budgetValidation = [
  body('budget_name').trim().notEmpty().withMessage('Budget name is required'),
  body('budget_type').isIn(['annual', 'quarterly', 'monthly', 'project'])
    .withMessage('Valid budget type required'),
  body('fiscal_year').isInt({ min: 2000, max: 2100 }).withMessage('Valid fiscal year required'),
  body('account_id').optional().isUUID(),
  body('fund_id').optional().isUUID(),
  body('department_id').optional().isUUID(),
  body('total_budgeted').isFloat({ min: 0 }).withMessage('Budget amount must be 0 or greater'),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('notes').optional().isString()
];

// GET /api/treasury/budgets - List all budgets
router.get('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.getBudgets.bind(budgetController)
);

// GET /api/treasury/budgets/alerts - Get budget alerts
router.get('/alerts',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.getBudgetAlerts.bind(budgetController)
);

// GET /api/treasury/budgets/comparison - Get budget comparison report
router.get('/comparison',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.getBudgetComparison.bind(budgetController)
);

// GET /api/treasury/budgets/:id - Get budget by ID
router.get('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.getBudgetById.bind(budgetController)
);

// POST /api/treasury/budgets - Create budget
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetValidation,
  budgetController.createBudget.bind(budgetController)
);

// PUT /api/treasury/budgets/:id - Update budget
router.put('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.updateBudget.bind(budgetController)
);

// POST /api/treasury/budgets/:id/activate - Activate budget
router.post('/:id/activate',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.activateBudget.bind(budgetController)
);

// POST /api/treasury/budgets/:id/close - Close budget
router.post('/:id/close',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  budgetController.closeBudget.bind(budgetController)
);

module.exports = router;
