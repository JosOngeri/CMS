const express = require('express');
const router = express.Router();
const memberGivingController = require('../controllers/memberGiving.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get member giving history
router.get('/history', memberGivingController.getMemberGivingHistory);

// Get member giving summary
router.get('/summary', memberGivingController.getMemberGivingSummary);

// Get member giving trends
router.get('/trends', memberGivingController.getMemberGivingTrends);

// Get top givers
router.get('/top', requireRole(['Super Admin', 'Pastor', 'Treasurer']), memberGivingController.getTopGivers);

// Get member giving comparison (year over year)
router.get('/comparison', memberGivingController.getMemberGivingComparison);

// Get giving by department
router.get('/by-department', requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), memberGivingController.getGivingByDepartment);

module.exports = router;
