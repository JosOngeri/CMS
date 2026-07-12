const express = require('express');
const router = express.Router();
const customReportController = require('../controllers/customReport.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all custom reports
router.get('/', customReportController.getAllCustomReports);

// Get custom report by ID
router.get('/:id', customReportController.getCustomReportById);

// Create custom report
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), customReportController.createCustomReport);

// Update custom report
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), customReportController.updateCustomReport);

// Delete custom report
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), customReportController.deleteCustomReport);

// Generate custom report
router.post('/:id/generate', customReportController.generateCustomReport);

module.exports = router;
