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

// Static routes must come before /:id to avoid shadowing
// Workflows
router.get('/workflows', approvalsController.getWorkflows);
router.post('/workflows', requireRole(['Super Admin', 'Pastor']), approvalsController.createWorkflow);

// Analytics
router.get('/analytics', approvalsController.getApprovalAnalytics);

// Pending count
router.get('/pending-count', approvalsController.getPendingCount);

// Workflow execution
router.post('/execute', approvalsController.executeWorkflow);

// Approvals CRUD (parameterised routes last)
router.get('/', approvalsController.getApprovals);
router.get('/:id', approvalsController.getApprovalById);
router.put('/:id/approve', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.approveRequest);
router.put('/:id/reject', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.rejectRequest);
router.post('/:id/reject', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.rejectRequest);
router.delete('/:id', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.deleteApproval);
router.put('/:id/delegate', requireRole(['Super Admin', 'Pastor', 'Department Head']), approvalsController.delegateRequest);
router.put('/:approvalId/step', approvalsController.processWorkflowStep);
router.get('/:approvalId/status', approvalsController.getWorkflowStatus);

module.exports = router;
