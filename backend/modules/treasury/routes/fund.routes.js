/**
 * Fund Routes
 * Fund management endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { FundController } = require('../controllers');

const router = express.Router();
const fundController = new FundController(pool);

// Validation rules
const fundValidation = [
  body('fund_code').trim().notEmpty().withMessage('Fund code is required'),
  body('fund_name').trim().notEmpty().withMessage('Fund name is required'),
  body('fund_type').isIn(['unrestricted', 'restricted', 'temporarily_restricted'])
    .withMessage('Valid fund type required'),
  body('description').optional().isString(),
  body('purpose').optional().isString(),
  body('start_date').optional().isISO8601().withMessage('Valid start date required'),
  body('end_date').optional().isISO8601().withMessage('Valid end date required'),
  body('target_amount').optional().isFloat({ min: 0 })
];

// GET /api/treasury/funds - List all funds
router.get('/',
  authenticateToken,
  fundController.getFunds.bind(fundController)
);

// GET /api/treasury/funds/balances - Get fund balances summary
router.get('/balances',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  fundController.getFundBalances.bind(fundController)
);

// GET /api/treasury/funds/:id - Get fund by ID
router.get('/:id',
  authenticateToken,
  fundController.getFundById.bind(fundController)
);

// POST /api/treasury/funds - Create fund
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  fundValidation,
  fundController.createFund.bind(fundController)
);

// PUT /api/treasury/funds/:id - Update fund
router.put('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  fundController.updateFund.bind(fundController)
);

// DELETE /api/treasury/funds/:id - Delete fund
router.delete('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  fundController.deleteFund.bind(fundController)
);

module.exports = router;
