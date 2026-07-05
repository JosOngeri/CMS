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
      endDate
    } = filters;

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
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

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

  async getAuditLogById(id) {
    const query = `
      SELECT
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM ${this.tableName} al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getDepartmentAuditLogs(departmentId, limit = 100, offset = 0) {
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
      WHERE al.new_values ? 'department_id'
      AND al.new_values->>'department_id' = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [departmentId, limit, offset]);
    return result.rows;
  }

  async checkDepartmentHead(departmentId, userId) {
    const result = await this.pool.query(
      'SELECT id FROM departments WHERE id = $1 AND head_id = $2',
      [departmentId, userId]
    );
    return result.rows[0];
  }

  async checkDepartmentAdmin(departmentId, userId) {
    const result = await this.pool.query(
      'SELECT id FROM department_members WHERE department_id = $1 AND user_id = $2 AND role = $3 AND is_active = true',
      [departmentId, userId, 'Admin']
    );
    return result.rows[0];
  }
}

module.exports = new AuditLogRepository();
