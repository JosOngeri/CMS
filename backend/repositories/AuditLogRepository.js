const BaseRepository = require('./BaseRepository');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super('audit_log');
  }

  async getAuditLogs(filters = {}) {
    const {
      limit = 100,
      offset = 0,
      userId,
      action,
      tableName,
      departmentId,
      startDate,
      endDate,
      churchId
    } = filters;

    // Audit rows are tenant-scoped — refusing to run unscoped prevents
    // cross-tenant log reads when the caller forgets the filter.
    if (!churchId) throw new Error('AuditLogRepository.getAuditLogs: churchId required');

    let query = `
      SELECT
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM ${this.tableName} al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.church_id = $1
    `;
    const params = [churchId];
    let paramIndex = 2;

    if (userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (tableName) {
      query += ` AND al.table_name = $${paramIndex}`;
      params.push(tableName);
      paramIndex++;
    }

    if (departmentId) {
      query += ` AND al.new_values ? $${paramIndex}`;
      params.push('department_id');
      paramIndex++;
      query += ` AND al.new_values->>'department_id' = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAuditLogById(id, churchId) {
    const query = `
      SELECT
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM ${this.tableName} al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1 AND al.church_id = $2
    `;

    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0];
  }

  async getDepartmentAuditLogs(departmentId, churchId, limit = 100, offset = 0) {
    const query = `
      SELECT
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM ${this.tableName} al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.church_id = $2
      AND al.new_values ? 'department_id'
      AND al.new_values->>'department_id' = $1
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.pool.query(query, [departmentId, churchId, limit, offset]);
    return result.rows;
  }

  async checkDepartmentHead(departmentId, userId, churchId) {
    const result = await this.pool.query(
      'SELECT id FROM departments WHERE id = $1 AND head_id = $2 AND church_id = $3',
      [departmentId, userId, churchId]
    );
    return result.rows[0];
  }

  async checkDepartmentAdmin(departmentId, userId, churchId) {
    const result = await this.pool.query(
      'SELECT user_id FROM department_members WHERE department_id = $1 AND user_id = $2 AND role = $3 AND church_id = $4 AND is_active = true',
      [departmentId, userId, 'Admin', churchId]
    );
    return result.rows[0];
  }
}

module.exports = new AuditLogRepository();
