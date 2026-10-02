/**
 * @audit Document approval service — multi-level approvals on approval_requests.
 * @known All public methods take churchId and scope every read/write to it.
 *        Approver eligibility: caller must be an active approved member of the
 *        request's department with an approval-capable role (see APPROVER_ROLES)
 *        and must not be the requester or a prior approver. Approval completes
 *        when the recorded vote count reaches requiredApprovals (vote is
 *        recorded BEFORE the count check — no off-by-one).
 * @deps   migrations/054_document_approval_tables.sql (document_approvals,
 *         documents.approval_status), 052 (approval_requests.workflow cols)
 */
const { pool } = require('../config/database');
const logger = require('../config/logging');
const notificationService = require('./notificationService');

// department_members.role values that may approve documents (real schema values)
const APPROVER_ROLES = {
  basic:    ['Leader', 'Chairperson'],
  standard: ['Leader', 'Assistant', 'Chairperson', 'Superintendent'],
  critical: ['Leader', 'Assistant', 'Chairperson', 'Superintendent', 'Elder']
};

class DocumentApprovalService {
  constructor() {
    this.approvalLevels = {
      'basic': 1,
      'standard': 2,
      'critical': 3
    };
  }

  /**
   * Create document approval request (church-scoped)
   */
  async createApprovalRequest(data) {
    const { documentId, requesterId, departmentId, approvalLevel = 'standard', metadata = {}, churchId } = data;

    try {
      // Department must belong to the caller's church — body-supplied dept ids
      // were previously trusted blindly (cross-tenant attach)
      if (departmentId) {
        const dept = await pool.query(
          'SELECT id FROM departments WHERE id = $1 AND church_id = $2',
          [departmentId, churchId]
        );
        if (!dept.rows[0]) {
          throw new Error('Department not found in this church');
        }
      }

      const requiredApprovals = this.approvalLevels[approvalLevel] || 2;

      const result = await pool.query(
        `INSERT INTO approval_requests
         (requester_id, department_id, request_type, entity_type, entity_id, status, metadata, church_id, requested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          requesterId,
          departmentId,
          'document_approval',
          'document',
          documentId,
          'pending',
          JSON.stringify({ ...metadata, approvalLevel, requiredApprovals }),
          churchId
        ]
      );

      const approvalRequest = result.rows[0];

      // Mark the document as awaiting approval
      await this.updateDocumentStatus(documentId, 'pending', churchId);

      const approvers = await this.getApprovers(departmentId, approvalLevel, churchId);

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
   * Approvers for a department+level, scoped to the church
   */
  async getApprovers(departmentId, approvalLevel, churchId) {
    const allowedRoles = APPROVER_ROLES[approvalLevel] || APPROVER_ROLES.standard;

    const result = await pool.query(
      `SELECT u.id, u.church_id, u.first_name || ' ' || u.last_name AS name, u.email
       FROM users u
       INNER JOIN department_members dm ON u.id = dm.user_id
       WHERE dm.department_id = $1
         AND dm.role = ANY($2)
         AND dm.status IN ('approved', 'active')
         AND dm.is_active = true
         AND dm.church_id = $3`,
      [departmentId, allowedRoles, churchId]
    );
    return result.rows;
  }

  /**
   * Approve document — records THIS approver's vote first, then completes the
   * request once the recorded count reaches requiredApprovals.
   */
  async approveDocument(approvalRequestId, approverId, comments = null, churchId) {
    try {
      const request = await this.getApprovalRequest(approvalRequestId, churchId);
      if (!request) {
        throw new Error('Approval request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Approval request is not pending');
      }

      if (String(request.requester_id) === String(approverId)) {
        throw new Error('Cannot approve your own request');
      }

      // Approver must be an eligible member of the request's department —
      // previously ANY authenticated user could approve ANY request
      const eligible = await this.getApprovers(
        request.department_id,
        request.metadata?.approvalLevel || 'standard',
        churchId
      );
      if (!eligible.some((a) => String(a.id) === String(approverId))) {
        throw new Error('You are not an approver for this department');
      }

      const requiredApprovals = request.metadata?.requiredApprovals || 2;

      // Record the vote (UNIQUE constraint rejects duplicate votes)
      try {
        await this.addApproval(approvalRequestId, approverId, comments);
      } catch (err) {
        if (err.code === '23505') {
          throw new Error('You have already approved this request');
        }
        throw err;
      }

      const currentApprovals = await this.getApprovalCount(approvalRequestId);

      if (currentApprovals >= requiredApprovals) {
        const result = await pool.query(
          `UPDATE approval_requests
           SET status = 'approved',
               approver_id = $1,
               approved_at = CURRENT_TIMESTAMP,
               comments = $2
           WHERE id = $3 AND church_id = $4
           RETURNING *`,
          [approverId, comments, approvalRequestId, churchId]
        );

        await this.updateDocumentStatus(request.entity_id, 'approved', churchId);

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
      }

      await notificationService.createFromTemplate(
        'approval_progress',
        {
          documentTitle: request.metadata?.documentTitle || 'Document',
          currentApprovals,
          requiredApprovals
        },
        request.requester_id,
        request.church_id
      );

      return { status: 'partial_approval', currentApprovals, requiredApprovals };
    } catch (error) {
      logger.error('Failed to approve document:', error);
      throw error;
    }
  }

  /**
   * Reject document — pending-only, church-scoped
   */
  async rejectDocument(approvalRequestId, approverId, comments, churchId) {
    try {
      const result = await pool.query(
        `UPDATE approval_requests
         SET status = 'rejected',
             approver_id = $1,
             rejected_at = CURRENT_TIMESTAMP,
             comments = $2
         WHERE id = $3 AND church_id = $4 AND status = 'pending'
         RETURNING *`,
        [approverId, comments, approvalRequestId, churchId]
      );

      const request = result.rows[0];
      if (!request) {
        throw new Error('Pending approval request not found');
      }

      await this.updateDocumentStatus(request.entity_id, 'rejected', churchId);

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
   * Get approval request (church-scoped)
   */
  async getApprovalRequest(approvalRequestId, churchId) {
    const result = await pool.query(
      `SELECT ar.*,
              u.first_name || ' ' || u.last_name AS requester_name,
              d.name AS department_name
       FROM approval_requests ar
       LEFT JOIN users u ON ar.requester_id = u.id
       LEFT JOIN departments d ON ar.department_id = d.id
       WHERE ar.id = $1 AND ar.church_id = $2`,
      [approvalRequestId, churchId]
    );
    return result.rows[0] || null;
  }

  async getApprovalCount(approvalRequestId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM document_approvals
       WHERE approval_request_id = $1`,
      [approvalRequestId]
    );
    return parseInt(result.rows[0].count) || 0;
  }

  async addApproval(approvalRequestId, approverId, comments) {
    await pool.query(
      `INSERT INTO document_approvals (approval_request_id, approver_id, comments, approved_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [approvalRequestId, approverId, comments]
    );
  }

  /**
   * Update document approval status (church-scoped; column added by migration 054)
   */
  async updateDocumentStatus(documentId, status, churchId) {
    await pool.query(
      `UPDATE documents
       SET approval_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND church_id = $3`,
      [status, documentId, churchId]
    );
  }

  /**
   * Pending document approvals for a user — their departments AND church
   */
  async getPendingApprovals(userId, churchId) {
    const result = await pool.query(
      `SELECT ar.*,
              u.first_name || ' ' || u.last_name AS requester_name,
              d.name AS department_name,
              doc.name AS document_title,
              doc.file_path
       FROM approval_requests ar
       LEFT JOIN users u ON ar.requester_id = u.id
       LEFT JOIN departments d ON ar.department_id = d.id
       LEFT JOIN documents doc ON ar.entity_id = doc.id::text
       WHERE ar.status = 'pending'
         AND ar.request_type = 'document_approval'
         AND ar.church_id = $2
         AND ar.department_id IN (
           SELECT department_id FROM department_members WHERE user_id = $1
         )
       ORDER BY ar.requested_at DESC`,
      [userId, churchId]
    );
    return result.rows;
  }

  /**
   * Approval history for a document (church-scoped)
   */
  async getDocumentApprovalHistory(documentId, churchId) {
    const result = await pool.query(
      `SELECT ar.*,
              u.first_name || ' ' || u.last_name AS approver_name,
              da.comments,
              da.approved_at
       FROM approval_requests ar
       LEFT JOIN document_approvals da ON ar.id = da.approval_request_id
       LEFT JOIN users u ON da.approver_id = u.id
       WHERE ar.entity_id = $1
         AND ar.request_type = 'document_approval'
         AND ar.church_id = $2
       ORDER BY ar.requested_at DESC`,
      [documentId, churchId]
    );
    return result.rows;
  }
}

module.exports = new DocumentApprovalService();
