const express = require('express');
const router = express.Router();
const budgetsController = require('../controllers/budgets.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all budgets
router.get('/', budgetsController.getAllBudgets);

// Get budget by ID
router.get('/:id', budgetsController.getBudgetById);

// Create budget
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), budgetsController.createBudget);

// Update budget
router.put('/:id', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), budgetsController.updateBudget);

// Approve budget
router.post('/:id/approve', requireRole(['Super Admin', 'Pastor', 'Treasurer']), budgetsController.approveBudget);

// Delete budget
router.delete('/:id', requireRole(['Super Admin', 'Pastor']), budgetsController.deleteBudget);

// Update budget actuals
router.put('/:id/actuals', requireRole(['Super Admin', 'Pastor', 'Treasurer']), budgetsController.updateBudgetActuals);

// Get budget variance
router.get('/:id/variance', budgetsController.getBudgetVariance);

module.exports = router;
