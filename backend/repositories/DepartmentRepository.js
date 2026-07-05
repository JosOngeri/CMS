const BaseRepository = require('./BaseRepository');

class DepartmentRepository extends BaseRepository {
  constructor() {
    super('departments');
  }

  async findByName(name, churchId) {
    const result = await this.pool.query(
      'SELECT * FROM departments WHERE name = $1 AND church_id = $2',
      [name, churchId]
    );
    return result.rows[0];
  }

  async getIdBySlug(slug) {
    const result = await this.pool.query(
      'SELECT id FROM departments WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  async getAvailableDepartments(userId) {
    const result = await this.pool.query(`
      SELECT
        d.id,
        d.name,
        d.description,
        d.category,
        d.is_active
      FROM departments d
      WHERE d.is_active = true
      AND d.id NOT IN (
        SELECT dm.department_id
        FROM department_members dm
        WHERE dm.user_id = $1
        AND dm.status IN ('approved', 'pending')
      )
      ORDER BY d.category, d.name
    `, [userId]);
    return result.rows;
  }

  async insertDepartmentMember(client, data) {
    const { userId, departmentId, role, isActive, status, approvedAt, approvedBy } = data;
    const result = await client.query(`
      INSERT INTO department_members (user_id, department_id, role, is_active, status, approved_at, approved_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, department_id) DO UPDATE
      SET is_active = $4, role = $3, status = $5, approved_at = $6, approved_by = $7
      RETURNING *
    `, [userId, departmentId, role, isActive, status, approvedAt, approvedBy]);
    return result.rows[0];
  }

  async getDepartmentMember(userId, departmentId) {
    const result = await this.pool.query(
      'SELECT * FROM department_members WHERE user_id = $1 AND department_id = $2',
      [userId, departmentId]
    );
    return result.rows[0];
  }

  async updateDepartmentMemberStatus(userId, departmentId, isActive, status) {
    const result = await this.pool.query(`
      UPDATE department_members
      SET is_active = $1, status = $2
      WHERE user_id = $3 AND department_id = $4
      RETURNING *
    `, [isActive, status, userId, departmentId]);
    return result.rows[0];
  }

  async getDepartmentMembers(departmentId) {
    const result = await this.pool.query(
      `SELECT u.*, dm.role
       FROM users u
       JOIN department_members dm ON u.id = dm.user_id
       WHERE dm.department_id = $1`,
      [departmentId]
    );
    return result.rows;
  }

  async getMembers(departmentId) {
    const result = await this.pool.query(
      `SELECT u.*, dm.role
       FROM users u
       JOIN department_members dm ON u.id = dm.user_id
       WHERE dm.department_id = $1`,
      [departmentId]
    );
    return result.rows;
  }

  async getGlobalOverview(filters = {}, churchId = null) {
    let query = `
      SELECT 
        d.id,
        d.name,
        d.slug,
        d.description,
        d.category,
        d.leader_name,
        d.leader_contact,
        d.created_at,
        (SELECT COUNT(*) FROM department_members dm WHERE dm.department_id = d.id AND dm.is_active = true) as member_count,
        (SELECT COUNT(*) FROM department_communications dc WHERE dc.department_id = d.id AND dc.sent_at >= CURRENT_DATE - INTERVAL '7 days') as recent_communications,
        (SELECT COUNT(*) FROM department_meetings dm WHERE dm.department_id = d.id AND dm.meeting_date >= CURRENT_DATE - INTERVAL '7 days') as recent_meetings,
        CASE 
          WHEN (SELECT COUNT(*) FROM department_communications dc WHERE dc.department_id = d.id AND dc.sent_at >= CURRENT_DATE - INTERVAL '7 days') > 0 
          OR (SELECT COUNT(*) FROM department_meetings dm WHERE dm.department_id = d.id AND dm.meeting_date >= CURRENT_DATE - INTERVAL '7 days') > 0
          THEN 'active'
          ELSE 'inactive'
        END as activity_status
      FROM departments d
      WHERE d.is_active = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND d.church_id = $${params.length + 1}`;
      params.push(churchId);
    }

    if (filters.category) {
      query += ` AND d.category = $${params.length + 1}`;
      params.push(filters.category);
    }

    query += ` ORDER BY d.category, d.name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentActivity(churchId) {
    const result = await this.pool.query(`
      SELECT
        d.name as department_name,
        d.category,
        'communication' as type,
        dc.title,
        dc.sent_at as date,
        CONCAT(u.first_name, ' ', u.last_name) as author
      FROM department_communications dc
      JOIN departments d ON dc.department_id = d.id
      JOIN users u ON dc.sender_id = u.id
      WHERE dc.sent_at >= CURRENT_DATE - INTERVAL '7 days'
      ${churchId ? `AND d.church_id = $1` : ''}
      UNION ALL
      SELECT
        d.name as department_name,
        d.category,
        'meeting' as type,
        dm.title,
        dm.meeting_date as date,
        CONCAT(u.first_name, ' ', u.last_name) as author
      FROM department_meetings dm
      JOIN departments d ON dm.department_id = d.id
      JOIN users u ON dm.organizer_id = u.id
      WHERE dm.meeting_date >= CURRENT_DATE - INTERVAL '7 days'
      ${churchId ? `AND d.church_id = $1` : ''}
      ORDER BY date DESC
      LIMIT 20
    `, churchId ? [churchId] : []);
    return result.rows;
  }

  async getUserDepartments(userId, churchId = null) {
    let query = `
      SELECT d.*, dm.role
      FROM departments d
      JOIN department_members dm ON d.id = dm.department_id
      WHERE dm.user_id = $1 AND dm.is_active = true
    `;
    const params = [userId];

    if (churchId) {
      query += ` AND d.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY d.name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCommunications(departmentId, limit = 20) {
    const result = await this.pool.query(
      `SELECT dc.*, u.first_name || ' ' || u.last_name as sender_name
       FROM department_communications dc
       LEFT JOIN users u ON dc.sender_id = u.id
       WHERE dc.department_id = $1
       ORDER BY dc.sent_at DESC
       LIMIT $2`,
      [departmentId, limit]
    );
    return result.rows;
  }

  async getMeetings(departmentId, limit = 20) {
    const result = await this.pool.query(
      `SELECT dm.*, u.first_name || ' ' || u.last_name as organizer_name
       FROM department_meetings dm
       LEFT JOIN users u ON dm.organizer_id = u.id
       WHERE dm.department_id = $1
       ORDER BY dm.meeting_date DESC
       LIMIT $2`,
      [departmentId, limit]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Statistics and overview
  // ---------------------------------------------------------------------------

  async getGlobalStats(churchId = null) {
    let query = `
      SELECT
        COUNT(*) as total_departments,
        COUNT(DISTINCT category) as total_categories,
        (SELECT COUNT(*) FROM department_members WHERE is_active = true) as total_members,
        (SELECT COUNT(*) FROM departments WHERE is_active = true) as active_departments
      FROM departments
      WHERE is_active = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async findDepartmentByIdWithLeader(departmentId) {
    const result = await this.pool.query(
      `SELECT d.id, d.name, d.slug, d.category, d.head_id,
              d.logo_url, d.banner_url, d.logo_color, d.banner_color,
              CONCAT(u.first_name, ' ', u.last_name) as leader_name
       FROM departments d
       LEFT JOIN users u ON d.head_id = u.id
       WHERE d.id = $1`,
      [departmentId]
    );
    return result.rows[0];
  }

  async findMemberRole(departmentId, userId) {
    const result = await this.pool.query(
      `SELECT dm.role
       FROM department_members dm
       WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true`,
      [departmentId, userId]
    );
    return result.rows[0];
  }

  async getMemberCount(departmentId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM department_members WHERE department_id = $1 AND is_active = true`,
      [departmentId]
    );
    return result.rows[0].count;
  }

  async getDepartmentMetrics(departmentId) {
    const result = await this.pool.query(
      `SELECT
        (SELECT COUNT(*) FROM department_members WHERE department_id = $1 AND is_active = true) as total_members,
        (SELECT COUNT(*) FROM department_communications WHERE department_id = $1 AND sent_at >= CURRENT_DATE - INTERVAL '30 days') as communications_this_month,
        (SELECT COUNT(*) FROM department_meetings WHERE department_id = $1 AND meeting_date >= CURRENT_DATE - INTERVAL '30 days') as meetings_this_month,
        COALESCE((SELECT COUNT(*) FROM department_tasks WHERE department_id = $1 AND status != 'completed'), 0) as pending_tasks,
        COALESCE((SELECT COUNT(*) FROM department_reports WHERE department_id = $1 AND submission_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as reports_this_month,
        COALESCE((SELECT COUNT(*) FROM department_resources WHERE department_id = $1 AND uploaded_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as resources_added_this_month`,
      [departmentId]
    );
    return result.rows[0];
  }

  async getRecentActivities(departmentId) {
    const result = await this.pool.query(
      `SELECT
        'communication' as type,
        dc.title,
        dc.sent_at as date,
        CONCAT(u.first_name, ' ', u.last_name) as author
      FROM department_communications dc
      JOIN users u ON dc.sender_id = u.id
      WHERE dc.department_id = $1
      UNION ALL
      SELECT
        'meeting' as type,
        dm.title,
        dm.meeting_date as date,
        CONCAT(u.first_name, ' ', u.last_name) as author
      FROM department_meetings dm
      JOIN users u ON dm.organizer_id = u.id
      WHERE dm.department_id = $1
      UNION ALL
      SELECT
        'task' as type,
        dt.title,
        dt.created_at as date,
        CONCAT(u.first_name, ' ', u.last_name) as author
      FROM department_tasks dt
      JOIN users u ON dt.assigned_by = u.id
      WHERE dt.department_id = $1
      ORDER BY date DESC
      LIMIT 10`,
      [departmentId]
    );
    return result.rows;
  }

  async getUpcomingMeetings(departmentId) {
    const result = await this.pool.query(
      `SELECT
        id,
        title,
        description,
        meeting_date,
        duration,
        location,
        status
      FROM department_meetings
      WHERE department_id = $1 AND meeting_date >= CURRENT_DATE
      ORDER BY meeting_date ASC
      LIMIT 5`,
      [departmentId]
    );
    return result.rows;
  }

  async getPendingTasks(departmentId) {
    const result = await this.pool.query(
      `SELECT
        dt.id,
        dt.title,
        dt.description,
        dt.due_date,
        dt.priority,
        CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name,
        CONCAT(ua.first_name, ' ', ua.last_name) as assigned_by_name
      FROM department_tasks dt
      JOIN users u ON dt.assigned_to = u.id
      JOIN users ua ON dt.assigned_by = ua.id
      WHERE dt.department_id = $1 AND dt.status = 'pending'
      ORDER BY dt.due_date ASC
      LIMIT 10`,
      [departmentId]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Communications
  // ---------------------------------------------------------------------------

  async createCommunication(data) {
    const result = await this.pool.query(
      `INSERT INTO department_communications
       (department_id, title, message, type, priority, sender_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.departmentId, data.title, data.message, data.type, data.priority, data.senderId, data.expiresAt]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Meetings
  // ---------------------------------------------------------------------------

  async createMeeting(data) {
    const result = await this.pool.query(
      `INSERT INTO department_meetings
       (department_id, title, description, meeting_date, duration, location, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.departmentId, data.title, data.description, data.meetingDate, data.duration, data.location, data.organizerId]
    );
    return result.rows[0];
  }

  async addMeetingAttendees(meetingId, departmentId) {
    await this.pool.query(
      `INSERT INTO department_meeting_attendees (meeting_id, member_id)
       SELECT $1, user_id
       FROM department_members
       WHERE department_id = $2 AND is_active = true
       ON CONFLICT (meeting_id, member_id) DO NOTHING`,
      [meetingId, departmentId]
    );
  }

  // ---------------------------------------------------------------------------
  // Component allocations
  // ---------------------------------------------------------------------------

  async findDepartmentHeadId(departmentId) {
    const result = await this.pool.query(
      `SELECT head_id FROM departments WHERE id = $1`,
      [departmentId]
    );
    return result.rows[0]?.head_id;
  }

  async allocateComponent(componentId, departmentId, grantedBy) {
    const result = await this.pool.query(
      `INSERT INTO department_component_allocations (component_id, department_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (component_id, department_id) DO NOTHING
       RETURNING *`,
      [componentId, departmentId, grantedBy]
    );
    return result.rows[0];
  }

  async removeComponentAllocation(componentId, departmentId) {
    await this.pool.query(
      `DELETE FROM department_component_allocations
       WHERE component_id = $1 AND department_id = $2`,
      [componentId, departmentId]
    );
  }

  async updateMemberRole(departmentId, userId, role) {
    await this.pool.query(
      `UPDATE department_members
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE department_id = $2 AND user_id = $3`,
      [role, departmentId, userId]
    );
  }

  // ---------------------------------------------------------------------------
  // Components
  // ---------------------------------------------------------------------------

  async getAllComponents() {
    const result = await this.pool.query(
      `SELECT * FROM department_components
       ORDER BY type, name`
    );
    return result.rows;
  }

  async getDepartmentComponents(departmentId) {
    const result = await this.pool.query(
      `SELECT dc.*, dca.granted_at, dca.granted_by,
              CONCAT(u.first_name, ' ', u.last_name) as granted_by_name
       FROM department_components dc
       INNER JOIN department_component_allocations dca ON dc.id = dca.component_id
       LEFT JOIN users u ON dca.granted_by = u.id
       WHERE dca.department_id = $1
       ORDER BY dc.type, dc.name`,
      [departmentId]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Admins
  // ---------------------------------------------------------------------------

  async getDepartmentAdmins(departmentId) {
    const result = await this.pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
              dm.role, dm.joined_at,
              CASE
                WHEN d.head_id = u.id THEN true
                ELSE false
              END as is_head
       FROM users u
       INNER JOIN department_members dm ON u.id = dm.user_id
       LEFT JOIN departments d ON dm.department_id = d.id
       WHERE dm.department_id = $1 AND dm.is_active = true
       AND (dm.role = 'Admin' OR dm.role = 'Leader')
       ORDER BY dm.role DESC, u.first_name, u.last_name`,
      [departmentId]
    );
    return result.rows;
  }

  // ---------------------------------------------------------------------------
  // Branding
  // ---------------------------------------------------------------------------

  async updateLogo(departmentId, logoUrl) {
    await this.pool.query(
      `UPDATE departments
       SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [logoUrl, departmentId]
    );
  }

  async updateBanner(departmentId, bannerUrl) {
    await this.pool.query(
      `UPDATE departments
       SET banner_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [bannerUrl, departmentId]
    );
  }

  async updateColors(departmentId, logoColor, bannerColor) {
    await this.pool.query(
      `UPDATE departments
       SET logo_color = $1, banner_color = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [logoColor, bannerColor, departmentId]
    );
  }

  async getBranding(departmentId) {
    const result = await this.pool.query(
      `SELECT logo_url, banner_url, primary_color, secondary_color, accent_color
       FROM departments WHERE id = $1`,
      [departmentId]
    );
    return result.rows[0];
  }

  async updateBranding(departmentId, data) {
    await this.pool.query(
      `UPDATE departments
       SET logo_url = COALESCE($1, logo_url),
           banner_url = COALESCE($2, banner_url),
           primary_color = COALESCE($3, primary_color),
           secondary_color = COALESCE($4, secondary_color),
           accent_color = COALESCE($5, accent_color)
       WHERE id = $6`,
      [data.logoUrl, data.bannerUrl, data.primaryColor, data.secondaryColor, data.accentColor, departmentId]
    );
  }

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  async getPermissions(departmentId) {
    const result = await this.pool.query(
      `SELECT * FROM department_permissions WHERE department_id = $1`,
      [departmentId]
    );
    return result.rows;
  }

  async setPermission(departmentId, userId, permission, granted) {
    const result = await this.pool.query(
      `INSERT INTO department_permissions (department_id, user_id, permission, granted)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (department_id, user_id, permission)
       DO UPDATE SET granted = $4
       RETURNING *`,
      [departmentId, userId, permission, granted]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------

  async getActivity(departmentId) {
    const result = await this.pool.query(
      `SELECT * FROM department_activity WHERE department_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [departmentId]
    );
    return result.rows;
  }

  async logActivity(departmentId, userId, action, details) {
    await this.pool.query(
      `INSERT INTO department_activity (department_id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [departmentId, userId, action, JSON.stringify(details)]
    );
  }

  // ---------------------------------------------------------------------------
  // Budget
  // ---------------------------------------------------------------------------

  async getBudget(departmentId) {
    const result = await this.pool.query(
      `SELECT * FROM department_budgets WHERE department_id = $1`,
      [departmentId]
    );
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  async getStatistics(departmentId) {
    const memberCount = await this.pool.query(
      'SELECT COUNT(*) as count FROM department_members WHERE department_id = $1',
      [departmentId]
    );

    const meetingCount = await this.pool.query(
      'SELECT COUNT(*) as count FROM department_meetings WHERE department_id = $1',
      [departmentId]
    );

    return {
      memberCount: parseInt(memberCount.rows[0].count),
      meetingCount: parseInt(meetingCount.rows[0].count)
    };
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(departmentId) {
    const result = await this.pool.query(
      'SELECT * FROM department_settings WHERE department_id = $1',
      [departmentId]
    );
    return result.rows;
  }

  async upsertSetting(departmentId, key, value) {
    await this.pool.query(
      `INSERT INTO department_settings (department_id, setting_key, setting_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (department_id, setting_key)
       DO UPDATE SET setting_value = $3`,
      [departmentId, key, value]
    );
  }
}

module.exports = new DepartmentRepository();
