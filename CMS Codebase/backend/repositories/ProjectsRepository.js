const BaseRepository = require('./BaseRepository');

class ProjectsRepository extends BaseRepository {
  constructor() {
    super('projects');
  }

  async getAllWithDetails(filters = {}) {
    let query = `
      SELECT p.*,
             d.name as department_name,
             f.fund_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN funds f ON p.fund_id = f.id
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.project_type) {
      paramCount++;
      query += ` AND p.project_type = $${paramCount}`;
      params.push(filters.project_type);
    }

    if (filters.department_id) {
      paramCount++;
      query += ` AND p.department_id = $${paramCount}`;
      params.push(filters.department_id);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND p.is_active = $${paramCount}`;
      params.push(filters.is_active === 'true');
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithDetails(id) {
    const query = `
      SELECT p.*,
             d.name as department_name,
             f.fund_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN funds f ON p.fund_id = f.id
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async createProject(projectData) {
    const {
      project_code, project_name, description, project_type,
      start_date, end_date, target_amount, priority,
      assigned_to, department_id, fund_id, created_by
    } = projectData;

    const query = `
      INSERT INTO projects (project_code, project_name, description, project_type, start_date, end_date, target_amount, priority, assigned_to, department_id, fund_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      project_code, project_name, description, project_type,
      start_date, end_date, target_amount, priority,
      assigned_to, department_id, fund_id, created_by
    ]);
    return result.rows[0];
  }

  async updateProject(id, projectData) {
    const {
      project_name, description, project_type, start_date, end_date,
      target_amount, current_amount, status, priority,
      assigned_to, department_id, fund_id, is_active
    } = projectData;

    const query = `
      UPDATE projects
      SET project_name = COALESCE($1, project_name),
          description = COALESCE($2, description),
          project_type = COALESCE($3, project_type),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          target_amount = COALESCE($6, target_amount),
          current_amount = COALESCE($7, current_amount),
          status = COALESCE($8, status),
          priority = COALESCE($9, priority),
          assigned_to = COALESCE($10, assigned_to),
          department_id = COALESCE($11, department_id),
          fund_id = COALESCE($12, fund_id),
          is_active = COALESCE($13, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      project_name, description, project_type, start_date, end_date,
      target_amount, current_amount, status, priority,
      assigned_to, department_id, fund_id, is_active, id
    ]);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getProjectMilestones(projectId) {
    const query = 'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date ASC';
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  async getMilestoneById(milestoneId) {
    const query = 'SELECT * FROM project_milestones WHERE id = $1';
    const result = await this.pool.query(query, [milestoneId]);
    return result.rows[0];
  }

  async createMilestone(projectId, milestoneData) {
    const { title, description, due_date, status } = milestoneData;
    const query = `
      INSERT INTO project_milestones (project_id, title, description, due_date, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [projectId, title, description, due_date, status || 'pending']);
    return result.rows[0];
  }

  async updateMilestone(milestoneId, milestoneData) {
    const { title, description, due_date, status, completed_at } = milestoneData;
    const query = `
      UPDATE project_milestones
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          status = COALESCE($4, status),
          completed_at = COALESCE($5, completed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const result = await this.pool.query(query, [title, description, due_date, status, completed_at, milestoneId]);
    return result.rows[0];
  }

  async deleteMilestone(milestoneId) {
    const query = 'DELETE FROM project_milestones WHERE id = $1';
    await this.pool.query(query, [milestoneId]);
  }

  async getProjectContributions(projectId) {
    const query = `
      SELECT pc.*, u.first_name || ' ' || u.last_name as contributor_name
      FROM project_contributions pc
      LEFT JOIN users u ON pc.contributor_id = u.id
      WHERE pc.project_id = $1
      ORDER BY pc.date DESC
    `;
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  async addContribution(projectId, contributionData) {
    const { amount, contributor_id, date, notes } = contributionData;
    const query = `
      INSERT INTO project_contributions (project_id, amount, contributor_id, date, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [projectId, amount, contributor_id, date || new Date().toISOString(), notes]);
    return result.rows[0];
  }

  async getProjectAnalytics(projectId) {
    const query = `
      SELECT
        p.*,
        COALESCE(SUM(pc.amount), 0) as total_contributions,
        COUNT(DISTINCT pc.contributor_id) as unique_contributors,
        COUNT(pm.id) as total_milestones,
        COUNT(CASE WHEN pm.status = 'completed' THEN 1 END) as completed_milestones,
        COUNT(CASE WHEN pm.status = 'pending' THEN 1 END) as pending_milestones
      FROM projects p
      LEFT JOIN project_contributions pc ON p.id = pc.project_id
      LEFT JOIN project_milestones pm ON p.id = pm.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    const result = await this.pool.query(query, [projectId]);
    return result.rows[0];
  }

  async updateProjectStatus(projectId, status) {
    const query = `
      UPDATE projects
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, projectId]);
    return result.rows[0];
  }
}

module.exports = new ProjectsRepository();
