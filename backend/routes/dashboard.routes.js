const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
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
router.get('/system-health', authenticateToken,
  requireRole(['Super Admin']),
  dashboardController.getSystemHealth.bind(dashboardController));

// Department Stats (Department Head)
router.get('/department-stats', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Department Head']),
  dashboardController.getDepartmentStats.bind(dashboardController));

// Ministry Health (Pastor)
router.get('/ministry-health', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  dashboardController.getMinistryHealth.bind(dashboardController));

// Financial Stats (Treasurer)
router.get('/financial-stats', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'Treasurer']),
  dashboardController.getFinancialStats.bind(dashboardController));

// Financial Health (Treasurer)
router.get('/financial-health', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'Treasurer']),
  dashboardController.getFinancialHealth.bind(dashboardController));

// Transactions (Treasurer)
router.get('/transactions', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'Treasurer']),
  dashboardController.getTransactions.bind(dashboardController));

// Department Health (Department Head) - Phase 21.1
router.get('/department-health', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Department Head']),
  dashboardController.getDepartmentHealth.bind(dashboardController));

// Department Activity (Department Head) - Phase 21.1
router.get('/department-activity', authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Department Head']),
  dashboardController.getDepartmentActivity.bind(dashboardController));

module.exports = router;
