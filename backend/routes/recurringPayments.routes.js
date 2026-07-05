const express = require('express');
const router = express.Router();
const recurringPaymentsController = require('../controllers/recurringPayments.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all recurring payments
router.get('/', recurringPaymentsController.getAllRecurringPayments);

// Get recurring payment by ID
router.get('/:id', recurringPaymentsController.getRecurringPaymentById);

// Create recurring payment
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), recurringPaymentsController.createRecurringPayment);

// Update recurring payment
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), recurringPaymentsController.updateRecurringPayment);

// Delete recurring payment
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), recurringPaymentsController.deleteRecurringPayment);

// Pause recurring payment
router.post('/:id/pause', requireRole(['Super Admin', 'Pastor', 'Treasurer']), recurringPaymentsController.pauseRecurringPayment);

// Resume recurring payment
router.post('/:id/resume', requireRole(['Super Admin', 'Pastor', 'Treasurer']), recurringPaymentsController.resumeRecurringPayment);

module.exports = router;
