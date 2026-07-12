/**
 * Journal Entry Routes
 * Journal entry and general ledger endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { JournalEntryController } = require('../controllers');

const router = express.Router();
const journalController = new JournalEntryController(pool);

// Validation rules
const journalEntryValidation = [
  body('entry_date').isISO8601().withMessage('Valid entry date is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('reference_type').optional().isString(),
  body('reference_id').optional().isUUID(),
  body('lines').isArray({ min: 2 }).withMessage('At least 2 journal entry lines required'),
  body('lines.*.account_id').isUUID().withMessage('Valid account ID required'),
  body('lines.*.debit_amount').isFloat({ min: 0 }).withMessage('Valid debit amount required'),
  body('lines.*.credit_amount').isFloat({ min: 0 }).withMessage('Valid credit amount required')
];

// GET /api/treasury/journal-entries - List all journal entries
router.get('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalController.getJournalEntries.bind(journalController)
);

// GET /api/treasury/journal-entries/:id - Get journal entry by ID
router.get('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalController.getJournalEntryById.bind(journalController)
);

// POST /api/treasury/journal-entries - Create journal entry
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalEntryValidation,
  journalController.createJournalEntry.bind(journalController)
);

// PUT /api/treasury/journal-entries/:id - Update journal entry
router.put('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalController.updateJournalEntry.bind(journalController)
);

// POST /api/treasury/journal-entries/:id/reverse - Reverse journal entry
router.post('/:id/reverse',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalController.reverseJournalEntry.bind(journalController)
);

// GET /api/treasury/journal-entries/accounts/:account_id/transactions - Get account transactions
router.get('/accounts/:account_id/transactions',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Treasurer']),
  journalController.getAccountTransactions.bind(journalController)
);

module.exports = router;
