const BaseRepository = require('./BaseRepository');
const os = require('os');

class DashboardRepository extends BaseRepository {
  constructor() {
    super('summaries');
  }

  async getSummary(churchId) {
    // Single round-trip — one CTE per source replaces four parallel queries.
    const result = await this.pool.query(
      `WITH member_stats AS (
         SELECT COUNT(*) AS total_members
         FROM members
         WHERE membership_status = 'active' AND church_id = $1
       ),
       event_stats AS (
         SELECT COUNT(*) AS upcoming_events_count
         FROM events
         WHERE event_date >= CURRENT_DATE AND church_id = $1
       ),
       financial_stats AS (
         -- Completed payments = the same rows Payment Management lists.
         SELECT SUM(amount) AS total_income
         FROM payments
         WHERE status = 'completed' AND archived_at IS NULL AND church_id = $1
       ),
       announcement_stats AS (
         SELECT COUNT(*) AS recent_announcements_count
         FROM announcements
         WHERE is_public = true AND church_id = $1
       )
       SELECT
         member_stats.total_members,
         event_stats.upcoming_events_count,
         financial_stats.total_income,
         announcement_stats.recent_announcements_count
       FROM member_stats, event_stats, financial_stats, announcement_stats`,
      [churchId]
    );

    const row = result.rows[0] || {};
    return {
      total_members: parseInt(row.total_members) || 0,
      upcoming_events_count: parseInt(row.upcoming_events_count) || 0,
      total_revenue: row.total_income || 0,
      recent_announcements_count: parseInt(row.recent_announcements_count) || 0
    };
  }

  async getDepartmentCount(churchId) {
    const query = churchId
      ? 'SELECT COUNT(*)::int AS count FROM departments WHERE is_active = true AND church_id = $1'
      : 'SELECT COUNT(*)::int AS count FROM departments WHERE is_active = true';
    const result = await this.pool.query(query, churchId ? [churchId] : []);
    return result.rows[0]?.count || 0;
  }

