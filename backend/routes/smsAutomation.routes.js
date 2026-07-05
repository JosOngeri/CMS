const express = require('express');
const router = express.Router();
const smsAutomationController = require('../controllers/smsAutomation.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all automation rules
router.get('/', smsAutomationController.getAllAutomationRules);

// Get automation rule by ID
router.get('/:id', smsAutomationController.getAutomationRuleById);

// Create automation rule
router.post('/', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsAutomationController.createAutomationRule);

// Update automation rule
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), smsAutomationController.updateAutomationRule);

// Delete automation rule
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), smsAutomationController.deleteAutomationRule);

// Test automation rule
router.post('/:id/test', smsAutomationController.testAutomationRule);

// Trigger automation (for system events)
router.post('/trigger', smsAutomationController.triggerAutomation);

module.exports = router;
