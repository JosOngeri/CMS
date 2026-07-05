const BaseRepository = require('./BaseRepository');

class AnalyticsRepository extends BaseRepository {
  constructor() {
    super('analytics');
  }

  async getDashboardStats(churchId = null) {
    let query = `
      SELECT
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM departments WHERE is_active = true) as total_departments,
        (SELECT COUNT(*) FROM members WHERE membership_status = 'active') as active_members,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_income,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_expense,
        (SELECT COUNT(*) FROM approval_requests WHERE status = 'pending') as pending_approvals
    `;
    const params = [];

    if (churchId) {
      query = `
        SELECT
          (SELECT COUNT(*) FROM members WHERE church_id = $1) as total_members,
          (SELECT COUNT(*) FROM departments WHERE is_active = true AND church_id = $1) as total_departments,
          (SELECT COUNT(*) FROM members WHERE membership_status = 'active' AND church_id = $1) as active_members,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'income' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as monthly_income,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'expense' AND status = 'approved' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND church_id = $1) as monthly_expense,
          (SELECT COUNT(*) FROM approval_requests WHERE status = 'pending' AND church_id = $1) as pending_approvals
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getUnreadNotificationsCount(userId, churchId = null) {
    let query = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getMemberGrowthTrend(days = 30, churchId = null) {
    let query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as new_members
      FROM members
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE(created_at) ORDER BY date`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTransactionTrend(days = 30, churchId = null) {
    let query = `
      SELECT
        DATE(transaction_date) as date,
        transaction_type,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions
      WHERE status = 'approved'
      AND transaction_date >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE(transaction_date), transaction_type ORDER BY date`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentAnalytics(months, churchId) {
    const query = `
      SELECT
         d.name as department_name,
         COUNT(DISTINCT dmeet.id) as meetings,
         COUNT(DISTINCT dtask.id) as tasks,
         COUNT(DISTINCT dm.user_id) as members
      FROM departments d
      LEFT JOIN department_meetings dmeet ON d.id = dmeet.department_id AND dmeet.meeting_date >= CURRENT_DATE - INTERVAL '1 month' * $2
      LEFT JOIN department_tasks dtask ON d.id = dtask.department_id AND dtask.created_at >= CURRENT_DATE - INTERVAL '1 month' * $2
      LEFT JOIN department_members dm ON d.id = dm.department_id
      WHERE d.church_id = $1
      GROUP BY d.id, d.name
      ORDER BY meetings DESC, tasks DESC
    `;
    const result = await this.pool.query(query, [churchId, months]);
    return result.rows;
  }

  async getAttendanceAnalytics(weeks, churchId) {
    const query = `
      SELECT
         DATE_TRUNC('week', attendance_date) as week,
         COUNT(*) as total_attendance,
         COUNT(DISTINCT member_id) as unique_attendees
      FROM member_attendance
      WHERE church_id = $1
      AND attendance_date >= CURRENT_DATE - INTERVAL '1 week' * $2
      GROUP BY DATE_TRUNC('week', attendance_date)
      ORDER BY week DESC
    `;
    const result = await this.pool.query(query, [churchId, weeks]);
    return result.rows;
  }

  async getMemberDemographics(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
        COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
        COUNT(CASE WHEN membership_status = 'inactive' THEN 1 END) as inactive_members,
        COUNT(CASE WHEN membership_status = 'visitor' THEN 1 END) as visitors,
        AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))) as average_age
      FROM members
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getMemberActivity(days = 30, churchId = null) {
    let query = `
      SELECT
        DATE(activity_date) as date,
        COUNT(DISTINCT member_id) as active_members,
        COUNT(*) as total_activities
      FROM member_activities
      WHERE activity_date >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE(activity_date) ORDER BY date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getFinancialSummary(churchId = null) {
    let query = `
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as monthly_expense,
        COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_transactions,
        COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_transactions
      FROM transactions
      WHERE status = 'approved'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getContributionTrends(months = 12, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total_contributions,
        COUNT(*) as contribution_count,
        AVG(amount) as average_contribution
      FROM personal_collections
      WHERE date >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('month', date) ORDER BY month DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentPerformance(months = 6, churchId) {
    const query = `
      SELECT
        d.name as department_name,
        COUNT(DISTINCT dm.user_id) as member_count,
        COUNT(DISTINCT dmeet.id) as meetings_count,
        COUNT(DISTINCT dtask.id) as tasks_completed,
        COUNT(DISTINCT dmeet.id) FILTER (WHERE dmeet.meeting_date >= CURRENT_DATE - INTERVAL '1 month' * $1) as recent_meetings
      FROM departments d
      LEFT JOIN department_members dm ON d.id = dm.department_id
      LEFT JOIN department_meetings dmeet ON d.id = dmeet.department_id
      LEFT JOIN department_tasks dtask ON d.id = dtask.department_id AND dtask.status = 'completed'
      WHERE d.church_id = $2
      GROUP BY d.id, d.name
      ORDER BY member_count DESC
    `;
    const result = await this.pool.query(query, [months, churchId]);
    return result.rows;
  }

  async getAttendanceSummary(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_attendance_records,
        COUNT(DISTINCT member_id) as unique_attendees,
        AVG(CASE WHEN attended = true THEN 1 ELSE 0 END) as average_attendance_rate,
        MAX(attendance_date) as last_attendance_date
      FROM member_attendance
      WHERE 1=1
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getCollectionPerformance(months = 6, churchId = null) {
    let query = `
      SELECT
        ec.title as collection_name,
        ec.target_amount,
        ec.current_amount,
        (ec.current_amount / NULLIF(ec.target_amount, 0)) * 100 as completion_percentage,
        COUNT(DISTINCT cc.contributor_id) as unique_contributors,
        COUNT(cc.id) as total_contributions,
        AVG(cc.amount) as average_contribution
      FROM event_collections ec
      LEFT JOIN collection_contributions cc ON ec.id = cc.collection_id
      WHERE ec.created_at >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND ec.church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY ec.id, ec.title, ec.target_amount, ec.current_amount ORDER BY completion_percentage DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCollectionTrends(months = 12, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC('month', ec.created_at) as month,
        COUNT(DISTINCT ec.id) as collections_created,
        COALESCE(SUM(ec.target_amount), 0) as total_target_amount,
        COALESCE(SUM(ec.current_amount), 0) as total_collected_amount
      FROM event_collections ec
      WHERE ec.created_at >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND ec.church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('month', ec.created_at) ORDER BY month DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getEventEngagement(months = 6, churchId) {
    const query = `
      SELECT
        e.title as event_name,
        e.start_date,
        COUNT(DISTINCT ea.member_id) as registered_attendees,
        COUNT(DISTINCT ea.member_id) FILTER (WHERE ea.attended = true) as actual_attendees,
        (COUNT(DISTINCT ea.member_id) FILTER (WHERE ea.attended = true)::FLOAT / NULLIF(COUNT(DISTINCT ea.member_id), 0)) * 100 as attendance_rate
      FROM events e
      LEFT JOIN event_attendance ea ON e.id = ea.event_id
      WHERE e.start_date >= CURRENT_DATE - INTERVAL '1 month' * $1
      AND e.church_id = $2
      GROUP BY e.id, e.title, e.start_date
      ORDER BY e.start_date DESC
    `;
    const result = await this.pool.query(query, [months, churchId]);
    return result.rows;
  }

  async getEventAttendance(months = 6, churchId) {
    const query = `
      SELECT
        DATE_TRUNC('week', e.start_date) as week,
        COUNT(DISTINCT e.id) as events_count,
        COUNT(DISTINCT ea.member_id) as total_attendees,
        AVG(COUNT(DISTINCT ea.member_id)) OVER () as average_attendance_per_event
      FROM events e
      LEFT JOIN event_attendance ea ON e.id = ea.event_id
      WHERE e.start_date >= CURRENT_DATE - INTERVAL '1 month' * $1
      AND e.church_id = $2
      GROUP BY DATE_TRUNC('week', e.start_date)
      ORDER BY week DESC
    `;
    const result = await this.pool.query(query, [months, churchId]);
    return result.rows;
  }

  async getSMSPerformance(months = 6, churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100 as delivery_rate,
        SUM(cost) as total_cost
      FROM sms_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getSMSDelivery(months = 6, churchId = null) {
    let query = `
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as messages_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM sms_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' * $1
    `;
    const params = [months];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` GROUP BY DATE_TRUNC('day', created_at) ORDER BY date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCustomAnalytics(metrics, startDate, endDate, groupBy, churchId = null) {
    // Build a custom analytics query based on requested metrics
    const metricMap = {
      'members': 'SELECT COUNT(*) FROM members',
      'departments': 'SELECT COUNT(*) FROM departments WHERE is_active = true',
      'events': 'SELECT COUNT(*) FROM events',
      'collections': 'SELECT COUNT(*) FROM event_collections',
      'contributions': 'SELECT COUNT(*) FROM collection_contributions',
      'transactions': 'SELECT COUNT(*) FROM transactions WHERE status = "approved"'
    };

    const results = {};
    for (const metric of metrics) {
      if (metricMap[metric]) {
        const result = await this.pool.query(metricMap[metric]);
        results[metric] = result.rows[0];
      }
    }

    return results;
  }

  async exportAnalytics(type, startDate, endDate, churchId = null) {
    // Return data in the requested format for export
    let query = '';
    let params = [];

    switch (type) {
      case 'financial':
        query = 'SELECT * FROM transactions WHERE status = "approved"';
        if (startDate) {
          query += ' AND transaction_date >= $1';
          params.push(startDate);
        }
        if (endDate) {
          query += ' AND transaction_date <= $2';
          params.push(endDate);
        }
        break;
      case 'attendance':
        query = 'SELECT * FROM member_attendance';
        if (startDate) {
          query += ' AND attendance_date >= $1';
          params.push(startDate);
        }
        if (endDate) {
          query += ' AND attendance_date <= $2';
          params.push(endDate);
        }
        break;
      default:
        throw new Error('Invalid export type');
    }

    if (churchId) {
      query += ' AND church_id = $' + (params.length + 1);
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

module.exports = new AnalyticsRepository();