  async getAnnouncementCount(churchId) {
    const query = `SELECT COUNT(*) as count FROM announcements WHERE is_public = true AND church_id = $1`;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getMemberCount(churchId) {
    const query = `SELECT COUNT(*) as count FROM members WHERE membership_status = 'active' AND church_id = $1`;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getEventCount(churchId) {
    const query = `SELECT COUNT(*) as count FROM events WHERE event_date >= CURRENT_DATE AND church_id = $1`;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getFinancialSummary(churchId) {
    const query = `
      SELECT
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE status = 'approved' AND church_id = $1
    `;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getPendingApprovals(churchId) {
    const query = `
      SELECT COUNT(*) as count
      FROM approval_requests
      WHERE status = 'pending' AND church_id = $1
    `;
    const params = [churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getRecentPaymentsActivity(limit = 5, churchId) {
    const query = `
      SELECT p.*, m.first_name, m.last_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id AND m.church_id = p.church_id
      WHERE p.status = 'completed' AND p.archived_at IS NULL AND p.church_id = $1
      ORDER BY p.payment_date DESC LIMIT $2
    `;
    const params = [churchId, limit];

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentAnnouncements(limit = 5, churchId) {
    const query = `
      SELECT a.*, u.first_name || ' ' || u.last_name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id AND u.church_id = a.church_id
      WHERE a.is_public = true AND a.church_id = $1
      ORDER BY a.created_at DESC LIMIT $2
    `;
    const params = [churchId, limit];

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUpcomingEvents(limit = 5, churchId) {
    const query = `
      SELECT * FROM events
      WHERE event_date >= CURRENT_DATE AND church_id = $1
      ORDER BY event_date ASC LIMIT $2
    `;
    const params = [churchId, limit];

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentMembers(limit = 5, churchId) {
    const query = `
      SELECT * FROM members
      WHERE membership_status = 'active' AND church_id = $1
      ORDER BY joined_date DESC LIMIT $2
    `;
    const params = [churchId, limit];

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUserDepartmentAssignments(userId, churchId) {
    const query = `
      SELECT COUNT(*) as count
      FROM department_members dm
      JOIN departments d ON dm.department_id = d.id AND d.church_id = $2
      WHERE dm.user_id = $1 AND dm.is_active = true AND dm.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserPendingApprovals(userId, churchId) {
    const query = `
      SELECT COUNT(*) as count
      FROM approval_requests
      WHERE requester_id = $1 AND status = 'pending' AND church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserUpcomingEvents(userId, churchId) {
    const query = `
      SELECT COUNT(*) as count
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.member_id = $1 AND e.event_date >= CURRENT_DATE AND e.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserContributions(userId, churchId) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE member_id = $1 AND status = 'completed' AND archived_at IS NULL AND church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].total) || 0;
  }

  async getUserAttendanceRate(userId, churchId) {
    const query = `
      SELECT
        ROUND(
          (COUNT(CASE WHEN ea.attended = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
          2
        ) as attendance_rate
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.member_id = $1
        AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
        AND e.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].attendance_rate) || 0;
  }

  async getUserContributionRate(userId, churchId) {
    const query = `
      SELECT
        ROUND(
          (COUNT(CASE WHEN p.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
          2
        ) as contribution_rate
      FROM payments p
      WHERE p.member_id = $1
        AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND p.archived_at IS NULL
        AND p.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].contribution_rate) || 0;
  }

  async getUserActivityLevel(userId, churchId) {
    // Three scoped count subqueries replace the 4-way LEFT JOIN — the join
    // fanned out attendance x payment x announcement rows for no benefit.
    const query = `
      SELECT
        (
          (SELECT COUNT(DISTINCT e.id)
           FROM event_attendance ea
           JOIN events e ON ea.event_id = e.id
           WHERE ea.member_id = $1
             AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
             AND e.church_id = $2) +
          (SELECT COUNT(DISTINCT p.id)
           FROM payments p
           WHERE p.member_id = $1
             AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
             AND p.status = 'completed'
             AND p.archived_at IS NULL
             AND p.church_id = $2) +
          (SELECT COUNT(DISTINCT a.id)
           FROM announcements a
           WHERE a.author_id = $1
             AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
             AND a.church_id = $2)
        ) as activity_count
      WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND u.church_id = $2)
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    const activityCount = parseInt(result.rows[0].activity_count) || 0;

    // Normalize to 0-100 scale
    return Math.min(activityCount * 10, 100);
  }

  async getUserActivities(userId, churchId = null, limit = 10) {
    let query = `
      SELECT
        'payment' as type,
        CONCAT('Payment of ', p.amount) as title,
        CONCAT('Processed on ', p.payment_date) as description,
        p.created_at as timestamp
      FROM payments p
      WHERE p.member_id = $1 AND p.status = 'completed' AND p.archived_at IS NULL
      
      UNION ALL
      
      SELECT
        'event' as type,
        e.title as title,
        CONCAT('Event on ', e.event_date) as description,
        ea.registered_at as timestamp
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.member_id = $1
      
      UNION ALL
      
      SELECT
        'announcement' as type,
        a.title as title,
        SUBSTRING(a.content, 1, 100) as description,
        a.created_at as timestamp
      FROM announcements a
      WHERE a.author_id = $1
      
      UNION ALL
      
      SELECT
        'department' as type,
        d.name as title,
        'Department membership' as description,
        dm.joined_at as timestamp
      FROM department_members dm
      JOIN departments d ON dm.department_id = d.id
      WHERE dm.user_id = $1
      
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const params = [userId, limit];

    if (churchId) {
      // Add church_id filter to all subqueries
      query = `
        SELECT
          'payment' as type,
          CONCAT('Payment of ', p.amount) as title,
          CONCAT('Processed on ', p.payment_date) as description,
          p.created_at as timestamp
        FROM payments p
        WHERE p.member_id = $1 AND p.status = 'completed' AND p.church_id = $2
          AND p.archived_at IS NULL
        
        UNION ALL
        
        SELECT
          'event' as type,
          e.title as title,
          CONCAT('Event on ', e.event_date) as description,
          ea.registered_at as timestamp
        FROM event_attendance ea
        JOIN events e ON ea.event_id = e.id
        WHERE ea.member_id = $1 AND e.church_id = $2
        
        UNION ALL
        
        SELECT
          'announcement' as type,
          a.title as title,
          SUBSTRING(a.content, 1, 100) as description,
          a.created_at as timestamp
        FROM announcements a
        WHERE a.author_id = $1 AND a.church_id = $2
        
        UNION ALL
        
        SELECT
          'department' as type,
          d.name as title,
          'Department membership' as description,
          dm.joined_at as timestamp
        FROM department_members dm
        JOIN departments d ON dm.department_id = d.id
        WHERE dm.user_id = $1 AND d.church_id = $2
        
        ORDER BY timestamp DESC
        LIMIT $3
      `;
      params.splice(0, params.length, userId, churchId, limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getActivityFeed(limit = 20, churchId = null) {
    const [payments, announcements, events, members] = await Promise.all([
      this.getRecentPaymentsActivity(limit, churchId),
      this.getRecentAnnouncements(limit, churchId),
      this.getUpcomingEvents(limit, churchId),
      this.getRecentMembers(limit, churchId)
    ]);

    const activities = [];

    // Add payment activities
    payments.forEach(payment => {
      activities.push({
        type: 'payment',
        title: `Payment from ${payment.first_name} ${payment.last_name}`,
        description: `Amount: ${payment.amount}`,
        timestamp: payment.payment_date
      });
    });

    // Add announcement activities
    announcements.forEach(announcement => {
      activities.push({
        type: 'announcement',
        title: announcement.title,
        description: announcement.content?.substring(0, 100) || 'New announcement',
        timestamp: announcement.created_at
      });
    });

    // Add event activities
    events.forEach(event => {
      activities.push({
        type: 'event',
        title: event.title,
        description: `Event on ${event.event_date}`,
        timestamp: event.created_at
      });
    });

    // Add member activities
    members.forEach(member => {
      activities.push({
        type: 'member',
        title: `New member: ${member.first_name} ${member.last_name}`,
        description: `Joined on ${member.joined_date}`,
        timestamp: member.joined_date
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities.slice(0, limit);
  }

  // System health metrics for Super Admin
  async getSystemHealth(churchId = null) {
    const dbStart = Date.now();
    const dbCheck = await this.pool.query('SELECT 1 as ok');
    const dbLatencyMs = Date.now() - dbStart;
    const database = dbCheck.rows[0]?.ok === 1 ? 'healthy' : 'unhealthy';

    const userQuery = `
      SELECT COUNT(*) as active_users
      FROM users
      WHERE last_login >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      ${churchId ? 'AND church_id = $1' : ''}
    `;
    const userParams = churchId ? [churchId] : [];
    const userResult = await this.pool.query(userQuery, userParams);

    // "Last sync" = most recent write activity in the system
    const lastApiCall = await this.pool.query(`
      SELECT MAX(ts) as last_request FROM (
        (SELECT created_at ts FROM payments ORDER BY created_at DESC LIMIT 1)
        UNION ALL
        (SELECT created_at FROM announcements ORDER BY created_at DESC LIMIT 1)
        UNION ALL
        (SELECT registered_at FROM event_attendance ORDER BY registered_at DESC LIMIT 1)
      ) t
    `);

    // Real host metrics — no fabricated numbers
    const cpuCount = os.cpus().length || 1;
    const cpuLoad = Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100));
    const memoryUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    const uptimeHours = Math.round(os.uptime() / 3600);

    return {
      database,
      api: 'healthy',
      lastSync: lastApiCall.rows[0]?.last_request
        ? new Date(lastApiCall.rows[0].last_request).toISOString()
        : new Date().toISOString(),
      activeUsers: parseInt(userResult.rows[0]?.active_users) || 0,
      metrics: {
        cpuLoad,
        memoryUsage,
        uptimeHours,
        dbLatencyMs
      }
    };
  }

  /**
   * Departments headed by a user — the real headship link
   * (req.user.department_id never existed; ledger L149)
   */
  async getDepartmentsHeadedBy(userId, churchId) {
    const result = await this.pool.query(
      `SELECT id, name FROM departments
       WHERE head_id = $1 AND church_id = $2 AND is_active = true`,
      [userId, churchId]
    );
    return result.rows;
  }

  // Department-specific stats for Department Head
  async getDepartmentStats(departmentId, churchId = null) {
    const params = [];
    let query = `
      SELECT
        COUNT(DISTINCT dm.user_id) as department_members,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks,
        COUNT(DISTINCT e.id) as department_events,
        COALESCE(SUM(db.total_amount), 0) as department_budget
      FROM department_members dm
      LEFT JOIN events e ON e.department_id = dm.department_id
      LEFT JOIN tasks t ON t.department_id = dm.department_id
      LEFT JOIN department_budgets db ON db.department_id = dm.department_id
    `;

    const conditions = [];
    if (departmentId) {
      params.push(departmentId);
      conditions.push(`dm.department_id = $${params.length}`);
    }
    if (churchId) {
      params.push(churchId);
      conditions.push(`dm.church_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY dm.department_id`;

    const result = await this.pool.query(query, params);
    const row = result.rows[0] || {};
    return {
      departmentMembers: parseInt(row.department_members) || 0,
      pendingTasks: parseInt(row.pending_tasks) || 0,
      departmentEvents: parseInt(row.department_events) || 0,
      departmentBudget: parseFloat(row.department_budget) || 0
    };
  }

  // Ministry health metrics for Pastor
  async getMinistryHealth(churchId = null) {
    const engagementQuery = `
      SELECT
        ROUND(
          COALESCE(AVG(CASE WHEN ea.attended = true THEN 100.0 ELSE 0.0 END), 0),
          2
        ) as member_engagement
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE e.event_date >= CURRENT_DATE - INTERVAL '30 days'
      ${churchId ? 'AND ea.church_id = $1' : ''}
    `;
    const activityQuery = `
      SELECT
        ROUND(
          COALESCE(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
            0
          ),
          2
        ) as department_activity
      FROM tasks
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${churchId ? 'AND church_id = $1' : ''}
    `;
    const growthQuery = `
      SELECT
        ROUND(
          COALESCE(
            COUNT(CASE WHEN membership_status = 'active' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
            0
          ),
          2
        ) as spiritual_growth
      FROM members
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${churchId ? 'AND church_id = $1' : ''}
    `;
    const params = churchId ? [churchId] : [];

    const [engagement, activity, growth] = await Promise.all([
      this.pool.query(engagementQuery, params),
      this.pool.query(activityQuery, params),
      this.pool.query(growthQuery, params)
    ]);

    return {
      memberEngagement: parseFloat(engagement.rows[0]?.member_engagement) || 0,
      departmentActivity: parseFloat(activity.rows[0]?.department_activity) || 0,
      spiritualGrowth: parseFloat(growth.rows[0]?.spiritual_growth) || 0
    };
  }

  // Financial stats for Treasurer
  async getFinancialStats(churchId = null) {
    const params = [];
    const churchFilter = churchId ? 'AND church_id = $1' : '';
    if (churchId) params.push(churchId);

    // Stats are computed from the same tables the destination pages list, so
    // a number on the overview always matches what the treasurer sees after
    // clicking through:
    //   totalBalance    → completed payments − paid expenses (all time); the
    //                     rows live on Payment Management and Expenses
    //   monthlyIncome   → completed payments this month (Payment Management)
    //   monthlyExpenses → expenses this month (Expenses page)
    //   pendingPayments → pending payments (Payment Management)
    // NOTE: `church_accounts`/`transactions` are shadowed legacy tables —
    // no page lists them, so stats must not read from them.
    const totalsQuery = `
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM payments
         WHERE status = 'completed' AND archived_at IS NULL ${churchFilter})
        -
        (SELECT COALESCE(SUM(amount), 0) FROM expenses
         WHERE status = 'paid' ${churchFilter}) AS total_balance,
        (SELECT COALESCE(SUM(amount), 0) FROM payments
         WHERE status = 'completed' AND archived_at IS NULL
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE) ${churchFilter}) AS monthly_income,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses
         WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
           AND status <> 'rejected' ${churchFilter}) AS monthly_expenses,
        (SELECT COUNT(*) FROM payments
         WHERE status = 'pending' AND archived_at IS NULL ${churchFilter}) AS pending_payments
    `;

    const result = await this.pool.query(totalsQuery, params);
    const row = result.rows[0] || {};

    return {
      totalBalance: parseFloat(row.total_balance) || 0,
      pendingPayments: parseInt(row.pending_payments) || 0,
      monthlyIncome: parseFloat(row.monthly_income) || 0,
      monthlyExpenses: parseFloat(row.monthly_expenses) || 0
    };
  }

  // Financial health metrics for Treasurer
  async getFinancialHealth(churchId = null) {
    const params = [];
    const churchFilter = churchId ? 'AND church_id = $1' : '';
    if (churchId) params.push(churchId);

    const budgetQuery = `
      SELECT
        COALESCE(SUM(db.total_amount), 0) as total_budget,
        COALESCE(SUM(db.spent_amount), 0) as total_spent
      FROM department_budgets db
      LEFT JOIN departments d ON d.id = db.department_id
      WHERE 1=1
      ${churchId ? 'AND (d.church_id = $1 OR db.department_id IS NULL)' : ''}
    `;

    const collectionQuery = `
      SELECT
        COALESCE(SUM(current_amount), 0) as total_collected,
        COALESCE(SUM(target_amount), 0) as total_target
      FROM event_collections
      WHERE 1=1
      ${churchFilter}
    `;

    const ratioQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE status = 'approved'
      ${churchFilter}
    `;

    const [budget, collection, ratio] = await Promise.all([
      this.pool.query(budgetQuery, [...params]),
      this.pool.query(collectionQuery, [...params]),
      this.pool.query(ratioQuery, [...params])
    ]);

    const totalBudget = parseFloat(budget.rows[0]?.total_budget) || 0;
    const totalSpent = parseFloat(budget.rows[0]?.total_spent) || 0;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const totalCollected = parseFloat(collection.rows[0]?.total_collected) || 0;
    const totalTarget = parseFloat(collection.rows[0]?.total_target) || 0;
    const collectionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

    const totalIncome = parseFloat(ratio.rows[0]?.total_income) || 0;
    const totalExpense = parseFloat(ratio.rows[0]?.total_expense) || 0;
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

    return {
      budgetUtilization,
      collectionRate,
      expenseRatio
    };
  }

  // Recent money activity for the Treasurer dashboard. Sourced from payments
  // (money in) and expenses (money out) — the same rows listed on Payment
  // Management and the Expenses page, so the feed never shows phantom entries.
  async getTransactions(limit = 20, churchId = null) {
    const params = [limit];
    // Table-qualified filters — payments joins members which also has church_id.
    const paymentsChurch = churchId ? 'AND p.church_id = $2' : '';
    const expensesChurch = churchId ? 'AND e.church_id = $2' : '';
    if (churchId) params.push(churchId);

    const paymentsQuery = `
      SELECT p.id, 'income' AS type,
             'Payment from ' || COALESCE(m.first_name || ' ' || m.last_name, 'Unknown member') AS title,
             COALESCE(p.payment_method::text, 'M-Pesa') AS description,
             p.amount, p.created_at AS time
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.status = 'completed' AND p.archived_at IS NULL ${paymentsChurch}
    `;

    const expensesQuery = `
      SELECT e.id, 'expense' AS type,
             e.description AS title,
             'Expense' AS description,
             e.amount, e.created_at AS time
      FROM expenses e
      WHERE e.status <> 'rejected' ${expensesChurch}
    `;

    const [payments, expenses] = await Promise.all([
      this.pool.query(`${paymentsQuery} ORDER BY p.created_at DESC LIMIT $1`, params),
      this.pool.query(`${expensesQuery} ORDER BY e.created_at DESC LIMIT $1`, params).catch(() => ({ rows: [] }))
    ]);

    return [...payments.rows, ...expenses.rows]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, limit);
  }

  // Get user's departments for Department Head dashboard
  async getUserDepartments(userId, churchId = null) {
    let query = `
      SELECT dm.department_id, d.name, dm.role
      FROM department_members dm
      JOIN departments d ON dm.department_id = d.id
      WHERE dm.user_id = $1 AND dm.is_active = true
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND dm.church_id = $2 AND d.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get department health metrics for Department Head dashboard
  async getDepartmentHealthMetrics(departmentId, churchId = null) {
    try {
      // Get task completion rate
      let taskQuery = `
        SELECT
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
        FROM tasks
        WHERE department_id = $1
      `;
      const taskParams = [departmentId];

      if (churchId) {
        taskQuery += ` AND church_id = $2`;
        taskParams.push(churchId);
      }

      const taskResult = await this.pool.query(taskQuery, taskParams);

      // Get active member count
      let memberQuery = `
        SELECT COUNT(*) as active_members
        FROM department_members
        WHERE department_id = $1 AND is_active = true
      `;
      const memberParams = [departmentId];

      if (churchId) {
        memberQuery += ` AND church_id = $2`;
        memberParams.push(churchId);
      }

      const memberResult = await this.pool.query(memberQuery, memberParams);

      // Get budget utilization
      let budgetQuery = `
        SELECT
          COALESCE(SUM(budget_amount), 0) as total_budget,
          COALESCE(SUM(actual_spend), 0) as spent_budget
        FROM department_budgets
        WHERE department_id = $1
      `;
      const budgetParams = [departmentId];

      if (churchId) {
        budgetQuery += ` AND church_id = $2`;
        budgetParams.push(churchId);
      }

      const budgetResult = await this.pool.query(budgetQuery, budgetParams);

      return {
        totalTasks: parseInt(taskResult.rows[0]?.total_tasks) || 0,
        completedTasks: parseInt(taskResult.rows[0]?.completed_tasks) || 0,
        activeMembers: parseInt(memberResult.rows[0]?.active_members) || 0,
        totalBudget: parseFloat(budgetResult.rows[0]?.total_budget) || 0,
        spentBudget: parseFloat(budgetResult.rows[0]?.spent_budget) || 0
      };
    } catch (error) {
      // Only tolerate missing-table errors (42P01) — anything else
      // (bad SQL, perms, constraint) must surface, not masquerade as zeros.
      if (error.code !== '42P01') throw error;
      return {
        totalTasks: 0,
        completedTasks: 0,
        activeMembers: 0,
        totalBudget: 0,
        spentBudget: 0
      };
    }
  }

  // Get department activity feed for Department Head dashboard
  async getDepartmentActivityFeed(departmentIds, churchId = null, limit = 20) {
    const idList = departmentIds.map((_, i) => `$${i + 1}`).join(',');
    let query = `
      SELECT
        'task' as type,
        t.title,
        CONCAT('Task status: ', t.status) as description,
        t.updated_at as timestamp
      FROM tasks t
      WHERE t.department_id IN (${idList})

      UNION ALL

      SELECT
        'event' as type,
        e.title,
        CONCAT('Event on ', e.event_date) as description,
        e.created_at as timestamp
      FROM events e
      WHERE e.department_id IN (${idList})

      UNION ALL

      SELECT
        'member' as type,
        CONCAT(m.first_name, ' ', m.last_name) as title,
        'Department member activity' as description,
        dm.updated_at as timestamp
      FROM department_members dm
      JOIN members m ON dm.member_id = m.id
      WHERE dm.department_id IN (${idList})

      ORDER BY timestamp DESC
      LIMIT $${departmentIds.length + 1}
    `;
    const params = [...departmentIds, limit];

    if (churchId) {
      // Add church_id filter to all subqueries
      query = `
        SELECT
          'task' as type,
          t.title,
          CONCAT('Task status: ', t.status) as description,
          t.updated_at as timestamp
        FROM tasks t
        WHERE t.department_id IN (${idList}) AND t.church_id = $${departmentIds.length + 1}

        UNION ALL

        SELECT
          'event' as type,
          e.title,
          CONCAT('Event on ', e.event_date) as description,
          e.created_at as timestamp
        FROM events e
        WHERE e.department_id IN (${idList}) AND e.church_id = $${departmentIds.length + 1}

        UNION ALL

        SELECT
          'member' as type,
          CONCAT(m.first_name, ' ', m.last_name) as title,
          'Department member activity' as description,
          dm.updated_at as timestamp
        FROM department_members dm
        JOIN members m ON dm.member_id = m.id
        WHERE dm.department_id IN (${idList}) AND dm.church_id = $${departmentIds.length + 1}

        ORDER BY timestamp DESC
        LIMIT $${departmentIds.length + 2}
      `;
      params.push(churchId, limit);
    }

    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      // Missing-table only (42P01); real errors propagate.
      if (error.code !== '42P01') throw error;
      return [];
    }
  }

  /**
   * One-shot operations snapshot for the Super Admin dashboard — issue
   * counts plus the small lists the admin acts on inline. Every query is
   * church-scoped (or church-agnostic where the table has no church_id,
   * like login_attempts which does have it).
   *
   * A table that is absent in a given environment degrades to zero/empty
   * rather than 500ing the whole snapshot — 42P01 = undefined_table.
   */
  async getOpsSnapshot(churchId) {
    const safe = async (promise, fallback) => {
      try {
        return await promise;
      } catch (error) {
        if (error.code === '42P01' || error.code === '42703') return fallback;
        throw error;
      }
    };

    const [health, failedLogins, lockedUsers, stuckPayments, paymentCounts,
      pendingApprovals, openAlerts] = await Promise.all([
      this.getSystemHealth(churchId).catch(() => null),

      safe(this.pool.query(
        `SELECT COUNT(*) AS count FROM login_attempts
         WHERE success = false AND attempted_at > NOW() - INTERVAL '24 hours'
           AND church_id = $1`,
        [churchId]
      ).then(async (r) => ({
        count: parseInt(r.rows[0]?.count) || 0,
        recent: (await this.pool.query(
          `SELECT email, ip_address::text AS ip_address, attempted_at
           FROM login_attempts
           WHERE success = false AND church_id = $1
           ORDER BY attempted_at DESC LIMIT 5`,
          [churchId]
        )).rows,
      })), { count: 0, recent: [] }),

      safe(this.pool.query(
        `SELECT id, email, first_name, last_name, locked_until, failed_login_attempts,
                COUNT(*) OVER() AS total
         FROM users
         WHERE locked_until > NOW() AND church_id = $1
         ORDER BY locked_until DESC LIMIT 5`,
        [churchId]
      ).then((r) => ({ count: parseInt(r.rows[0]?.total) || 0, list: r.rows })), { count: 0, list: [] }),

      safe(this.pool.query(
        `SELECT id, amount, category, phone_number, payment_method, created_at,
                COUNT(*) OVER() AS total
         FROM payments
         WHERE status = 'pending'
           AND created_at < NOW() - INTERVAL '24 hours'
           AND archived_at IS NULL
           AND church_id = $1
         ORDER BY created_at ASC LIMIT 5`,
        [churchId]
      ).then((r) => ({ count: parseInt(r.rows[0]?.total) || 0, list: r.rows })), { count: 0, list: [] }),

      safe(this.pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') AS failed_24h,
           COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours') AS stuck
         FROM payments WHERE church_id = $1 AND archived_at IS NULL`,
        [churchId]
      ).then((r) => ({
        failed24h: parseInt(r.rows[0]?.failed_24h) || 0,
        stuck: parseInt(r.rows[0]?.stuck) || 0,
      })), { failed24h: 0, stuck: 0 }),

      safe(this.pool.query(
        `SELECT id, title, request_type, status, created_at,
                COUNT(*) OVER() AS total
         FROM approval_requests
         WHERE status = 'pending' AND church_id = $1
         ORDER BY created_at ASC LIMIT 5`,
        [churchId]
      ).then((r) => ({ count: parseInt(r.rows[0]?.total) || 0, list: r.rows })), { count: 0, list: [] }),

      safe(this.pool.query(
        `SELECT id, alert_type, title, message, priority, created_at,
                COUNT(*) OVER() AS total
         FROM financial_alerts
         WHERE is_resolved = false AND church_id = $1
         ORDER BY created_at DESC LIMIT 5`,
        [churchId]
      ).then((r) => ({ count: parseInt(r.rows[0]?.total) || 0, list: r.rows })), { count: 0, list: [] }),
    ]);

    return {
      health,
      issues: {
        failedLogins24h: failedLogins.count,
        lockedAccounts: lockedUsers.count,
        stuckPayments: paymentCounts.stuck,
        failedPayments24h: paymentCounts.failed24h,
        pendingApprovals: pendingApprovals.count,
        openAlerts: openAlerts.count,
      },
      lists: {
        failedLogins: failedLogins.recent,
        lockedUsers: lockedUsers.list,
        stuckPayments: stuckPayments.list,
        pendingApprovals: pendingApprovals.list,
        openAlerts: openAlerts.list,
      },
    };
  }

  /**
   * Mark a financial alert resolved — the inline "Resolve" control on the
   * ops dashboard. Church-scoped so an admin can only close their own
   * church's alerts. Returns the row, or null when it doesn't exist / is
   * already resolved.
   */
  async resolveAlert(alertId, churchId, userId) {
    const result = await this.pool.query(
      `UPDATE financial_alerts
       SET is_resolved = true,
           resolved_at = NOW(),
           resolved_by = $3,
           updated_at = NOW()
       WHERE id = $1 AND church_id = $2 AND is_resolved = false
       RETURNING id, title`,
      [alertId, churchId, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Clear an account lockout — resets the brute-force counters so the user
   * can log in again. Church-scoped. Returns the row, or null.
   */
  async unlockUser(userId, churchId) {
    const result = await this.pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = NOW()
       WHERE id = $1 AND church_id = $2
       RETURNING id, email`,
      [userId, churchId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new DashboardRepository();
