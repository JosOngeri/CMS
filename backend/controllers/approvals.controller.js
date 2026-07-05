const workflowEngine = require('../helpers/workflowEngine');
const BaseController = require('./BaseController');
const ApprovalsRepository = require('../repositories/ApprovalsRepository');
const { createLogger } = require('../helpers/controllerLogger');

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

      res.json({ success: true, approvals });
    } catch (error) {
      this.logger.error('getApprovals', error);
      res.status(500).json({ success: false, error: 'Failed to fetch approvals' });
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

      res.json({ success: true, count });
    } catch (error) {
      this.logger.error('getPendingCount', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pending count' });
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
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }

      res.json({ success: true, approval });
    } catch (error) {
      this.logger.error('getApprovalById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch approval' });
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
  async createApproval(req, res) {
    try {
      const { title, description, request_type, request_data, priority } = req.body;
      const churchId = req.user.church_id;

      const approval = await ApprovalsRepository.create({
        title,
        description,
        request_type,
        request_data,
        requester_id: req.user.id,
        priority
      }, churchId);

      res.status(201).json({ success: true, approval });
    } catch (error) {
      this.logger.error('createApproval', error);
      res.status(500).json({ success: false, error: 'Failed to create approval' });
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

      const approval = await ApprovalsRepository.updateStatus(id, 'approved', req.user.id, comment, churchId);

      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }

      res.json({ success: true, approval });
    } catch (error) {
      this.logger.error('approveRequest', error);
      res.status(500).json({ success: false, error: 'Failed to approve request' });
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

      const approval = await ApprovalsRepository.updateStatus(id, 'rejected', req.user.id, comment, churchId);

      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }

      res.json({ success: true, approval });
    } catch (error) {
      this.logger.error('rejectRequest', error);
      res.status(500).json({ success: false, error: 'Failed to reject request' });
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
      const { delegateTo, comment } = req.body;
      const churchId = req.user.church_id;

      // For now, we'll keep this simple and just update the status to delegated
      const approval = await ApprovalsRepository.updateStatus(id, 'delegated', req.user.id, comment, churchId);

      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval not found' });
      }

      res.json({ success: true, approval });
    } catch (error) {
      this.logger.error('delegateRequest', error);
      res.status(500).json({ success: false, error: 'Failed to delegate request' });
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
      });
      res.json({ success: true, workflow });
    } catch (error) {
      this.logger.error('createWorkflow', error);
      res.status(500).json({ success: false, error: 'Failed to create workflow' });
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
      const workflows = await ApprovalsRepository.getActiveWorkflows();
      res.json({ success: true, workflows });
    } catch (error) {
      this.logger.error('getWorkflows', error);
      res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
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
      const analytics = await ApprovalsRepository.getApprovalAnalytics();
      res.json({ success: true, analytics });
    } catch (error) {
      this.logger.error('getApprovalAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
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
        req.user.id
      );
      
      res.json({ success: true, ...result });
    } catch (error) {
      this.logger.error('executeWorkflow', error);
      res.status(500).json({ success: false, error: 'Failed to execute workflow' });
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
        comment
      );
      
      res.json({ success: true, ...result });
    } catch (error) {
      this.logger.error('processWorkflowStep', error);
      res.status(500).json({ success: false, error: 'Failed to process workflow step' });
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
      
      const result = await workflowEngine.getWorkflowStatus(approvalId);
      
      res.json(result);
    } catch (error) {
      this.logger.error('getWorkflowStatus', error);
      res.status(500).json({ success: false, error: 'Failed to get workflow status' });
    }
  }
}

module.exports = new ApprovalsController();
