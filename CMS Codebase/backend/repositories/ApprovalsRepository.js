const BaseRepository = require('./BaseRepository');

class ApprovalsRepository extends BaseRepository {
  constructor() {
    super('approval_requests');
  }

  async getAll(filters = {}, churchId) {
    let query = `SELECT * FROM ${this.tableName} WHERE church_id = $1`;
    const params = [churchId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    // Validate sort column against allowlist to prevent SQL injection
    const allowedSortColumns = ['created_at', 'updated_at', 'status', 'priority'];
    const sort = allowedSortColumns.includes(filters.sort) ? filters.sort : 'created_at';
    const order = (filters.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sort} ${order}`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getById(approvalId, churchId) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND church_id = $2`;
    const params = [approvalId, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async create(data, churchId) {
    const { title, description, request_type, request_data, requester_id, priority } = data;

    const query = `
      INSERT INTO ${this.tableName} (title, description, request_type, request_data, requester_id, priority, status, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `;
    const params = [title, description, request_type, JSON.stringify(request_data || {}), requester_id, priority, churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatus(approvalId, status, approverId, comments = null, churchId) {
    // Fetch the request to check requester_id
    const request = await this.getById(approvalId, churchId);
    if (!request) {
      throw new Error('Approval request not found');
    }

    // Prevent self-approval
    if (approverId === request.requester_id) {
      throw new Error('Cannot approve your own request');
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
      'SELECT * FROM approval_workflows WHERE church_id = $1 AND is_active = true ORDER BY created_at DESC',
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
         AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_processing_hours
       FROM approval_requests
       WHERE church_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [churchId]
    );
    return result.rows[0];
  }
}

module.exports = new ApprovalsRepository();
