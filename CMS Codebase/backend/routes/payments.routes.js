const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Payment Methods
router.get('/methods', paymentsController.getPaymentMethods);
router.post('/methods', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.createPaymentMethod);
router.put('/methods/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePaymentMethod);
router.delete('/methods/:id', requireRole(['Super Admin', 'Pastor']), paymentsController.deletePaymentMethod);

// Categories (used by Payments.jsx frontend)
router.get('/categories', paymentsController.getPaymentCategories);

// My Payments (current user's payment history – used by MyPayments.jsx)
router.get('/my-payments', paymentsController.getMyPayments);

// Payments – root aliases used by frontend (POST /api/payments)
router.get('/', paymentsController.getPayments);
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.createPayment);

// Payments – legacy sub-paths
router.get('/payments', paymentsController.getPayments);
router.post('/payments', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.createPayment);
router.put('/payments/:id/status', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePaymentStatus);
router.put('/status/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePaymentStatus); // Alias for frontend compatibility
router.put('/payments/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePayment);
router.delete('/payments/:id', requireRole(['Super Admin', 'Pastor']), paymentsController.deletePayment);

// Pledges
router.get('/pledges', paymentsController.getPledges);
router.post('/pledges', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.createPledge);
router.put('/pledges/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePledge);
router.delete('/pledges/:id', requireRole(['Super Admin', 'Pastor']), paymentsController.deletePledge);
router.post('/pledges/:pledgeId/payments', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.addPledgePayment);
router.get('/pledges/:pledgeId/payments', paymentsController.getPledgePayments);

// Reports
router.get('/summary', paymentsController.getPaymentSummary);
router.get('/analytics', paymentsController.getPaymentAnalytics);
router.get('/trends', paymentsController.getPaymentTrends);

// Refunds
router.get('/refunds', paymentsController.getRefunds);
router.post('/:paymentId/refund', paymentsController.refundPayment);
router.post('/refunds/:refundId/approve', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.approveRefund);
router.post('/refunds/:refundId/reject', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.rejectRefund);

// Payment verification
router.post('/:paymentId/verify', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.verifyPayment);
router.post('/:paymentId/cancel', paymentsController.cancelPayment);

// Parameterised routes last to avoid shadowing static paths
router.get('/:id/receipt', paymentsController.downloadReceipt);
router.get('/:id', paymentsController.getPaymentById);

module.exports = router;