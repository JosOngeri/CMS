/**
 * @audit Approvals controller — approval requests, workflows, delegation.
 * @known All mutations + reads are church-scoped via req.user.church_id.
 *        Workflow exec/step/status delegate to helpers/workflowEngine (churchId
 *        param added). DELETE removes pending requests only (audit trail kept).
 * @deps   ApprovalsRepository, workflowEngine, migrations/052_approval_workflow_tables.sql
 */
const workflowEngine = require('../helpers/workflowEngine');
const BaseController = require('./BaseController');
const ApprovalsRepository = require('../repositories/ApprovalsRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const auditService = require('../services/auditService');
const { pool } = require('../config/database');
const { sendNotification } = require('../helpers/notify');

/**
 * Approvals Controller
 * Handles approval requests, workflow management, and approval delegation
 */
class ApprovalsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ApprovalsController');
  }

  /**
   * Get all approval requests with filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.filter] - Filter by status (all, pending, approved, rejected)
   * @param {string} [req.query.sort=created_at] - Sort field
   * @param {string} [req.query.order=desc] - Sort order
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getApprovals(req, res) {
    try {
      const { filter = 'all', sort = 'created_at', order = 'desc' } = req.query;
      const churchId = req.user.church_id;

      const status = filter === 'all' ? null : filter;
      const approvals = await ApprovalsRepository.getAll({ status, sort, order }, churchId);

      return ResponseHandler.success(res, { approvals });
    } catch (error) {
      this.logger.error('getApprovals', error);
      return ResponseHandler.error(res, 'Failed to fetch approvals');
    }
  }

  /**
   * Get pending approval count for current user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPendingCount(req, res) {
    try {
      const churchId = req.user.church_id;

      const count = await ApprovalsRepository.getPendingCount(churchId);

      return ResponseHandler.success(res, { count });
    } catch (error) {
      this.logger.error('getPendingCount', error);
      return ResponseHandler.error(res, 'Failed to fetch pending count');
    }
  }

  /**
   * Get approval request by ID with history and delegates
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Approval ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getApprovalById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const approval = await ApprovalsRepository.getWithDetails(id, churchId);

      if (!approval) {
        return ResponseHandler.error(res, 'Approval not found', 404);
      }

      return ResponseHandler.success(res, { approval });
    } catch (error) {
      this.logger.error('getApprovalById', error);
      return ResponseHandler.error(res, 'Failed to fetch approval');
    }
  }

  /**
   * Create an approval request
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Approval title
   * @param {string} req.body.description - Approval description
   * @param {string} req.body.request_type - Type of request
   * @param {Object} req.body.request_data - Request data
   * @param {string} [req.body.priority] - Priority level
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  /**
   * Users in this church who can approve requests — feeds the
   * "whose approval is needed" picker on every request form.
   */
  async getApprovers(req, res) {
    try {
      const { listApprovers } = require('../helpers/approvalResolver');
      const approvers = await listApprovers(req.user.church_id, req.user.id);
      return ResponseHandler.success(res, { approvers });
    } catch (error) {
      this.logger.error('getApprovers', error);
      return ResponseHandler.error(res, 'Failed to load approvers');
    }
  }

  async createApproval(req, res) {
    try {
      const { title, description, request_type, request_data, priority,
              approver_id, approver_role } = req.body;
      const churchId = req.user.church_id;

      // Every request must name whose approval is needed — a specific user
      // or an approver role we resolve inside this church.
      if (!approver_id && !approver_role) {
        return ResponseHandler.error(res, 'Select whose approval is needed (approver_id or approver_role)', 400);
      }

      const { resolveApprover } = require('../helpers/approvalResolver');
      const target = await resolveApprover(churchId, {
        approverId: approver_id || null,
        approverRole: approver_role || null,
        excludeUserId: req.user.id,
      });

      const approval = await ApprovalsRepository.create({
        title,
        description,
        request_type,
        request_data,
        requester_id: req.user.id,
        approver_id: target.id,
        priority
      }, churchId);

      // related_entity_id is uuid while approval ids are ints — the request
      // number goes in the body instead.
      await sendNotification(pool, {
        recipientId: target.id,
        type: 'approval_request',
        title: 'Approval needed',
        body: `${req.user.first_name} ${req.user.last_name} requested your approval: ${title} (#${approval.id})`,
        link: '/dashboard/approvals',
      }).catch(e => this.logger.error('approvalNotify', e));

      return ResponseHandler.success(res, { approval }, 'Approval created successfully', 201);
    } catch (error) {
      this.logger.error('createApproval', error);
      return ResponseHandler.error(res, error.statusCode ? error.message : 'Failed to create approval', error.statusCode || 500);
    }
  }

  /**
   * Approve an approval request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Approval ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.comment] - Approval comment
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const churchId = req.user.church_id;

      // Get old approval for audit log
      const oldApproval = await ApprovalsRepository.getWithDetails(id, churchId);

      const approval = await ApprovalsRepository.updateStatus(id, 'approved', req.user.id, comment, churchId);

      if (!approval) {
        return ResponseHandler.error(res, 'Approval not found', 404);
      }

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'APPROVE',
        'approvals',
        id,
        oldApproval,
        approval,
        req.ip,
        req.get('user-agent')
      );

      // Post subcommittee spend on approval (finance gate)
      if (oldApproval && oldApproval.request_type === 'department_spend') {
        await this.postDepartmentSpend(oldApproval, req.user.id).catch((e) =>
          this.logger.error('postDepartmentSpend', e)
        );
      }

      // Activate a proposed department budget on approval
      if (oldApproval && oldApproval.request_type === 'department_budget') {
        await this.activateDepartmentBudget(oldApproval).catch((e) =>
          this.logger.error('activateDepartmentBudget', e)
        );
      }

      return ResponseHandler.success(res, { approval }, 'Request approved successfully');
    } catch (error) {
      this.logger.error('approveRequest', error);
      return ResponseHandler.error(res, error.statusCode ? error.message : 'Failed to approve request', error.statusCode || 500);
    }
  }

  /**
   * Reject an approval request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Approval ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.comment] - Rejection comment
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const churchId = req.user.church_id;

      // Get old approval for audit log
      const oldApproval = await ApprovalsRepository.getWithDetails(id, churchId);

      const approval = await ApprovalsRepository.updateStatus(id, 'rejected', req.user.id, comment, churchId);

      if (!approval) {
        return ResponseHandler.error(res, 'Approval not found', 404);
      }

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'REJECT',
        'approvals',
        id,
        oldApproval,
        approval,
        req.ip,
        req.get('user-agent')
      );

      // Mark a rejected department budget
      if (oldApproval && oldApproval.request_type === 'department_budget') {
        const data = oldApproval.request_data || {};
        if (data.budget_id) {
          await pool.query(
            `UPDATE department_budgets SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
            [data.budget_id]
          ).catch((e) => this.logger.error('rejectBudget', e));
        }
      }

      return ResponseHandler.success(res, { approval }, 'Request rejected successfully');
    } catch (error) {
      this.logger.error('rejectRequest', error);
      return ResponseHandler.error(res, error.statusCode ? error.message : 'Failed to reject request', error.statusCode || 500);
    }
  }

  /**
   * Delete a pending approval request. Only pending requests are removable —
   * approved/rejected rows are audit history. Church-scoped.
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Approval ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteApproval(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const deleted = await ApprovalsRepository.deleteById(id, churchId);

      if (!deleted) {
        return ResponseHandler.error(res, 'Pending approval request not found — only pending requests can be deleted', 404);
      }

      await auditService.log(
        churchId,
        req.user.id,
        'DELETE',
        'approvals',
        id,
        null,
        null,
        req.ip,
        req.get('user-agent')
      );

      return ResponseHandler.success(res, null, 'Approval request deleted');
    } catch (error) {
      this.logger.error('deleteApproval', error);
      return ResponseHandler.error(res, 'Failed to delete approval request');
    }
  }

  /**
   * Activate a proposed department budget once its approval request passes.
   * request_data carries budget_id + department_id.
   * @param {Object} approval - The approval request row
   */
  async activateDepartmentBudget(approval) {
    const data = approval.request_data || {};
    if (!data.budget_id) return;
    await pool.query(
      `UPDATE department_budgets SET status = 'active', approval_request_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [data.budget_id, approval.id]
    );
    await sendNotification(pool, {
      recipientId: approval.requester_id,
      type: 'approval_approved',
      title: 'Budget approved',
      body: `Your department budget of KES ${Number(approval.amount || 0).toLocaleString()} is approved — you can now allocate it to members.`,
      link: `/dashboard/departments/${data.department_id || ''}`,
      relatedEntityType: 'approval_request', relatedEntityId: approval.id,
    });
  }

  /**
   * Post an approved subcommittee spend to the subcommittee's budget row
   * and notify the requester. request_data carries department_id,
   * subcommittee_id and the spend description.
   * @param {Object} approval - The approval request row
   * @param {string} approvedBy - Approving user id
   */
  async postDepartmentSpend(approval, approvedBy) {
    const data = approval.request_data || {};
    const subcommitteeId = data.subcommittee_id;
    const departmentId = data.department_id || approval.department_id;
    const amount = parseFloat(approval.amount) || 0;
    if (!departmentId || amount <= 0) return;

    // Upsert the subcommittee-scoped budget row and add the spend
    const fiscalYear = new Date().getFullYear().toString();
    const existing = await pool.query(
      `SELECT * FROM department_budgets
       WHERE department_id = $1 AND subcommittee_id IS NOT DISTINCT FROM $2
       ORDER BY created_at DESC LIMIT 1`,
      [departmentId, subcommitteeId]
    );
    if (existing.rows[0]) {
      await pool.query(
        `UPDATE department_budgets
         SET spent_amount = spent_amount + $2,
             remaining_amount = total_amount - (spent_amount + $2),
             updated_at = NOW()
         WHERE id = $1`,
        [existing.rows[0].id, amount]
      );
    } else {
      await pool.query(
        `INSERT INTO department_budgets
           (department_id, subcommittee_id, total_amount, spent_amount, remaining_amount, fiscal_year)
         VALUES ($1,$2,0,$3,-$3,$4)`,
        [departmentId, subcommitteeId, amount, fiscalYear]
      );
    }

    await sendNotification(pool, {
      recipientId: approval.requester_id,
      type: 'approval_approved',
      title: 'Spend request approved',
      body: `Your spend request of KES ${amount.toLocaleString()} has been approved and posted.`,
      link: `/dashboard/departments/${departmentId}`,
      relatedEntityType: 'approval_request', relatedEntityId: approval.id,
    });
  }

  /**
   * Bulk approve multiple approval requests
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array<string>} req.body.approvalIds - Array of approval IDs to approve
   * @param {string} [req.body.comment] - Optional comment for all approvals
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async bulkApprove(req, res) {
    try {
      const { approvalIds, comment } = req.body;
      const churchId = req.user.church_id;

      if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
        return ResponseHandler.validationError(res, [{
          field: 'approvalIds',
          message: 'approvalIds must be a non-empty array'
        }]);
      }

      const result = await ApprovalsRepository.bulkApprove(approvalIds, req.user.id, comment, churchId);

      return ResponseHandler.success(res, { 
        result,
        message: `Successfully approved ${result.successful} of ${result.total} requests`
      });
    } catch (error) {
      this.logger.error('bulkApprove', error);
      return ResponseHandler.error(res, 'Failed to bulk approve requests');
    }
  }

  /**
   * Bulk reject multiple approval requests
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {Array<string>} req.body.approvalIds - Array of approval IDs to reject
   * @param {string} [req.body.comment] - Optional comment for all rejections
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async bulkReject(req, res) {
    try {
      const { approvalIds, comment } = req.body;
      const churchId = req.user.church_id;

      if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
        return ResponseHandler.validationError(res, [{
          field: 'approvalIds',
          message: 'approvalIds must be a non-empty array'
        }]);
      }

      const result = await ApprovalsRepository.bulkReject(approvalIds, req.user.id, comment, churchId);

      return ResponseHandler.success(res, { 
        result,
        message: `Successfully rejected ${result.successful} of ${result.total} requests`
      });
    } catch (error) {
      this.logger.error('bulkReject', error);
      return ResponseHandler.error(res, 'Failed to bulk reject requests');
    }
  }

  /**
   * Delegate an approval request to another user
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Approval ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.delegateTo - User ID to delegate to
   * @param {string} [req.body.comment] - Delegation comment
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async delegateRequest(req, res) {
    try {
      const { id } = req.params;
      // Accept both spellings — web/Flutter send snake_case, some callers camelCase.
      const delegateTo = req.body.delegateTo || req.body.delegate_to;
      const delegateRole = req.body.delegateRole || req.body.delegate_role;
      const { comment } = req.body;
      const churchId = req.user.church_id;

      // Resolve the escalation target — explicit user, explicit role, then
      // the church's configured approvals.escalate_role (default First Elder).
      // Shared resolver keeps this identical to request-creation targeting.
      const { resolveApprover } = require('../helpers/approvalResolver');
      let target;
      try {
        target = await resolveApprover(churchId, {
          approverId: delegateTo || null,
          approverRole: delegateRole || null,
          excludeUserId: req.user.id,
        });
      } catch (e) {
        return ResponseHandler.error(res, e.message, e.statusCode || 400);
      }
      const targetId = target.id;

      // Get old approval for audit log
      const oldApproval = await ApprovalsRepository.getWithDetails(id, churchId);

      // assignApprover keeps the request 'pending' so the target can still
      // act on it — status 'delegated' would remove it from every queue.
      const approval = await ApprovalsRepository.assignApprover(id, targetId, req.user.id, comment, churchId);

      if (!approval) {
        return ResponseHandler.error(res, 'Approval not found', 404);
      }

      // related_entity_id is uuid while approval ids are ints — the request
      // number goes in the body instead.
      await sendNotification(pool, {
        recipientId: targetId,
        type: 'approval_delegated',
        title: 'Approval escalated to you',
        body: `${req.user.first_name || 'A leader'} ${req.user.last_name || ''} escalated "${oldApproval?.title || `request #${id}`}" to you for approval.`,
        link: '/dashboard/approvals',
      });

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'DELEGATE',
        'approvals',
        id,
        oldApproval,
        approval,
        req.ip,
        req.get('user-agent')
      );

      return ResponseHandler.success(res, { approval }, 'Request delegated successfully');
    } catch (error) {
      this.logger.error('delegateRequest', error);
      return ResponseHandler.error(res, error.statusCode ? error.message : 'Failed to delegate request', error.statusCode || 500);
    }
  }

  /**
   * Create a new approval workflow
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Workflow name
   * @param {string} req.body.description - Workflow description
   * @param {Array} req.body.steps - Workflow steps
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createWorkflow(req, res) {
    try {
      const { name, description, steps } = req.body;
      const workflow = await ApprovalsRepository.createWorkflow({
        name,
        description,
        steps,
        created_by: req.user.id
      }, req.user.church_id);
      return ResponseHandler.success(res, { workflow }, 'Workflow created successfully');
    } catch (error) {
      this.logger.error('createWorkflow', error);
      return ResponseHandler.error(res, 'Failed to create workflow');
    }
  }

  /**
   * Get all active approval workflows
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getWorkflows(req, res) {
    try {
      const workflows = await ApprovalsRepository.getActiveWorkflows(req.user.church_id);
      return ResponseHandler.success(res, { workflows });
    } catch (error) {
      this.logger.error('getWorkflows', error);
      return ResponseHandler.error(res, 'Failed to fetch workflows');
    }
  }

  /**
   * Get approval analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getApprovalAnalytics(req, res) {
    try {
      const analytics = await ApprovalsRepository.getApprovalAnalytics(req.user.church_id);
      return ResponseHandler.success(res, { analytics });
    } catch (error) {
      this.logger.error('getApprovalAnalytics', error);
      return ResponseHandler.error(res, 'Failed to fetch analytics');
    }
  }

  /**
   * Execute an approval workflow
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.workflowId - Workflow ID
   * @param {string} req.body.entityId - Entity ID
   * @param {string} req.body.entityType - Entity type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async executeWorkflow(req, res) {
    try {
      const { workflowId, entityId, entityType } = req.body;
      
      const result = await workflowEngine.executeWorkflow(
        workflowId,
        entityId,
        entityType,
        req.user.id,
        req.user.church_id
      );
      
      return ResponseHandler.success(res, result, 'Workflow executed successfully');
    } catch (error) {
      this.logger.error('executeWorkflow', error);
      return ResponseHandler.error(res, 'Failed to execute workflow');
    }
  }

  /**
   * Process a workflow step
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.approvalId - Approval ID
   * @param {Object} req.body - Request body
   * @param {number} req.body.stepIndex - Step index
   * @param {string} req.body.action - Action (approve/reject)
   * @param {string} [req.body.comment] - Comment
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async processWorkflowStep(req, res) {
    try {
      const { approvalId } = req.params;
      const { stepIndex, action, comment } = req.body;
      
      const result = await workflowEngine.processStep(
        approvalId,
        stepIndex,
        req.user.id,
        action,
        comment,
        req.user.church_id
      );
      
      return ResponseHandler.success(res, result, 'Workflow step processed successfully');
    } catch (error) {
      this.logger.error('processWorkflowStep', error);
      return ResponseHandler.error(res, 'Failed to process workflow step');
    }
  }

  /**
   * Get workflow status for an approval
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.approvalId - Approval ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getWorkflowStatus(req, res) {
    try {
      const { approvalId } = req.params;
      
      const result = await workflowEngine.getWorkflowStatus(approvalId, req.user.church_id);
      
      return ResponseHandler.success(res, result);
    } catch (error) {
      this.logger.error('getWorkflowStatus', error);
      return ResponseHandler.error(res, 'Failed to get workflow status');
    }
  }
}

module.exports = new ApprovalsController();
