const express = require('express');
const router = express.Router();
const financialAlertsController = require('../controllers/financialAlerts.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all alerts
router.get('/', financialAlertsController.getAllAlerts);

// Get alert by ID
router.get('/:id', financialAlertsController.getAlertById);

// Create alert
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialAlertsController.createAlert);

// Resolve alert
router.post('/:id/resolve', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialAlertsController.resolveAlert);

// Delete alert
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), financialAlertsController.deleteAlert);

// Check budget variance alerts
router.post('/check/budget-variance', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialAlertsController.checkBudgetVarianceAlerts);

// Check low balance alerts
router.post('/check/low-balance', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialAlertsController.checkLowBalanceAlerts);

// Check pending payment alerts
router.post('/check/pending-payments', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialAlertsController.checkPendingPaymentAlerts);

module.exports = router;
