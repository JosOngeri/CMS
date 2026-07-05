const BaseRepository = require('./BaseRepository');

class ApprovalsRepository extends BaseRepository {
  constructor() {
    super('approval_requests');
  }

  async getAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ` AND status = $1`;
      params.push(filters.status);
    }

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    const sort = filters.sort || 'created_at';
    const order = filters.order || 'desc';
    query += ` ORDER BY ${sort} ${order}`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getById(approvalId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params = [approvalId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async create(data, churchId = null) {
    const { title, description, request_type, request_data, requester_id, priority } = data;

    let query = `
      INSERT INTO ${this.tableName} (title, description, request_type, request_data, requester_id, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    const params = [title, description, request_type, JSON.stringify(request_data || {}), requester_id, priority];

    if (churchId) {
      query = `
        INSERT INTO ${this.tableName} (title, description, request_type, request_data, requester_id, priority, status, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateStatus(approvalId, status, approverId, comments = null, churchId = null) {
    const timestampColumn = status === 'approved' ? 'approved_at' : 'rejected_at';
    let query = `
      UPDATE ${this.tableName}
      SET status = $1,
          approver_id = $2,
          ${timestampColumn} = CURRENT_TIMESTAMP,
          comments = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const params = [status, approverId, comments, approvalId];

    if (churchId) {
      query = `
        UPDATE ${this.tableName}
        SET status = $1,
            approver_id = $2,
            ${timestampColumn} = CURRENT_TIMESTAMP,
            comments = $3,
            updated_at = NOW()
        WHERE id = $4 AND church_id = $5
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getPendingCount(churchId = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'pending'`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getByRequester(requesterId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE requester_id = $1`;
    const params = [requesterId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithDetails(approvalId, churchId = null) {
    let query = `
      SELECT
        ar.*,
        COALESCE(u1.first_name || ' ' || u1.last_name, 'Unknown') as requester_name,
        COALESCE(u2.first_name || ' ' || u2.last_name, 'Unknown') as approver_name
      FROM ${this.tableName} ar
      LEFT JOIN users u1 ON ar.requester_id = u1.id
      LEFT JOIN users u2 ON ar.approver_id = u2.id
      WHERE ar.id = $1
    `;
    const params = [approvalId];

    if (churchId) {
      query += ` AND ar.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createWorkflow(data) {
    const { name, description, steps, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO approval_workflows (name, description, steps, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, JSON.stringify(steps), created_by]
    );
    return result.rows[0];
  }

  async getActiveWorkflows() {
    const result = await this.pool.query('SELECT * FROM approval_workflows WHERE is_active = true ORDER BY created_at DESC');
    return result.rows;
  }

  async getApprovalAnalytics() {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
         AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_processing_hours
       FROM approval_requests
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
    );
    return result.rows[0];
  }
}

module.exports = new ApprovalsRepository();
