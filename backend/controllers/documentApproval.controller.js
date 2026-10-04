/**
 * @audit Document approval controller — thin wrapper over documentApprovalService.
 * @known Passes req.user.church_id into every service call; eligibility,
 *        self-approval, and duplicate-vote rules live in the service.
 */
const BaseController = require('./BaseController');
const DocumentApprovalService = require('../services/documentApprovalService');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Document Approval Controller (Phase 14)
 * Manages document approval workflow with multi-level approvals
 */
class DocumentApprovalController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DocumentApprovalController');
  }

  /**
   * Create document approval request
   */
  async createApprovalRequest(req, res) {
    const { documentId, departmentId, approvalLevel, metadata } = req.body;
    const requesterId = req.user.id;

    if (!documentId || !departmentId || !approvalLevel) {
      return this.badRequest(res, 'documentId, departmentId, and approvalLevel are required');
    }

    try {
      const approvalRequest = await DocumentApprovalService.createApprovalRequest({
        documentId,
        requesterId,
        departmentId,
        approvalLevel,
        churchId: req.user.church_id,
        metadata: { ...metadata, requesterName: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'A user' }
      });

      this.created(res, approvalRequest);
    } catch (error) {
      this.logger.error('createApprovalRequest', error);
      if (/not found/i.test(error.message)) {
        return this.notFound(res, error.message);
      }
      this.error(res, 'Failed to create approval request');
    }
  }

  /**
   * Approve document
   */
  async approveDocument(req, res) {
    const { approvalRequestId } = req.params;
    const { comments } = req.body;
    const approverId = req.user.id;

    try {
      const result = await DocumentApprovalService.approveDocument(approvalRequestId, approverId, comments, req.user.church_id);
      this.success(res, { message: 'Document approved successfully', result });
    } catch (error) {
      this.logger.error('approveDocument', error);
      if (/not pending|own request|not an approver|already approved|not found/i.test(error.message)) {
        return this.badRequest(res, error.message);
      }
      this.error(res, 'Failed to approve document');
    }
  }

  /**
   * Reject document
   */
  async rejectDocument(req, res) {
    const { approvalRequestId } = req.params;
    const { comments } = req.body;
    const approverId = req.user.id;

    try {
      const result = await DocumentApprovalService.rejectDocument(approvalRequestId, approverId, comments, req.user.church_id);
      this.success(res, { message: 'Document rejected successfully', result });
    } catch (error) {
      this.logger.error('rejectDocument', error);
      if (/not pending|own request|not an approver|already|not found/i.test(error.message)) {
        return this.badRequest(res, error.message);
      }
      this.error(res, 'Failed to reject document');
    }
  }

  /**
   * Get approval request details
   */
  async getApprovalRequest(req, res) {
    const { approvalRequestId } = req.params;

    try {
      const request = await DocumentApprovalService.getApprovalRequest(approvalRequestId, req.user.church_id);

      if (!request) {
        return this.notFound(res, 'Approval request not found');
      }

      this.success(res, request);
    } catch (error) {
      this.logger.error('getApprovalRequest', error);
      if (error.code === '22P02') {
        return this.notFound(res, 'Approval request not found');
      }
      this.error(res, 'Failed to get approval request');
    }
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(req, res) {
    const userId = req.user.id;

    try {
      const approvals = await DocumentApprovalService.getPendingApprovals(userId, req.user.church_id);
      this.success(res, approvals);
    } catch (error) {
      this.logger.error('getPendingApprovals', error);
      this.error(res, 'Failed to get pending approvals');
    }
  }

  /**
   * Get approval history for a document
   */
  async getDocumentApprovalHistory(req, res) {
    const { documentId } = req.params;

    try {
      const history = await DocumentApprovalService.getDocumentApprovalHistory(documentId, req.user.church_id);
      this.success(res, history);
    } catch (error) {
      this.logger.error('getDocumentApprovalHistory', error);
      this.error(res, 'Failed to get approval history');
    }
  }
}

module.exports = new DocumentApprovalController();
