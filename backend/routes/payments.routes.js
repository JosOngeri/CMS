const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments.controller');
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public gateway webhooks (canonical plural mount)
router.post('/kopokopo/webhook', paymentController.processWebhook);

// All routes below require authentication
router.use(authenticateToken);

// KopoKopo payment initiation aliases (previously mounted at /api/payment)
router.post('/initiate', paymentController.initiatePayment);
router.post('/payment-link', paymentController.generatePaymentLink);
router.post('/qr-code', paymentController.generateQRCode);
router.get('/status/:paymentId', paymentController.checkPaymentStatus);
router.get('/history/:memberId', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentController.getPaymentHistory);
router.get('/all', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentController.getAllPayments);
router.post('/refund/:paymentId', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentController.refundPayment);

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
// Members may initiate their own M-Pesa giving (phone_number + payment_items);
// all other payment creation stays restricted to finance roles.
const memberInitiationOrFinance = (req, res, next) => {
  const isMemberInitiation = req.body.phone_number && Array.isArray(req.body.payment_items);
  if (isMemberInitiation) return next();
  return requireRole(['Super Admin', 'Pastor', 'Treasurer'])(req, res, next);
};

router.get('/', paymentsController.getPayments);
router.post('/', memberInitiationOrFinance, paymentsController.createPayment);

// Payments – legacy sub-paths
router.get('/payments', paymentsController.getPayments);
router.post('/payments', memberInitiationOrFinance, paymentsController.createPayment);
router.put('/payments/:id/status', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePaymentStatus);
router.put('/status/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePaymentStatus); // Alias for frontend compatibility
router.put('/payments/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePayment);
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.updatePayment); // Flat alias
router.delete('/payments/:id', requireRole(['Super Admin', 'Pastor']), paymentsController.deletePayment);
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), paymentsController.deletePayment); // Flat alias

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
router.get('/refunds', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.getRefunds);
router.post('/:paymentId/refund', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.refundPayment);
router.post('/refunds/:refundId/approve', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.approveRefund);
router.post('/refunds/:refundId/reject', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.rejectRefund);

// Payment verification
router.post('/:paymentId/verify', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.verifyPayment);
router.post('/:paymentId/cancel', requireRole(['Super Admin', 'Pastor', 'Treasurer']), paymentsController.cancelPayment);

// Parameterised routes last to avoid shadowing static paths
router.get('/:id/receipt', paymentsController.downloadReceipt);
router.get('/:id', paymentsController.getPaymentById);

module.exports = router;