const BaseRepository = require('./BaseRepository');

class DepartmentsRepository extends BaseRepository {
  constructor() {
    super('departments');
  }

  /**
   * Tenant gate for every department-scoped op — controllers call this before
   * read/mutate so a departmentId from another church gets a 404, not data.
   */
  async departmentBelongsToChurch(departmentId, churchId) {
    const result = await this.pool.query(
      'SELECT 1 FROM departments WHERE id = $1 AND church_id = $2',
      [departmentId, churchId]
    );
    return result.rowCount > 0;
  }

  async getAllWithStats(churchId = null) {
    // Single pass — LEFT JOIN + GROUP BY replaces three correlated subqueries
    // per department row (N+1). COUNT(DISTINCT) neutralises join fan-out.
    let query = `
      SELECT d.*,
       COUNT(DISTINCT dmem.id) as member_count,
       COUNT(DISTINCT dc.id) as recent_communications,
       COUNT(DISTINCT dmeet.id) as recent_meetings
      FROM departments d
      LEFT JOIN department_members dmem
        ON dmem.department_id = d.id AND dmem.is_active = true
      LEFT JOIN department_communications dc
        ON dc.department_id = d.id AND dc.sent_at >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN department_meetings dmeet
        ON dmeet.department_id = d.id AND dmeet.meeting_date >= CURRENT_DATE - INTERVAL '30 days'
      WHERE d.is_active = true
    `;
    const params = [];

    if (churchId) {
      query += ` AND d.church_id = $1`;
      params.push(churchId);
    }

    query += ` GROUP BY d.id ORDER BY d.name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentFeatures(departmentId, churchId = null) {
    let query = `SELECT * FROM department_features WHERE department_id = $1`;
    const params = [departmentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentPermissions(departmentId, churchId = null) {
    let query = `
      SELECT dp.*, p.name as permission_name
      FROM department_permissions dp
      LEFT JOIN permissions p ON dp.permission_id = p.id
      WHERE dp.department_id = $1
    `;
    const params = [departmentId];

    if (churchId) {
      query += ` AND dp.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentBudget(departmentId, churchId = null) {
    let query = `SELECT * FROM department_budgets WHERE department_id = $1`;
    const params = [departmentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDepartmentStatistics(departmentId, churchId = null) {
    let query = `
      SELECT
        (SELECT COUNT(*) FROM department_members WHERE department_id = $1 AND is_active = true) as total_members,
        (SELECT COUNT(*) FROM department_communications WHERE department_id = $1 AND sent_at >= CURRENT_DATE - INTERVAL '30 days') as communications_sent,
        (SELECT COUNT(*) FROM department_meetings WHERE department_id = $1 AND meeting_date >= CURRENT_DATE - INTERVAL '30 days') as meetings_held,
        (SELECT COALESCE(SUM(amount), 0) FROM department_budgets WHERE department_id = $1) as total_budget
    `;
    const params = [departmentId];

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getDepartmentById(id, churchId = null) {
    const result = await this.pool.query(
      `SELECT * FROM departments WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rows[0];
  }

  async findAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    query += ` ORDER BY name`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDepartmentMembers(id) {
    const result = await this.pool.query(
      `SELECT dm.*, u.first_name || ' ' || u.last_name as member_name, u.email
       FROM department_members dm
       JOIN users u ON dm.user_id = u.id
       WHERE dm.department_id = $1 AND dm.is_active = true`,
      [id]
    );
    return result.rows;
  }

  async createDepartment(name, description, category, leaderName, leaderContact, churchId = null, churchSlug = null) {
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null;
    const result = await this.pool.query(
      `INSERT INTO departments (name, description, category, leader_name, leader_contact, church_id, church_slug, slug, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [name, description, category, leaderName, leaderContact, churchId, churchSlug, slug]
    );
    return result.rows[0];
  }

  async updateDepartment(id, name, description, category, leaderName, leaderContact, isActive, churchId = null) {
    const result = await this.pool.query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           leader_name = COALESCE($4, leader_name),
           leader_contact = COALESCE($5, leader_contact),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7${churchId ? ' AND church_id = $8' : ''}
       RETURNING *`,
      churchId ? [name, description, category, leaderName, leaderContact, isActive, id, churchId]
               : [name, description, category, leaderName, leaderContact, isActive, id]
    );
    return result.rows[0];
  }

  async deleteDepartment(id, churchId = null) {
    const result = await this.pool.query(
      `DELETE FROM departments WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`,
      churchId ? [id, churchId] : [id]
    );
    return result.rowCount;
  }

  async addMember(userId, departmentId, role, churchId = null) {
    // Both the target user and the department must belong to the caller's
    // church — otherwise this is a cross-tenant self-insert.
    const result = await this.pool.query(
      `INSERT INTO department_members (user_id, department_id, role, church_id)
       SELECT $1, $2, $3, $4
       WHERE EXISTS (SELECT 1 FROM users WHERE id = $1 AND church_id = $4)
         AND EXISTS (SELECT 1 FROM departments WHERE id = $2 AND church_id = $4)
       ON CONFLICT (user_id, department_id) DO UPDATE SET
         role = EXCLUDED.role,
         is_active = true,
         joined_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, departmentId, role || 'Member', churchId]
    );
    return result.rows[0];
  }

  async removeMember(departmentId, userId, churchId = null) {
    await this.pool.query(
      `DELETE FROM department_members WHERE department_id = $1 AND user_id = $2${churchId ? ' AND church_id = $3' : ''}`,
      churchId ? [departmentId, userId, churchId] : [departmentId, userId]
    );
  }

  async getMeetings(departmentId, status) {
    let query = `
      SELECT dm.*, d.name as department_name, u.first_name || ' ' || u.last_name as organizer_name
      FROM department_meetings dm
      JOIN departments d ON dm.department_id = d.id
      LEFT JOIN users u ON dm.organizer_id = u.id
      WHERE dm.department_id = $1
    `;
    const params = [departmentId];

    if (status) {
      query += ` AND dm.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY dm.meeting_date DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createMeeting(departmentId, title, description, meetingDate, duration, location, organizerId) {
    const result = await this.pool.query(
      `INSERT INTO department_meetings (department_id, title, description, meeting_date, duration, location, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [departmentId, title, description, meetingDate, duration, location, organizerId]
    );
    return result.rows[0];
  }

  async getTasks(departmentId, status, assignedTo) {
    let query = `
      SELECT dt.*, d.name as department_name,
             assigned.first_name || ' ' || assigned.last_name as assigned_to_name,
             assigner.first_name || ' ' || assigner.last_name as assigned_by_name
      FROM department_tasks dt
      JOIN departments d ON dt.department_id = d.id
      LEFT JOIN users assigned ON dt.assigned_to = assigned.id
      LEFT JOIN users assigner ON dt.assigned_by = assigner.id
      WHERE dt.department_id = $1
    `;
    const params = [departmentId];

    if (status) {
      query += ` AND dt.status = $2`;
      params.push(status);
    }

    if (assignedTo) {
      query += ` AND dt.assigned_to = $${params.length + 1}`;
      params.push(assignedTo);
    }

    query += ' ORDER BY dt.created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createTask(departmentId, title, description, assignedTo, assignedBy, dueDate, priority) {
    const result = await this.pool.query(
      `INSERT INTO department_tasks (department_id, title, description, assigned_to, assigned_by, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [departmentId, title, description, assignedTo, assignedBy, dueDate, priority || 'normal']
    );
    return result.rows[0];
  }

  async updateTaskStatus(taskId, status, churchId = null) {
    const result = await this.pool.query(
      `UPDATE department_tasks
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2${churchId ? ' AND department_id IN (SELECT id FROM departments WHERE church_id = $3)' : ''}
       RETURNING *`,
      churchId ? [status, taskId, churchId] : [status, taskId]
    );
    return result.rows[0];
  }

  async getResources(departmentId) {
    const result = await this.pool.query(
      `SELECT dr.*, d.name as department_name, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM department_resources dr
       JOIN departments d ON dr.department_id = d.id
       LEFT JOIN users u ON dr.uploaded_by = u.id
       WHERE dr.department_id = $1
       ORDER BY dr.uploaded_at DESC`,
      [departmentId]
    );
    return result.rows;
  }

  async createResource(departmentId, name, description, type, url, filePath, uploadedBy, isPublic) {
    const result = await this.pool.query(
      `INSERT INTO department_resources (department_id, name, description, type, url, file_path, uploaded_by, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [departmentId, name, description, type, url, filePath, uploadedBy, isPublic || false]
    );
    return result.rows[0];
  }

  async setDepartmentPermission(departmentId, userId, permission, churchId = null) {
    // department_permissions has no church_id column — ownership gate via
    // EXISTS on the parent department instead of a stored tenant key.
    const result = await this.pool.query(
      `INSERT INTO department_permissions (department_id, user_id, permission)
       SELECT $1, $2, $3
       WHERE EXISTS (SELECT 1 FROM departments WHERE id = $1 AND church_id = $4)
       ON CONFLICT (department_id, user_id)
       DO UPDATE SET permission = $3
       RETURNING *`,
      [departmentId, userId, permission, churchId]
    );
    return result.rows[0];
  }

  async getDepartmentActivity(departmentId, limit) {
    const result = await this.pool.query(
      `SELECT da.*, u.first_name || ' ' || u.last_name as user_name
       FROM department_activities da
       LEFT JOIN users u ON da.user_id = u.id
       WHERE da.department_id = $1
       ORDER BY da.created_at DESC
       LIMIT $2`,
      [departmentId, limit]
    );
    return result.rows;
  }

  async logDepartmentActivity(departmentId, userId, action, description) {
    const result = await this.pool.query(
      `INSERT INTO department_activities (department_id, user_id, action, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [departmentId, userId, action, description]
    );
    return result.rows[0];
  }

  async updateDepartmentBranding(departmentId, logo, banner, primaryColor, secondaryColor, churchId = null) {
    const result = await this.pool.query(
      `UPDATE departments
       SET logo_url = COALESCE($1, logo_url),
           banner_url = COALESCE($2, banner_url),
           primary_color = COALESCE($3, primary_color),
           secondary_color = COALESCE($4, secondary_color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5${churchId ? ' AND church_id = $6' : ''}
       RETURNING *`,
      churchId ? [logo, banner, primaryColor, secondaryColor, departmentId, churchId]
               : [logo, banner, primaryColor, secondaryColor, departmentId]
    );
    return result.rows[0];
  }

  async getTasksByStatus(departmentId) {
    const result = await this.pool.query(
      `SELECT status, COUNT(*) as count
       FROM department_tasks
       WHERE department_id = $1
       GROUP BY status`,
      [departmentId]
    );
    return result.rows;
  }

  async getResourceCount(departmentId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM department_resources WHERE department_id = $1',
      [departmentId]
    );
    return parseInt(result.rows[0].count);
  }

  async getDepartmentSettings(departmentId) {
    const result = await this.pool.query(
      `SELECT * FROM department_settings WHERE department_id = $1`,
      [departmentId]
    );
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  }

  async updateDepartmentSettings(departmentId, settings) {
    for (const [key, value] of Object.entries(settings)) {
      await this.pool.query(
        `INSERT INTO department_settings (department_id, setting_key, setting_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (department_id, setting_key) 
         DO UPDATE SET setting_value = $3`,
        [departmentId, key, value]
      );
    }
  }
}

module.exports = new DepartmentsRepository();
