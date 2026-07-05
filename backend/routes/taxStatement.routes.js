const express = require('express');
const router = express.Router();
const taxStatementController = require('../controllers/taxStatement.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all tax statements
router.get('/', taxStatementController.getAllTaxStatements);

// Get tax statement by ID
router.get('/:id', taxStatementController.getTaxStatementById);

// Generate tax statement
router.post('/generate', requireRole(['Super Admin', 'Pastor', 'Treasurer']), taxStatementController.generateTaxStatement);

// Regenerate tax statement
router.post('/:id/regenerate', requireRole(['Super Admin', 'Pastor', 'Treasurer']), taxStatementController.regenerateTaxStatement);

// Mark tax statement as sent
router.post('/:id/mark-sent', requireRole(['Super Admin', 'Pastor', 'Treasurer']), taxStatementController.markTaxStatementSent);

// Delete tax statement
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), taxStatementController.deleteTaxStatement);

module.exports = router;
