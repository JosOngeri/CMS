/**
 * Expense Routes
 * Expense management endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { ExpenseController } = require('../controllers');

const router = express.Router();
const expenseController = new ExpenseController(pool);

// Validation rules
const expenseValidation = [
  body('expense_date').isISO8601().withMessage('Valid expense date is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('account_id').isUUID().withMessage('Valid account ID is required'),
  body('fund_id').optional().isUUID(),
  body('vendor_id').optional().isUUID(),
  body('department_id').optional().isUUID(),
  body('project_id').optional().isUUID(),
  body('payment_method').optional().isIn(['cash', 'check', 'bank_transfer', 'mpesa', 'card']),
  body('notes').optional().isString()
];

// GET /api/treasury/expenses - List all expenses
router.get('/',
  authenticateToken,
  expenseController.getExpenses.bind(expenseController)
);

// GET /api/treasury/expenses/pending - Get pending approvals
router.get('/pending',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  expenseController.getPendingApprovals.bind(expenseController)
);

// GET /api/treasury/expenses/summary - Get expense summary by status
router.get('/summary',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  expenseController.getExpenseSummary.bind(expenseController)
);

// GET /api/treasury/expenses/report - Get expense report
router.get('/report',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  expenseController.getExpenseReport.bind(expenseController)
);

// GET /api/treasury/expenses/:id - Get expense by ID
router.get('/:id',
  authenticateToken,
  expenseController.getExpenseById.bind(expenseController)
);

// POST /api/treasury/expenses - Create expense
router.post('/',
  authenticateToken,
  expenseValidation,
  expenseController.createExpense.bind(expenseController)
);

// PUT /api/treasury/expenses/:id - Update expense
router.put('/:id',
  authenticateToken,
  expenseController.updateExpense.bind(expenseController)
);

// POST /api/treasury/expenses/:id/approve - Approve expense
router.post('/:id/approve',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  expenseController.approveExpense.bind(expenseController)
);

// POST /api/treasury/expenses/:id/reject - Reject expense
router.post('/:id/reject',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  expenseController.rejectExpense.bind(expenseController)
);

// POST /api/treasury/expenses/:id/pay - Mark expense as paid
router.post('/:id/pay',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  expenseController.markExpensePaid.bind(expenseController)
);

module.exports = router;
