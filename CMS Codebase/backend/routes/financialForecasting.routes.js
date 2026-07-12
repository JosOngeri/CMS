const express = require('express');
const router = express.Router();
const financialForecastingController = require('../controllers/financialForecasting.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get revenue forecast
router.get('/revenue', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialForecastingController.getRevenueForecast);

// Get expense forecast
router.get('/expense', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialForecastingController.getExpenseForecast);

// Get budget forecast
router.get('/budget/:budget_id', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialForecastingController.getBudgetForecast);

// Get cash flow forecast
router.get('/cash-flow', requireRole(['Super Admin', 'Pastor', 'Treasurer']), financialForecastingController.getCashFlowForecast);

module.exports = router;
