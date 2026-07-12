const express = require('express');
const router = express.Router();
const manualPaymentController = require('../controllers/manualPayment.controller');
const { authenticateToken } = require('../middleware/auth');
const { hasRole } = require('../middleware/roleGuard');

// All routes require authentication
router.use(authenticateToken);

// Create manual payment
router.post('/', hasRole(['Super Admin', 'Pastor', 'Treasurer']), manualPaymentController.createManualPayment);

// Get manual payments
router.get('/', hasRole(['Super Admin', 'Pastor', 'Treasurer']), manualPaymentController.getManualPayments);

// Get payment by receipt number
router.get('/receipt/:receiptNumber', manualPaymentController.getPaymentByReceipt);

// Generate virtual receipt
router.get('/receipt/:receiptNumber/generate', manualPaymentController.generateVirtualReceipt);

// Update manual payment
router.put('/:id', hasRole(['Super Admin', 'Pastor', 'Treasurer']), manualPaymentController.updateManualPayment);

// Delete manual payment
router.delete('/:id', hasRole(['Super Admin', 'Pastor']), manualPaymentController.deleteManualPayment);

// Match payment to member
router.post('/match', hasRole(['Super Admin', 'Pastor', 'Treasurer']), manualPaymentController.matchPaymentToMember);

// Get manual payment statistics
router.get('/stats/summary', hasRole(['Super Admin', 'Pastor', 'Treasurer']), manualPaymentController.getManualPaymentStats);

module.exports = router;