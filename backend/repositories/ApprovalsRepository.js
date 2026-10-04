/**
 * @audit Repository over approval_requests + approval_workflows.
 * @known Every method takes churchId — do not call without it (controllers
 *        pass req.user.church_id). getAll JOINs users for requester/approver
 *        names; sort column is allowlisted. deleteById is pending-only.
 * @deps   migrations/052_approval_workflow_tables.sql
 */
const BaseRepository = require('./BaseRepository');

class ApprovalsRepository extends BaseRepository {
  constructor() {
    super('approval_requests');
  }

  async getAll(filters = {}, churchId) {
    let query = `SELECT ar.*,
        COALESCE(u1.first_name || ' ' || u1.last_name, 'Unknown') as requester_name,
        COALESCE(u2.first_name || ' ' || u2.last_name, 'Unknown') as approver_name
      FROM ${this.tableName} ar
      LEFT JOIN users u1 ON ar.requester_id = u1.id
      LEFT JOIN users u2 ON ar.approver_id = u2.id
      WHERE ar.church_id = $1`;
    const params = [churchId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND ar.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    // Validate sort column against allowlist to prevent SQL injection
    const allowedSortColumns = ['created_at', 'updated_at', 'status', 'priority'];
    const sort = allowedSortColumns.includes(filters.sort) ? filters.sort : 'created_at';
    const order = (filters.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ar.${sort} ${order}`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Pending requests only — approved/rejected rows are audit history and stay.
  async deleteById(approvalId, churchId) {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND church_id = $2 AND status = 'pending' RETURNING id`,
      [approvalId, churchId]
    );
    return result.rows[0];
  }

  async getById(approvalId, churchId) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND church_id = $2`;
    const params = [approvalId, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async create(data, churchId) {
    const { title, description, request_type, request_data, requester_id, priority } = data;
    // entity_type is NOT NULL — default to request_type; department_id
    // travels inside request_data for module-created requests.
    const entityType = data.entity_type || request_type || 'general';
    const departmentId = data.department_id || request_data?.department_id || null;

    const query = `
      INSERT INTO ${this.tableName} (title, description, request_type, entity_type, request_data, requester_id, priority, status, church_id, department_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
      RETURNING *
    `;
    const params = [title, description, request_type, entityType, JSON.stringify(request_data || {}), requester_id, priority, churchId, departmentId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatus(approvalId, status, approverId, comments = null, churchId) {
    // Fetch the request to check requester_id
    const request = await this.getById(approvalId, churchId);
    if (!request) {
      const err = new Error('Approval request not found');
      err.statusCode = 404;
      throw err;
    }

    // Prevent self-approval
    if (approverId === request.requester_id) {
      const err = new Error('Cannot approve your own request');
      err.statusCode = 400;
      throw err;
    }

    const timestampColumn = status === 'approved' ? 'approved_at' : 'rejected_at';
    const query = `
      UPDATE ${this.tableName}
      SET status = $1,
          approver_id = $2,
          ${timestampColumn} = CURRENT_TIMESTAMP,
          comments = $3,
          updated_at = NOW()
      WHERE id = $4 AND church_id = $5
      RETURNING *
    `;
    const params = [status, approverId, comments, approvalId, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Escalate/delegate a pending request to another approver. Unlike
   * updateStatus('delegated') — which wrongly stamped rejected_at and left
   * nobody able to act — this keeps status 'pending' so the target sees it in
   * the shared inbox, records the new responsible approver, and stamps the
   * hand-off in metadata for audit.
   */
  async assignApprover(approvalId, targetUserId, delegatedById, comments = null, churchId) {
    const request = await this.getById(approvalId, churchId);
    if (!request) {
      const err = new Error('Approval request not found');
      err.statusCode = 404;
      throw err;
    }
    if (request.status !== 'pending') {
      const err = new Error('Only pending requests can be delegated');
      err.statusCode = 400;
      throw err;
    }
    const result = await this.pool.query(
      `UPDATE ${this.tableName}
       SET approver_id = $2,
           comments = COALESCE($3, comments),
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'delegated_from', $4::text, 'delegated_at', NOW()::text),
           updated_at = NOW()
       WHERE id = $1 AND church_id = $5 AND status = 'pending'
       RETURNING *`,
      [approvalId, targetUserId, comments, delegatedById, churchId]
    );
    return result.rows[0];
  }

  async bulkUpdateStatus(approvalIds, status, approverId, comments = null, churchId = null) {
    if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
      throw new Error('approvalIds must be a non-empty array');
    }

    const timestampColumn = status === 'approved' ? 'approved_at' : 'rejected_at';
    const results = [];

    for (const approvalId of approvalIds) {
      try {
        const result = await this.updateStatus(approvalId, status, approverId, comments, churchId);
        results.push({ approvalId, success: true, result });
      } catch (error) {
        results.push({ approvalId, success: false, error: error.message });
      }
    }

    return {
      total: approvalIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  async bulkApprove(approvalIds, approverId, comments = null, churchId = null) {
    return this.bulkUpdateStatus(approvalIds, 'approved', approverId, comments, churchId);
  }

  async bulkReject(approvalIds, approverId, comments = null, churchId = null) {
    return this.bulkUpdateStatus(approvalIds, 'rejected', approverId, comments, churchId);
  }

  async getPendingCount(churchId) {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'pending' AND church_id = $1`;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getByRequester(requesterId, churchId) {
    const query = `SELECT * FROM ${this.tableName} WHERE requester_id = $1 AND church_id = $2 ORDER BY created_at DESC`;
    const params = [requesterId, churchId];

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithDetails(approvalId, churchId) {
    const query = `
      SELECT
        ar.*,
        COALESCE(u1.first_name || ' ' || u1.last_name, 'Unknown') as requester_name,
        COALESCE(u2.first_name || ' ' || u2.last_name, 'Unknown') as approver_name
      FROM ${this.tableName} ar
      LEFT JOIN users u1 ON ar.requester_id = u1.id
      LEFT JOIN users u2 ON ar.approver_id = u2.id
      WHERE ar.id = $1 AND ar.church_id = $2
    `;
    const params = [approvalId, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createWorkflow(data, churchId) {
    const { name, description, steps, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO approval_workflows (name, description, steps, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, JSON.stringify(steps), created_by, churchId]
    );
    return result.rows[0];
  }

  async getActiveWorkflows(churchId) {
    const result = await this.pool.query(
      'SELECT * FROM approval_workflows WHERE (church_id = $1 OR church_id IS NULL) AND is_active = true ORDER BY created_at DESC',
      [churchId]
    );
    return result.rows;
  }

  async getApprovalAnalytics(churchId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
         AVG(CASE WHEN approved_at > created_at
              THEN EXTRACT(EPOCH FROM (approved_at - created_at))/3600 END) as avg_processing_hours
       FROM approval_requests
       WHERE church_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [churchId]
    );
    return result.rows[0];
  }
}

module.exports = new ApprovalsRepository();
