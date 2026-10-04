/**
 * @audit Approval routes — all authenticated; approve/reject/delegate/delete
 *        gated to APPROVER_ROLES (migration 038 holders + Department Head,
 *        whose scope is limited to budgets of departments they head).
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

// Action roles mirror the approvals.approve grants in migration 038:
// Pastor + First Elder + Treasurer hold it outright; Department Head holds
// it with a scoped limit enforced by scopeApprovalAction below.
const APPROVER_ROLES = ['Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Department Head'];

// Department Heads may decide only budget-type requests belonging to a
// department they head — everything else must be escalated (delegated) to
// First Elder/Pastor. Delegation itself is allowed on any request type in
// their departments, since escalating an out-of-scope item is the intended
// path. Unrestricted roles skip the scope check entirely.
const DEPT_HEAD_TYPES = ['department_budget', 'department_spend', 'budget'];
function scopeApprovalAction(mode = 'act') {
  return async (req, res, next) => {
    try {
      const roles = req.user.roles || [];
      if (roles.some(r => ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'].includes(r))) {
        return next();
      }
      if (!roles.includes('Department Head')) {
        return res.status(403).json({ success: false, error: 'Insufficient role permissions' });
      }
      const ApprovalsRepository = require('../repositories/ApprovalsRepository');
      const db = require('../config/database');
      const pool = db.pool || db;
      const approval = await ApprovalsRepository.getById(req.params.id, req.user.church_id);
      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }
      const deptId = approval.department_id || approval.request_data?.department_id;
      if (!deptId) {
        return res.status(403).json({
          success: false,
          error: 'Department Heads may only act on requests in departments they head',
        });
      }
      const head = await pool.query(
        `SELECT 1 FROM departments d
         WHERE d.id = $1 AND d.church_id = $2
           AND (d.head_id = $3 OR EXISTS (
             SELECT 1 FROM department_leadership dl
             WHERE dl.department_id = d.id AND dl.user_id = $3
               AND dl.is_active AND dl.position ILIKE '%head%'))`,
        [deptId, req.user.church_id, req.user.id]
      );
      if (!head.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'You can only act on requests for departments you head',
        });
      }
      if (mode === 'act' && !DEPT_HEAD_TYPES.includes(approval.request_type)) {
        return res.status(403).json({
          success: false,
          error: 'Department Heads may only approve departmental budgets — escalate this request instead',
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Approvals CRUD (parameterised routes last)
router.get('/', requireRole(APPROVAL_READ_ROLES), approvalsController.getApprovals);
router.get('/:id', requireRole(APPROVAL_READ_ROLES), approvalsController.getApprovalById);
router.put('/:id/approve', requireRole(APPROVER_ROLES), scopeApprovalAction('act'), approvalsController.approveRequest);
router.put('/:id/reject', requireRole(APPROVER_ROLES), scopeApprovalAction('act'), approvalsController.rejectRequest);
router.post('/:id/reject', requireRole(APPROVER_ROLES), scopeApprovalAction('act'), approvalsController.rejectRequest);
router.delete('/:id', requireRole(APPROVER_ROLES), scopeApprovalAction('act'), approvalsController.deleteApproval);
router.put('/:id/delegate', requireRole(APPROVER_ROLES), scopeApprovalAction('delegate'), approvalsController.delegateRequest);
router.put('/:approvalId/step', requireRole(APPROVER_ROLES), approvalsController.processWorkflowStep);
router.get('/:approvalId/status', requireRole(APPROVAL_READ_ROLES), approvalsController.getWorkflowStatus);

module.exports = router;
