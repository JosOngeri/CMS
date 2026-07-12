const express = require('express');
const router = express.Router();
const pledgesController = require('../controllers/pledges.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all pledges
router.get('/', pledgesController.getAllPledges);

// Get pledge by ID
router.get('/:id', pledgesController.getPledgeById);

// Create pledge
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), pledgesController.createPledge);

// Update pledge
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), pledgesController.updatePledge);

// Delete pledge
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), pledgesController.deletePledge);

// Record pledge payment
router.post('/:id/payment', requireRole(['Super Admin', 'Pastor', 'Treasurer']), pledgesController.recordPledgePayment);

module.exports = router;
