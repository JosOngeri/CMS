/**
 * @audit Approval routes — all authenticated; approve/reject/delegate/delete
 *        gated to Super Admin/Pastor/Department Head.
 * @known Static routes (/workflows, /analytics, /pending-count, /execute) must
 *        stay above /:id or they are shadowed.
 */
const express = require('express');
const router = express.Router();
const approvalsController = require('../controllers/approvals.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Read-side leadership gate — mirrors the approvals.view grant in migration
// 038 (Member/Child/Collector have no approvals access). Without this, any
// logged-in member could list every approval request in the church.
const APPROVAL_READ_ROLES = [
  'Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Elder',
  'Church Board Member', 'Department Head', 'Assistant Department Head',
  'Deacon', 'Deaconess', 'Subcommittee Head',
];

// Static routes must come before /:id to avoid shadowing
// Workflows
router.get('/workflows', requireRole(APPROVAL_READ_ROLES), approvalsController.getWorkflows);
router.post('/workflows', requireRole(['Super Admin', 'Pastor']), approvalsController.createWorkflow);

// Analytics
router.get('/analytics', requireRole(APPROVAL_READ_ROLES), approvalsController.getApprovalAnalytics);

// Pending count
router.get('/pending-count', requireRole(APPROVAL_READ_ROLES), approvalsController.getPendingCount);

// Workflow execution
router.post('/execute', requireRole(['Super Admin', 'Pastor', 'Department Head', 'Treasurer']), approvalsController.executeWorkflow);

// Approvals CRUD (parameterised routes last)
router.get('/', requireRole(APPROVAL_READ_ROLES), approvalsController.getApprovals);
router.get('/:id', requireRole(APPROVAL_READ_ROLES), approvalsController.getApprovalById);
router.put('/:id/approve', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.approveRequest);
router.put('/:id/reject', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.rejectRequest);
router.post('/:id/reject', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.rejectRequest);
router.delete('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.deleteApproval);
router.put('/:id/delegate', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.delegateRequest);
router.put('/:approvalId/step', requireRole(['Super Admin', 'Pastor', 'Department Head', 'Treasurer']), approvalsController.processWorkflowStep);
router.get('/:approvalId/status', requireRole(APPROVAL_READ_ROLES), approvalsController.getWorkflowStatus);

module.exports = router;
