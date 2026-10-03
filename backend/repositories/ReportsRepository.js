/**
 * @audit Reports repository.
 * @fixed All queries church-scoped (sms_logs scopes via sender→users join —
 *        table has no church_id). generateCustomReport uses REPORT_SOURCES
 *        allowlists — never interpolate client identifiers into SQL.
 * @deps  migrations/050_reports_tables.sql (tables were missing until then).
 */
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
    // AND binds tighter than OR — church filter must wrap the whole predicate,
    // otherwise own reports leak across tenants and public scoping is bypassed
    let query = `
      SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM saved_reports sr
      LEFT JOIN users u ON sr.created_by = u.id
      WHERE (sr.created_by = $1 OR sr.is_public = true)
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
    // date_trunc unit is a text param — restrict to valid units so a bad
    // ?groupBy= value can't error out (or smuggle anything odd)
    const validGroups = ['hour', 'day', 'week', 'month', 'quarter', 'year'];
    const safeGroupBy = validGroups.includes(groupBy) ? groupBy : 'month';

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
    const params = [safeGroupBy];

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

  async getDepartmentReportExtended(departmentId, startDate, endDate, churchId = null) {
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

    if (churchId) {
      params.push(churchId);
      query += ` AND d.church_id = $${params.length}`;
    }

    if (departmentId) {
      params.push(departmentId);
      query += ` AND d.id = $${params.length}`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND dmeet.meeting_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ' GROUP BY d.id, d.name ORDER BY d.name';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSMSReport(startDate, endDate, status, churchId = null) {
    // sms_logs has no church_id — scope through the sender's user row
    let query = `
      SELECT
        DATE_TRUNC('day', sl.sent_at) as date,
        COUNT(*) as total_sent,
        SUM(CASE WHEN sl.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN sl.status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN sl.status = 'pending' THEN 1 ELSE 0 END) as pending,
        0 as total_cost -- sms_logs has no cost column; keep response shape stable
      FROM sms_logs sl
      LEFT JOIN users su ON sl.sender_id = su.id
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      params.push(churchId);
      query += ` AND su.church_id = $${params.length}`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND sl.sent_at BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND sl.status = $${params.length}`;
    }

    query += ' GROUP BY DATE_TRUNC(\'day\', sl.sent_at) ORDER BY date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getApprovalReport(startDate, endDate, status, entityType, churchId = null) {
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

    if (churchId) {
      params.push(churchId);
      query += ` AND church_id = $${params.length}`;
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }

    query += ' GROUP BY DATE_TRUNC(\'day\', created_at), entity_type, status ORDER BY date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getMembershipGrowth(churchId = null, months = 12) {
    let query = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_members,
        COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN membership_status = 'visitor' THEN 1 END) as visitors
      FROM members
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAttendanceTrend(churchId = null, weeks = 52) {
    let query = `
      SELECT
        DATE_TRUNC('week', attendance_date) as week,
        COUNT(*) as total_attendance,
        COUNT(DISTINCT member_id) as unique_attendees,
        AVG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', attendance_date) ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) as avg_attendance_4_weeks
      FROM member_attendance
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '1 week' * $1
    `;
    const params = [weeks];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('week', attendance_date) ORDER BY week DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFinancialReportData(startDate, endDate, churchId = null) {
    const params = [];
    let where = `status = 'approved'`;

    if (churchId) {
      params.push(churchId);
      where += ` AND church_id = $${params.length}`;
    }
    if (startDate && endDate) {
      params.push(startDate, endDate);
      where += ` AND transaction_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    const query = `
      SELECT
        DATE_TRUNC('month', transaction_date) as period,
        transaction_type,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE ${where}
      GROUP BY DATE_TRUNC('month', transaction_date), transaction_type
      ORDER BY period DESC
    `;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentReportData(startDate, endDate, churchId = null) {
    const params = [];
    let where = '1=1';

    if (churchId) {
      params.push(churchId);
      where += ` AND d.church_id = $${params.length}`;
    }
    if (startDate && endDate) {
      params.push(startDate, endDate);
      where += ` AND dmeet.meeting_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

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
      WHERE ${where}
      GROUP BY d.id, d.name
      ORDER BY d.name
    `;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getAttendanceReportData(startDate, endDate, churchId = null) {
    const params = [];
    let where = '1=1';

    if (churchId) {
      params.push(churchId);
      where += ` AND church_id = $${params.length}`;
    }
    if (startDate && endDate) {
      params.push(startDate, endDate);
      where += ` AND attendance_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    const query = `
      SELECT
        DATE_TRUNC('week', attendance_date) as week,
        COUNT(DISTINCT member_id) as unique_attendees,
        COUNT(*) as total_attendance
      FROM member_attendance
      WHERE ${where}
      GROUP BY DATE_TRUNC('week', attendance_date)
      ORDER BY week DESC
    `;
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * List generated reports for a church. Column aliases match the frontend
   * Reports.jsx contract (report_name / generated_at).
   */
  async getReports(churchId, limit = 50) {
    if (!churchId) throw new Error('churchId is required');
    const result = await this.pool.query(
      `SELECT id, name AS report_name, report_type, parameters, format,
              created_by, church_id, created_at AS generated_at
       FROM ${this.tableName}
       WHERE church_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [churchId, this.clampLimit(limit)]
    );
    return result.rows;
  }

  async getReportById(id, churchId) {
    if (!churchId) throw new Error('churchId is required');
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND church_id = $2`,
      [id, churchId]
    );
    return result.rows[0] || null;
  }

  async createReport(data) {
    if (!data.church_id) throw new Error('church_id is required');
    const { name, description, reportType, parameters, format, created_by, church_id } = data;
    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (name, description, report_type, parameters, format, created_by, church_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name AS report_name, report_type, parameters, format,
                 created_by, church_id, created_at AS generated_at`,
      [name, description || null, reportType || 'custom',
       JSON.stringify(parameters || {}), format || 'json', created_by, church_id]
    );
    return result.rows[0];
  }

  async getEventsReportData(startDate, endDate, churchId) {
    if (!churchId) throw new Error('churchId is required');
    const params = [churchId];
    let where = 'church_id = $1';
    if (startDate && endDate) {
      params.push(startDate, endDate);
      where += ' AND event_date BETWEEN $2 AND $3';
    }
    const result = await this.pool.query(
      `SELECT DATE_TRUNC('month', event_date) as period,
              COUNT(*) as total_events,
              COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE) as upcoming
       FROM events WHERE ${where}
       GROUP BY 1 ORDER BY period DESC`,
      params
    );
    return result.rows;
  }

  async saveReport(data) {
    const { name, description, dataSource, filters, columns, groupBy, sortBy, format, created_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO saved_reports (name, description, data_source, filters, columns, group_by, sort_by, format, created_by, church_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, description, dataSource, JSON.stringify(filters), JSON.stringify(columns), groupBy, sortBy, format, created_by, church_id]
    );
    return result.rows[0];
  }

  // Allowlists mirror helpers/reportScheduler.js — same request-driven SQLi vector.
  // Every identifier (column, filter field, group/sort) must match the source's
  // column set; values stay parameterized. Never interpolate raw client strings.
  static REPORT_SOURCES = {
    members: {
      from: 'users WHERE is_active = true',
      scopeColumn: 'church_id',
      columns: new Set([
        'id', 'username', 'email', 'first_name', 'last_name', 'phone', 'phone_number',
        'is_active', 'created_at', 'updated_at', 'church_id', 'mfa_enabled',
        'email_verified', 'slug', 'role', 'last_login', 'church_slug', 'avatar_url',
        'deleted_at'
      ])
    },
    payments: {
      from: 'payments WHERE 1=1',
      scopeColumn: 'church_id',
      columns: new Set([
        'id', 'member_id', 'transaction_id', 'mpesa_receipt_number', 'phone_number',
        'amount', 'payment_date', 'status', 'payment_method', 'notes', 'created_at',
        'church_id', 'category', 'payment_type', 'church_slug', 'currency',
        'initiated_by', 'reference_number', 'payment_method_id', 'processed_by',
        'user_id', 'obligation_id', 'budget_id', 'failure_reason', 'completed_at',
        'updated_at'
      ])
    },
    approvals: {
      from: 'approval_requests WHERE 1=1',
      scopeColumn: 'church_id',
      columns: new Set([
        'id', 'entity_type', 'entity_id', 'status', 'church_id',
        'created_at', 'updated_at', 'requester_id', 'title', 'description',
        'priority', 'approver_id', 'module', 'amount', 'requested_at',
        'approved_at', 'rejected_at', 'request_type', 'department_id'
      ])
    }
  };

  static BLOCKED_REPORT_COLUMNS = new Set([
    'password_hash', 'mfa_secret', 'reset_token', 'reset_token_expiry',
    'failed_login_attempts', 'locked_until', 'request_data', 'metadata', 'comments'
  ]);

  static ALLOWED_FILTER_OPERATORS = new Set([
    '=', '!=', '<>', '>', '<', '>=', '<=',
    'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE', 'IS NULL', 'IS NOT NULL'
  ]);

  static IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  static validateReportColumn(source, column) {
    const name = String(column);
    if (!ReportsRepository.IDENTIFIER_RE.test(name)) {
      throw new Error(`Invalid report column: ${name}`);
    }
    if (ReportsRepository.BLOCKED_REPORT_COLUMNS.has(name)) {
      throw new Error(`Sensitive column not allowed in reports: ${name}`);
    }
    if (!source.columns.has(name)) {
      throw new Error(`Column not available for this report: ${name}`);
    }
    return name;
  }

  async generateCustomReport(dataSource, filters, columns, groupBy, sortBy, churchId = null) {
    const source = ReportsRepository.REPORT_SOURCES[dataSource];
    if (!source) {
      throw new Error('Invalid data source');
    }

    const selected = (Array.isArray(columns) && columns.length > 0 ? columns : ['id'])
      .map(col => ReportsRepository.validateReportColumn(source, col));

    let query = `SELECT ${selected.join(', ')} FROM ${source.from}`;
    const params = [];
    let paramIndex = 1;

    // Tenant scope — reports must never cross church boundaries
    if (churchId) {
      query += ` AND ${source.scopeColumn} = $${paramIndex++}`;
      params.push(churchId);
    }

    // Apply filters — field + operator validated, value parameterized
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        const field = ReportsRepository.validateReportColumn(source, filter.field);
        const operator = String(filter.operator || '=').trim().toUpperCase();
        if (!ReportsRepository.ALLOWED_FILTER_OPERATORS.has(operator)) {
          throw new Error(`Invalid filter operator: ${filter.operator}`);
        }
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          query += ` AND ${field} ${operator}`;
        } else {
          query += ` AND ${field} ${operator} $${paramIndex++}`;
          params.push(filter.value);
        }
      });
    }

    // Apply grouping
    if (groupBy) {
      query += ` GROUP BY ${ReportsRepository.validateReportColumn(source, groupBy)}`;
    }

    // Apply sorting — "col" or "col ASC|DESC"
    if (sortBy) {
      const [sortCol, sortDirRaw] = String(sortBy).trim().split(/\s+/);
      const dir = (sortDirRaw || 'ASC').toUpperCase();
      if (dir !== 'ASC' && dir !== 'DESC') {
        throw new Error(`Invalid sort direction: ${sortDirRaw}`);
      }
      query += ` ORDER BY ${ReportsRepository.validateReportColumn(source, sortCol)} ${dir}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async scheduleReport(data) {
    const { name, description, scheduleConfig, reportConfig, recipients, created_by, church_id } = data;

    const result = await this.pool.query(
      `INSERT INTO scheduled_reports (name, description, schedule_config, report_config, recipients, created_by, church_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, description, scheduleConfig, JSON.stringify(reportConfig), JSON.stringify(recipients), created_by, church_id]
    );
    return result.rows[0];
  }

  async getScheduledReportsByUser(userId, churchId = null) {
    const params = [userId];
    let where = '(sr.created_by = $1 OR sr.is_public = true)';
    if (churchId) {
      where += ' AND sr.church_id = $2';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM scheduled_reports sr
       LEFT JOIN users u ON sr.created_by = u.id
       WHERE ${where}
       ORDER BY sr.created_at DESC`,
      params
    );
    return result.rows;
  }

  async getScheduledReports(churchId = null) {
    const params = [];
    let where = '1=1';
    if (churchId) {
      where = 'sr.church_id = $1';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT sr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM scheduled_reports sr
       LEFT JOIN users u ON sr.created_by = u.id
       WHERE ${where}
       ORDER BY sr.created_at DESC`,
      params
    );
    return result.rows;
  }

  async getReportExecutions(reportId, churchId = null) {
    const params = [reportId];
    let where = 're.report_id = $1';
    if (churchId) {
      // scope via the owning scheduled report's church
      where += ' AND re.report_id IN (SELECT id FROM scheduled_reports WHERE church_id = $2)';
      params.push(churchId);
    }
    const result = await this.pool.query(
      `SELECT re.* FROM report_executions re
       WHERE ${where}
       ORDER BY re.executed_at DESC`,
      params
    );
    return result.rows;
  }

  async getReportTemplates(churchId = null) {
    try {
      const result = await this.pool.query(
        `SELECT *
         FROM report_templates
         WHERE church_id = $1 OR church_id IS NULL
         ORDER BY name`,
        [churchId]
      );
      if (result.rows.length > 0) {
        return result.rows;
      }
    } catch (error) {
      // report_templates table may not exist; use fallback defaults
    }

    return [
      {
        id: 'weekly_financial',
        name: 'Weekly Financial Report',
        description: 'Summary of weekly income and expenses',
        dataSource: 'payments',
        scheduleConfig: 'weekly',
        reportConfig: {
          columns: ['id', 'amount', 'payment_date', 'status', 'payment_method'],
          filters: []
        }
      },
      {
        id: 'monthly_attendance',
        name: 'Monthly Attendance Report',
        description: 'Monthly member attendance summary',
        dataSource: 'members',
        scheduleConfig: 'monthly',
        reportConfig: {
          columns: ['id', 'first_name', 'last_name', 'email', 'phone', 'joined_date'],
          filters: []
        }
      },
      {
        id: 'daily_approvals',
        name: 'Daily Approval Summary',
        description: 'Daily approval requests status',
        dataSource: 'approvals',
        scheduleConfig: 'daily',
        reportConfig: {
          columns: ['id', 'title', 'status', 'priority', 'created_at'],
          filters: []
        }
      }
    ];
  }
}

module.exports = new ReportsRepository();
