const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');

// Get dashboard overview (aggregated stats)
router.get('/overview', authenticateToken, dashboardController.getStats.bind(dashboardController));

// Get dashboard statistics
router.get('/stats', authenticateToken, dashboardController.getStats.bind(dashboardController));

// Get recent activity
router.get('/activity', authenticateToken, dashboardController.getActivity.bind(dashboardController));

// Get personal stats for member dashboard
router.get('/personal-stats', authenticateToken, dashboardController.getPersonalStats.bind(dashboardController));

// Get personal status metrics
router.get('/personal-status', authenticateToken, dashboardController.getPersonalStatus.bind(dashboardController));

// Get personal activity feed
router.get('/personal-activity', authenticateToken, dashboardController.getPersonalActivity.bind(dashboardController));

// System Health (Super Admin)
router.get('/system-health', authenticateToken, dashboardController.getSystemHealth.bind(dashboardController));

// Department Stats (Department Head)
router.get('/department-stats', authenticateToken, dashboardController.getDepartmentStats.bind(dashboardController));

// Ministry Health (Pastor)
router.get('/ministry-health', authenticateToken, dashboardController.getMinistryHealth.bind(dashboardController));

// Financial Stats (Treasurer)
router.get('/financial-stats', authenticateToken, dashboardController.getFinancialStats.bind(dashboardController));

// Financial Health (Treasurer)
router.get('/financial-health', authenticateToken, dashboardController.getFinancialHealth.bind(dashboardController));

// Transactions (Treasurer)
router.get('/transactions', authenticateToken, dashboardController.getTransactions.bind(dashboardController));

module.exports = router;
