const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const reportsController = require('../controllers/reports.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Financial reports
router.get('/financial', reportsController.getFinancialReport);

// Department reports
router.get('/department', reportsController.getDepartmentReport);

// Attendance reports
router.get('/attendance', reportsController.getAttendanceReport);

// SMS reports
router.get('/sms', reportsController.getSMSReport);

// Approval reports
router.get('/approvals', reportsController.getApprovalReport);

// Membership reports
router.get('/membership-growth', reportsController.getMembershipGrowth);
router.get('/attendance-trend', reportsController.getAttendanceTrend);
router.get('/member-demographics', reportsController.getMemberDemographics);

// Export reports
router.get('/export', requireRole(['Super Admin', 'Pastor']), reportsController.exportReport);

// Custom report builder
router.post('/save', reportsController.saveReport);
router.get('/saved', reportsController.getSavedReports);
router.post('/generate', reportsController.generateCustomReport);

// Report scheduling
router.post('/schedule', reportsController.scheduleReport);
router.get('/scheduled', reportsController.getScheduledReports);
router.get('/scheduled/:reportId/executions', reportsController.getReportExecutions);

// Report templates
router.get('/templates', reportsController.getReportTemplates);

// Frontend compatibility: list saved reports, generate placeholder, and download
router.get('/', (req, res) => {
  res.json({ success: true, reports: [] });
});
router.post('/', (req, res) => {
  const { report_type, name, parameters } = req.body;
  res.status(201).json({
    success: true,
    report: {
      id: crypto.randomUUID(),
      report_type: report_type || 'custom',
      name: name || 'Generated Report',
      parameters: parameters || {},
      created_at: new Date().toISOString()
    }
  });
});
router.get('/:id/download', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=report_${req.params.id}.json`);
  res.json({ success: true, data: [] });
});

module.exports = router;