const { pool } = require('../config/database');
const logger = require('../config/logging');
const notificationService = require('./notificationService');

/**
 * Document Approval Service (Phase 14)
 * Manages document approval workflow with multi-level approvals
 * Integrates with existing approval_requests table
 */
class DocumentApprovalService {
  constructor() {
    this.approvalLevels = {
      'basic': 1,
      'standard': 2,
      'critical': 3
    };
  }

  /**
   * Create document approval request
   * @param {object} data - Approval request data
   * @returns {Promise<object>} Approval request
   */
  async createApprovalRequest(data) {
    const { documentId, requesterId, departmentId, approvalLevel = 'standard', metadata = {} } = data;

    try {
      const requiredApprovals = this.approvalLevels[approvalLevel] || 2;

      // Create approval request
      const result = await pool.query(
        `INSERT INTO approval_requests 
         (requester_id, department_id, request_type, entity_type, entity_id, status, metadata, requested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          requesterId,
          departmentId,
          'document_approval',
          'document',
          documentId,
          'pending',
          JSON.stringify({ ...metadata, approvalLevel, requiredApprovals })
        ]
      );

      const approvalRequest = result.rows[0];

      // Get approvers for the department
      const approvers = await this.getApprovers(departmentId, approvalLevel);

      // Send notifications to approvers
      for (const approver of approvers) {
        await notificationService.createFromTemplate(
          'approval_request',
          {
            documentId,
            requesterName: metadata.requesterName || 'A user',
            documentTitle: metadata.documentTitle || 'Document',
            approvalLevel
          },
          approver.id,
          approver.church_id
        );
      }

      logger.info(`Document approval request created: ${documentId} by ${requesterId}`);
      return approvalRequest;
    } catch (error) {
      logger.error('Failed to create document approval request:', error);
      throw error;
    }
  }

  /**
   * Get approvers for a department based on approval level
   * @param {string} departmentId - Department ID
   * @param {string} approvalLevel - Approval level
   * @returns {Promise<object[]>} Approvers
   */
  async getApprovers(departmentId, approvalLevel) {
    const roles = {
      'basic': ['admin', 'moderator'],
      'standard': ['admin', 'moderator'],
      'critical': ['admin', 'moderator', 'super_admin']
    };

    const allowedRoles = roles[approvalLevel] || roles['standard'];

    const query = `
      SELECT u.id, u.church_id, u.name, u.email
      FROM users u
      INNER JOIN department_members dm ON u.id = dm.user_id
      WHERE dm.department_id = $1
        AND dm.role = ANY($2)
        AND dm.approval_status = 'approved'
    `;

    const result = await pool.query(query, [departmentId, allowedRoles]);
    return result.rows;
  }

  /**
   * Approve document
   * @param {string} approvalRequestId - Approval request ID
   * @param {string} approverId - Approver user ID
   * @param {string} comments - Approval comments
   * @returns {Promise<object>} Updated approval request
   */
  async approveDocument(approvalRequestId, approverId, comments = null) {
    try {
      // Get approval request
      const request = await this.getApprovalRequest(approvalRequestId);
      if (!request) {
        throw new Error('Approval request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Approval request is not pending');
      }

      // Get current approval count
      const currentApprovals = await this.getApprovalCount(approvalRequestId);
      const requiredApprovals = request.metadata?.requiredApprovals || 2;

      if (currentApprovals >= requiredApprovals) {
        // All approvals received, mark as approved
        const result = await pool.query(
          `UPDATE approval_requests
           SET status = 'approved',
               approver_id = $1,
               approved_at = CURRENT_TIMESTAMP,
               comments = $2
           WHERE id = $3
           RETURNING *`,
          [approverId, comments, approvalRequestId]
        );

        // Update document status
        await this.updateDocumentStatus(request.entity_id, 'approved');

        // Notify requester
        await notificationService.createFromTemplate(
          'approval_approved',
          {
            documentTitle: request.metadata?.documentTitle || 'Document',
            approverName: comments || 'An approver'
          },
          request.requester_id,
          request.church_id
        );

        logger.info(`Document approved: ${request.entity_id}`);
        return result.rows[0];
      } else {
        // Add approval
        await this.addApproval(approvalRequestId, approverId, comments);
        
        // Notify requester of progress
        await notificationService.createFromTemplate(
          'approval_progress',
          {
            documentTitle: request.metadata?.documentTitle || 'Document',
            currentApprovals: currentApprovals + 1,
            requiredApprovals
          },
          request.requester_id,
          request.church_id
        );

        return { status: 'partial_approval', currentApprovals: currentApprovals + 1, requiredApprovals };
      }
    } catch (error) {
      logger.error('Failed to approve document:', error);
      throw error;
    }
  }

  /**
   * Reject document
   * @param {string} approvalRequestId - Approval request ID
   * @param {string} approverId - Approver user ID
   * @param {string} comments - Rejection reason
   * @returns {Promise<object>} Updated approval request
   */
  async rejectDocument(approvalRequestId, approverId, comments) {
    try {
      const result = await pool.query(
        `UPDATE approval_requests
         SET status = 'rejected',
             approver_id = $1,
             rejected_at = CURRENT_TIMESTAMP,
             comments = $2
         WHERE id = $3
         RETURNING *`,
        [approverId, comments, approvalRequestId]
      );

      const request = result.rows[0];

      // Update document status
      await this.updateDocumentStatus(request.entity_id, 'rejected');

      // Notify requester
      await notificationService.createFromTemplate(
        'approval_rejected',
        {
          documentTitle: request.metadata?.documentTitle || 'Document',
          rejectionReason: comments || 'No reason provided'
        },
        request.requester_id,
        request.church_id
      );

      logger.info(`Document rejected: ${request.entity_id}`);
      return request;
    } catch (error) {
      logger.error('Failed to reject document:', error);
      throw error;
    }
  }

  /**
   * Get approval request
   * @param {string} approvalRequestId - Approval request ID
   * @returns {Promise<object>} Approval request
   */
  async getApprovalRequest(approvalRequestId) {
    const query = `
      SELECT ar.*, 
             u.name as requester_name,
             d.name as department_name
      FROM approval_requests ar
      LEFT JOIN users u ON ar.requester_id = u.id
      LEFT JOIN departments d ON ar.department_id = d.id
      WHERE ar.id = $1
    `;
    const result = await pool.query(query, [approvalRequestId]);
    return result.rows[0] || null;
  }

  /**
   * Get approval count for a request
   * @param {string} approvalRequestId - Approval request ID
   * @returns {Promise<number>} Approval count
   */
  async getApprovalCount(approvalRequestId) {
    const query = `
      SELECT COUNT(*) as count
      FROM document_approvals
      WHERE approval_request_id = $1
    `;
    const result = await pool.query(query, [approvalRequestId]);
    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Add approval to request
   * @param {string} approvalRequestId - Approval request ID
   * @param {string} approverId - Approver user ID
   * @param {string} comments - Approval comments
   */
  async addApproval(approvalRequestId, approverId, comments) {
    const query = `
      INSERT INTO document_approvals (approval_request_id, approver_id, comments, approved_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;
    await pool.query(query, [approvalRequestId, approverId, comments]);
  }

  /**
   * Update document status
   * @param {string} documentId - Document ID
   * @param {string} status - New status
   */
  async updateDocumentStatus(documentId, status) {
    const query = `
      UPDATE documents
      SET approval_status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [status, documentId]);
  }

  /**
   * Get pending approvals for a user
   * @param {string} userId - User ID
   * @returns {Promise<object[]>} Pending approvals
   */
  async getPendingApprovals(userId) {
    const query = `
      SELECT ar.*, 
             u.name as requester_name,
             d.name as department_name,
             doc.title as document_title,
             doc.file_path
      FROM approval_requests ar
      LEFT JOIN users u ON ar.requester_id = u.id
      LEFT JOIN departments d ON ar.department_id = d.id
      LEFT JOIN documents doc ON ar.entity_id = doc.id
      WHERE ar.status = 'pending'
        AND ar.request_type = 'document_approval'
        AND ar.department_id IN (
          SELECT department_id FROM department_members WHERE user_id = $1
        )
      ORDER BY ar.requested_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get approval history for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<object[]>} Approval history
   */
  async getDocumentApprovalHistory(documentId) {
    const query = `
      SELECT ar.*, 
             u.name as approver_name,
             da.comments,
             da.approved_at
      FROM approval_requests ar
      LEFT JOIN document_approvals da ON ar.id = da.approval_request_id
      LEFT JOIN users u ON da.approver_id = u.id
      WHERE ar.entity_id = $1
        AND ar.request_type = 'document_approval'
      ORDER BY ar.requested_at DESC
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  }
}

module.exports = new DocumentApprovalService();
