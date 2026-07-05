const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Dashboard stats
router.get('/dashboard', analyticsController.getDashboardStats);

// Member analytics
router.get('/member-growth', analyticsController.getMemberGrowth);
router.get('/member-demographics', analyticsController.getMemberDemographics);
router.get('/member-activity', analyticsController.getMemberActivity);

// Financial analytics
router.get('/financial-trends', analyticsController.getFinancialTrends);
router.get('/financial-summary', analyticsController.getFinancialSummary);
router.get('/contribution-trends', analyticsController.getContributionTrends);

// Department analytics
router.get('/department-activity', analyticsController.getDepartmentActivity);
router.get('/department-performance', analyticsController.getDepartmentPerformance);

// Attendance analytics
router.get('/attendance-trends', analyticsController.getAttendanceTrends);
router.get('/attendance-summary', analyticsController.getAttendanceSummary);

// Collection analytics
router.get('/collection-performance', analyticsController.getCollectionPerformance);
router.get('/collection-trends', analyticsController.getCollectionTrends);

// Event analytics
router.get('/event-engagement', analyticsController.getEventEngagement);
router.get('/event-attendance', analyticsController.getEventAttendance);

// SMS analytics
router.get('/sms-performance', analyticsController.getSMSPerformance);
router.get('/sms-delivery', analyticsController.getSMSDelivery);

// Custom analytics
router.get('/custom', analyticsController.getCustomAnalytics);
router.post('/export', analyticsController.exportAnalytics);

module.exports = router;