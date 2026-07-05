const BaseRepository = require('./BaseRepository');

class DashboardRepository extends BaseRepository {
  constructor() {
    super('summaries');
  }

  async getSummary(churchId = null) {
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

  async getAnnouncementCount(churchId = null) {
    let query = `SELECT COUNT(*) as count FROM announcements WHERE is_public = true`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getMemberCount(churchId = null) {
    let query = `SELECT COUNT(*) as count FROM members WHERE membership_status = 'active'`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getEventCount(churchId = null) {
    let query = `SELECT COUNT(*) as count FROM events WHERE event_date >= CURRENT_DATE`;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getFinancialSummary(churchId = null) {
    let query = `
      SELECT
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense
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

  async getPendingApprovals(churchId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM approval_requests
      WHERE status = 'pending'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getRecentPaymentsActivity(limit = 5, churchId = null) {
    let query = `
      SELECT p.*, m.first_name, m.last_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.status = 'completed'
    `;
    const params = [];

    if (churchId) {
      query += ` AND p.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentAnnouncements(limit = 5, churchId = null) {
    let query = `
      SELECT a.*, u.first_name || ' ' || u.last_name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_public = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND a.church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUpcomingEvents(limit = 5, churchId = null) {
    let query = `
      SELECT * FROM events
      WHERE event_date >= CURRENT_DATE
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY event_date ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentMembers(limit = 5, churchId = null) {
    let query = `
      SELECT * FROM members
      WHERE membership_status = 'active'
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY joined_date DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUserDepartmentAssignments(userId, churchId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM department_members
      WHERE user_id = $1 AND is_active = true
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserPendingApprovals(userId, churchId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM approval_requests
      WHERE user_id = $1 AND status = 'pending'
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserUpcomingEvents(userId, churchId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.user_id = $1 AND e.event_date >= CURRENT_DATE
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND e.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getUserContributions(userId, churchId = null) {
    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE user_id = $1 AND status = 'completed'
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].total) || 0;
  }

  async getUserAttendanceRate(userId, churchId = null) {
    let query = `
      SELECT
        ROUND(
          (COUNT(CASE WHEN ea.attended = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
          2
        ) as attendance_rate
      FROM event_attendance ea
      JOIN events e ON ea.event_id = e.id
      WHERE ea.user_id = $1
        AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND e.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].attendance_rate) || 0;
  }

  async getUserContributionRate(userId, churchId = null) {
    let query = `
      SELECT
        ROUND(
          (COUNT(CASE WHEN p.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
          2
        ) as contribution_rate
      FROM payments p
      WHERE p.user_id = $1
        AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND p.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0].contribution_rate) || 0;
  }

  async getUserActivityLevel(userId, churchId = null) {
    let query = `
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
      WHERE u.id = $1
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND u.church_id = $2`;
      params.push(churchId);
    }

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
}

module.exports = new DashboardRepository();
