const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliation.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Push data from JOSms
router.post('/push', requireRole(['Super Admin', 'Treasurer']), reconciliationController.pushFromRelay);

// Dashboard data
router.get('/pending', requireRole(['Super Admin', 'Treasurer']), reconciliationController.getPending);
router.post('/verify', requireRole(['Super Admin', 'Treasurer']), reconciliationController.verifyTransaction);

module.exports = router;
