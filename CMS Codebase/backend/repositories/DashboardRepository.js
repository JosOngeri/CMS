const BaseRepository = require('./BaseRepository');

class DashboardRepository extends BaseRepository {
  constructor() {
    super('summaries');
  }

  async getSummary(churchId) {
    // Get real-time statistics from actual tables instead of summaries table
    const [memberCount, eventCount, financialSummary, announcementCount] = await Promise.all([
      this.getMemberCount(churchId),
      this.getEventCount(churchId),
      this.getFinancialSummary(churchId),
      this.getAnnouncementCount(churchId)
    ]);

    return {
      total_members: memberCount,
      upcoming_events_count: eventCount,
      total_revenue: financialSummary?.total_income || 0,
      recent_announcements_count: announcementCount
    };
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
      WHERE p.status = 'completed' AND p.church_id = $1
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
      WHERE user_id = $1 AND status = 'pending' AND church_id = $2
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
      WHERE ea.user_id = $1 AND e.event_date >= CURRENT_DATE AND e.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserContributions(userId, churchId) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE user_id = $1 AND status = 'completed' AND church_id = $2
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
      WHERE ea.user_id = $1
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
      WHERE p.user_id = $1
        AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND p.church_id = $2
    `;
    const params = [userId, churchId];

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].contribution_rate) || 0;
  }

  async getUserActivityLevel(userId, churchId) {
    const query = `
      SELECT
        (
          COUNT(DISTINCT CASE WHEN e.event_date >= CURRENT_DATE - INTERVAL '30 days' THEN e.id END) +
          COUNT(DISTINCT CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' AND p.status = 'completed' THEN p.id END) +
          COUNT(DISTINCT CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END)
        ) as activity_count
      FROM users u
      LEFT JOIN event_attendance ea ON u.id = ea.user_id
      LEFT JOIN events e ON ea.event_id = e.id
      LEFT JOIN payments p ON u.id = p.user_id
      LEFT JOIN announcements a ON u.id = a.author_id
      WHERE u.id = $1 AND u.church_id = $2
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
      WHERE p.user_id = $1 AND p.status = 'completed'
      
      UNION ALL
      
      SELECT
        'event' as type,
        e.title as title,
        CONCAT('Event on ', e.event_date) as description,
        ea.registered_at as timestamp
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.user_id = $1
      
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
        WHERE p.user_id = $1 AND p.status = 'completed' AND p.church_id = $2
        
        UNION ALL
        
        SELECT
          'event' as type,
          e.title as title,
          CONCAT('Event on ', e.event_date) as description,
          ea.registered_at as timestamp
        FROM event_attendance ea
        JOIN events e ON ea.event_id = e.id
        WHERE ea.user_id = $1 AND e.church_id = $2
        
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
      params.push(churchId, limit);
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
    // TODO: Implement real system health checks
    // Should check database connection, API health, last sync time, active users count
    return {
      database: 'healthy',
      api: 'healthy',
      lastSync: new Date().toISOString(),
      activeUsers: 0
    };
  }

  // Department-specific stats for Department Head
  async getDepartmentStats(departmentId, churchId = null) {
    // TODO: Implement real department statistics
    // Should get department members count, pending tasks, department events, department budget
    const params = departmentId ? [departmentId] : [];
    let query = `
      SELECT 
        COUNT(DISTINCT dm.user_id) as department_members,
        0 as pending_tasks,
        COUNT(DISTINCT e.id) as department_events,
        0 as department_budget
      FROM department_members dm
      LEFT JOIN events e ON e.department_id = dm.department_id
    `;
    
    if (departmentId) {
      query += ` WHERE dm.department_id = $1`;
    }
    
    if (churchId) {
      query += departmentId ? ` AND dm.church_id = $2` : ` WHERE dm.church_id = $1`;
      params.push(churchId);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows[0] || {};
  }

  // Ministry health metrics for Pastor
  async getMinistryHealth(churchId = null) {
    // TODO: Implement real ministry health calculations
    // Should calculate member engagement, department activity, spiritual growth metrics
    return {
      memberEngagement: 0,
      departmentActivity: 0,
      spiritualGrowth: 0
    };
  }

  // Financial stats for Treasurer
  async getFinancialStats(churchId = null) {
    // TODO: Implement real financial statistics
    // Should get total balance, pending payments, monthly income/expenses
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_balance,
        0 as pending_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as monthly_expenses
      FROM transactions
      WHERE status = 'approved'
    `;
    const params = [];
    
    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows[0] || {};
  }

  // Financial health metrics for Treasurer
  async getFinancialHealth(churchId = null) {
    // TODO: Implement real financial health calculations
    // Should calculate budget utilization, collection rate, expense ratio
    return {
      budgetUtilization: 0,
      collectionRate: 0,
      expenseRatio: 0
    };
  }

  // Recent transactions for Treasurer
  async getTransactions(limit = 20, churchId = null) {
    let query = `
      SELECT t.*,
             CASE
               WHEN t.transaction_type = 'income' THEN m.first_name || ' ' || m.last_name
               ELSE t.description
             END as description
      FROM transactions t
      LEFT JOIN members m ON t.member_id = m.id
      WHERE t.status = 'approved'
    `;
    const params = [];

    if (churchId) {
      query += ` AND t.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
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
      const taskQuery = `
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
      const memberQuery = `
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
      const budgetQuery = `
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
      // If tables don't exist, return zeros
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
      // If tables don't exist, return empty array
      return [];
    }
  }
}

module.exports = new DashboardRepository();
