const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
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

    try {
      const approvalRequest = await DocumentApprovalService.createApprovalRequest({
        documentId,
        requesterId,
        departmentId,
        approvalLevel,
        metadata: { ...metadata, requesterName: req.user.name }
      });

      return ResponseHandler.success(res, approvalRequest, 'Approval request created successfully', 201);
    } catch (error) {
      this.logger.error('createApprovalRequest', error);
      return ResponseHandler.error(res, 'Failed to create approval request');
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
      const result = await DocumentApprovalService.approveDocument(approvalRequestId, approverId, comments);
      return ResponseHandler.success(res, result, 'Document approved successfully');
    } catch (error) {
      this.logger.error('approveDocument', error);
      return ResponseHandler.error(res, 'Failed to approve document');
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
      const result = await DocumentApprovalService.rejectDocument(approvalRequestId, approverId, comments);
      return ResponseHandler.success(res, result, 'Document rejected successfully');
    } catch (error) {
      this.logger.error('rejectDocument', error);
      return ResponseHandler.error(res, 'Failed to reject document');
    }
  }

  /**
   * Get approval request details
   */
  async getApprovalRequest(req, res) {
    const { approvalRequestId } = req.params;

    try {
      const request = await DocumentApprovalService.getApprovalRequest(approvalRequestId);
      
      if (!request) {
        return ResponseHandler.error(res, 'Approval request not found', 404);
      }

      return ResponseHandler.success(res, request);
    } catch (error) {
      this.logger.error('getApprovalRequest', error);
      return ResponseHandler.error(res, 'Failed to get approval request');
    }
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(req, res) {
    const userId = req.user.id;

    try {
      const approvals = await DocumentApprovalService.getPendingApprovals(userId);
      return ResponseHandler.success(res, approvals);
    } catch (error) {
      this.logger.error('getPendingApprovals', error);
      return ResponseHandler.error(res, 'Failed to get pending approvals');
    }
  }

  /**
   * Get approval history for a document
   */
  async getDocumentApprovalHistory(req, res) {
    const { documentId } = req.params;

    try {
      const history = await DocumentApprovalService.getDocumentApprovalHistory(documentId);
      return ResponseHandler.success(res, history);
    } catch (error) {
      this.logger.error('getDocumentApprovalHistory', error);
      return ResponseHandler.error(res, 'Failed to get approval history');
    }
  }
}

module.exports = new DocumentApprovalController();
