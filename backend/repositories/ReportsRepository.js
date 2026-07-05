const BaseRepository = require('./BaseRepository');

class ReportsRepository extends BaseRepository {
  constructor() {
    super('reports');
  }

  async getRecent(churchId = null, limit = 20) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByType(type, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE report_type = $1`;
    const params = [type];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByStatus(status, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE status = $1`;
    const params = [status];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSavedReports(userId, churchId = null) {
    let query = `
      SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM saved_reports sr
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE sr.created_by = $1 OR sr.is_public = true
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND sr.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY sr.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFinancialReport(startDate, endDate, groupBy, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC($1, transaction_date) as period,
        transaction_type,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE status = 'approved'
    `;
    const params = [groupBy];

    if (startDate && endDate) {
      query += ' AND transaction_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC($1, transaction_date), transaction_type ORDER BY period DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentReport(departmentId, startDate, endDate, churchId = null) {
    let query = `
      SELECT
        d.name as department_name,
        COUNT(DISTINCT dm.member_id) as member_count,
        COUNT(DISTINCT dm.id) as total_members,
        COUNT(DISTINCT CASE WHEN dm.is_active = true THEN dm.id END) as active_members
      FROM departments d
      LEFT JOIN department_members dm ON d.id = dm.department_id
      WHERE d.id = $1
    `;
    const params = [departmentId];

    if (startDate && endDate) {
      query += ` AND dm.joined_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    if (churchId) {
      query += ` AND d.church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    query += ` GROUP BY d.id, d.name`;

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getAttendanceReport(startDate, endDate, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC('day', attendance_date) as date,
        COUNT(*) as total_attendance,
        COUNT(DISTINCT member_id) as unique_members
      FROM attendance
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND attendance_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    if (churchId) {
      query += ` AND church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('day', attendance_date) ORDER BY date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentReportExtended(departmentId, startDate, endDate) {
    let query = `
      SELECT
        d.name as department_name,
        COUNT(DISTINCT dm.user_id) as member_count,
        COUNT(DISTINCT dm.id) as total_members,
        COUNT(DISTINCT dmeet.id) as meeting_count,
        COUNT(DISTINCT dtask.id) as task_count,
        COUNT(DISTINCT dres.id) as resource_count
      FROM departments d
      LEFT JOIN department_members dm ON d.id = dm.department_id
      LEFT JOIN department_meetings dmeet ON d.id = dmeet.department_id
      LEFT JOIN department_tasks dtask ON d.id = dtask.department_id
      LEFT JOIN department_resources dres ON d.id = dres.department_id
      WHERE 1=1
    `;
    const params = [];

    if (departmentId) {
      query += ' AND d.id = $1';
      params.push(departmentId);
    }

    if (startDate && endDate) {
      query += ' AND dmeet.meeting_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY d.id, d.name ORDER BY d.name';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSMSReport(startDate, endDate, status) {
    let query = `
      SELECT
        DATE_TRUNC('day', sent_at) as date,
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(cost) as total_cost
      FROM sms_logs
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND sent_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    if (status) {
      query += ' AND status = $3';
      params.push(status);
    }

    query += ' GROUP BY DATE_TRUNC(\'day\', sent_at) ORDER BY date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getApprovalReport(startDate, endDate, status, entityType) {
    let query = `
      SELECT
        DATE_TRUNC('day', created_at) as date,
        entity_type,
        status,
        COUNT(*) as total_requests,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
      FROM approval_requests
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    if (status) {
      query += ' AND status = $3';
      params.push(status);
    }

    if (entityType) {
      query += ' AND entity_type = $4';
      params.push(entityType);
    }

    query += ' GROUP BY DATE_TRUNC(\'day\', created_at), entity_type, status ORDER BY date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFinancialReportData(startDate, endDate) {
    const query = `
      SELECT
        DATE_TRUNC('month', transaction_date) as period,
        transaction_type,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE status = 'approved'
      ${startDate && endDate ? 'AND transaction_date BETWEEN $1 AND $2' : ''}
      GROUP BY DATE_TRUNC('month', transaction_date), transaction_type
      ORDER BY period DESC
    `;
    const params = startDate && endDate ? [startDate, endDate] : [];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentReportData(startDate, endDate) {
    const query = `
      SELECT
        d.name as department_name,
        COUNT(DISTINCT dm.user_id) as member_count,
        COUNT(DISTINCT dmeet.id) as meeting_count,
        COUNT(DISTINCT dtask.id) as task_count
      FROM departments d
      LEFT JOIN department_members dm ON d.id = dm.department_id
      LEFT JOIN department_meetings dmeet ON d.id = dmeet.department_id
      LEFT JOIN department_tasks dtask ON d.id = dtask.department_id
      WHERE 1=1
      ${startDate && endDate ? 'AND dmeet.meeting_date BETWEEN $1 AND $2' : ''}
      GROUP BY d.id, d.name
      ORDER BY d.name
    `;
    const params = startDate && endDate ? [startDate, endDate] : [];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAttendanceReportData(startDate, endDate) {
    const query = `
      SELECT
        DATE_TRUNC('week', attendance_date) as week,
        COUNT(DISTINCT member_id) as unique_attendees,
        COUNT(*) as total_attendance
      FROM member_attendance
      WHERE 1=1
      ${startDate && endDate ? 'AND attendance_date BETWEEN $1 AND $2' : ''}
      GROUP BY DATE_TRUNC('week', attendance_date)
      ORDER BY week DESC
    `;
    const params = startDate && endDate ? [startDate, endDate] : [];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async saveReport(data) {
    const { name, description, dataSource, filters, columns, groupBy, sortBy, format, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO saved_reports (name, description, data_source, filters, columns, group_by, sort_by, format, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, description, dataSource, JSON.stringify(filters), JSON.stringify(columns), groupBy, sortBy, format, created_by]
    );
    return result.rows[0];
  }

  async generateCustomReport(dataSource, filters, columns, groupBy, sortBy) {
    let query = '';
    let params = [];
    let paramIndex = 1;

    // Build query based on data source
    switch (dataSource) {
      case 'members':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM users WHERE is_active = true';
        break;
      case 'payments':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM payments WHERE 1=1';
        break;
      case 'approvals':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM approval_requests WHERE 1=1';
        break;
      default:
        throw new Error('Invalid data source');
    }

    // Apply filters
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        query += ` AND ${filter.field} ${filter.operator} $${paramIndex++}`;
        params.push(filter.value);
      });
    }

    // Apply grouping
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }

    // Apply sorting
    if (sortBy) {
      query += ` ORDER BY ${sortBy}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async scheduleReport(data) {
    const { name, description, scheduleConfig, reportConfig, recipients, created_by } = data;

    const result = await this.pool.query(
      `INSERT INTO scheduled_reports (name, description, schedule_config, report_config, recipients, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, description, scheduleConfig, JSON.stringify(reportConfig), JSON.stringify(recipients), created_by]
    );
    return result.rows[0];
  }

  async getScheduledReportsByUser(userId) {
    const result = await this.pool.query(
      `SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM scheduled_reports sr
       LEFT JOIN users u ON sr.created_by = u.id
       WHERE sr.created_by = $1 OR sr.is_public = true
       ORDER BY sr.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getScheduledReports() {
    const result = await this.pool.query(
      `SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM scheduled_reports sr
       LEFT JOIN users u ON sr.created_by = u.id
       ORDER BY sr.created_at DESC`
    );
    return result.rows;
  }

  async getReportExecutions(reportId) {
    const result = await this.pool.query(
      `SELECT re.* FROM report_executions re
       WHERE re.report_id = $1
       ORDER BY re.executed_at DESC`,
      [reportId]
    );
    return result.rows;
  }
}

module.exports = new ReportsRepository();
