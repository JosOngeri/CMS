const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Every report exposes church-wide aggregates (finances, attendance, SMS) —
// gate the whole router to roles holding reports.view in migration 038;
// members never see these pages in the UI and must not reach them by API.
const REPORT_READ_ROLES = [
  'Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Elder',
  'Church Board Member', 'Department Head', 'Assistant Department Head',
  'Deacon', 'Deaconess', 'Subcommittee Head',
];
router.use(requireRole(REPORT_READ_ROLES));

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
router.post('/generate', requireRole(['Super Admin', 'Pastor', 'Treasurer']), reportsController.generateCustomReport);

// Report scheduling
router.post('/schedule', reportsController.scheduleReport);
router.get('/scheduled', reportsController.getScheduledReports);
router.get('/scheduled/:reportId/executions', reportsController.getReportExecutions);

// Report templates
router.get('/templates', reportsController.getReportTemplates);

// Generated reports: list, create (runs the type's generator + persists a
// reports row), download (regenerates from stored parameters per church)
router.get('/', reportsController.listReports);
router.post('/', requireRole(['Super Admin', 'Pastor', 'Treasurer']), reportsController.createReport);
router.get('/:id/download', reportsController.downloadReport);

module.exports = router;