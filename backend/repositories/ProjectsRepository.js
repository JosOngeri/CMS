const BaseRepository = require('./BaseRepository');

class ProjectsRepository extends BaseRepository {
  constructor() {
    super('projects');
  }

  async getAllWithDetails(filters = {}) {
    if (!filters.church_id) throw new Error('getAllWithDetails: filters.church_id is required');
    let query = `
      SELECT p.*,
             d.name as department_name,
             f.fund_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN funds f ON p.fund_id = f.id
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.church_id = $1
    `;
    const params = [filters.church_id];
    let paramCount = 1;

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

  async getWithDetails(id, churchId) {
    if (!churchId) throw new Error('getWithDetails: churchId is required');
    const query = `
      SELECT p.*,
             d.name as department_name,
             f.fund_name,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN funds f ON p.fund_id = f.id
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.id = $1 AND p.church_id = $2
    `;
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0];
  }

  async createProject(projectData) {
    const {
      project_code, project_name, description, project_type,
      start_date, end_date, target_amount, priority,
      assigned_to, department_id, fund_id, created_by, church_id
    } = projectData;

    const query = `
      INSERT INTO projects (project_code, project_name, description, project_type, start_date, end_date, target_amount, priority, assigned_to, department_id, fund_id, created_by, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      project_code, project_name, description, project_type,
      start_date, end_date, target_amount, priority,
      assigned_to, department_id, fund_id, created_by, church_id
    ]);
    return result.rows[0];
  }

  async updateProject(id, projectData, churchId) {
    if (!churchId) throw new Error('updateProject: churchId is required');
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
      WHERE id = $14 AND church_id = $15
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      project_name, description, project_type, start_date, end_date,
      target_amount, current_amount, status, priority,
      assigned_to, department_id, fund_id, is_active, id, churchId
    ]);
    return result.rows[0];
  }

  async delete(id, churchId) {
    if (!churchId) throw new Error('delete: churchId is required');
    const query = 'DELETE FROM projects WHERE id = $1 AND church_id = $2 RETURNING *';
    const result = await this.pool.query(query, [id, churchId]);
    return result.rows[0];
  }

  // Child tables (project_milestones, project_contributions) have church_id
  // but legacy rows may be NULL — scope through the parent project instead.
  async getProjectMilestones(projectId, churchId) {
    if (!churchId) throw new Error('getProjectMilestones: churchId is required');
    const query = `SELECT pm.* FROM project_milestones pm
      WHERE pm.project_id = $1
      AND EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id AND p.church_id = $2)
      ORDER BY pm.due_date ASC`;
    const result = await this.pool.query(query, [projectId, churchId]);
    return result.rows;
  }

  async getMilestoneById(milestoneId, projectId, churchId) {
    if (!churchId) throw new Error('getMilestoneById: churchId is required');
    const query = `SELECT pm.* FROM project_milestones pm
      WHERE pm.id = $1 AND pm.project_id = $2
      AND EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id AND p.church_id = $3)`;
    const result = await this.pool.query(query, [milestoneId, projectId, churchId]);
    return result.rows[0];
  }

  async createMilestone(projectId, milestoneData, churchId) {
    if (!churchId) throw new Error('createMilestone: churchId is required');
    const { title, description, due_date, status } = milestoneData;
    const query = `
      INSERT INTO project_milestones (project_id, title, description, due_date, status, church_id)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE EXISTS (SELECT 1 FROM projects p WHERE p.id = $1 AND p.church_id = $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [projectId, title, description, due_date, status || 'pending', churchId]);
    return result.rows[0];
  }

  async updateMilestone(milestoneId, projectId, milestoneData, churchId) {
    if (!churchId) throw new Error('updateMilestone: churchId is required');
    const { title, description, due_date, status, completed_at } = milestoneData;
    const query = `
      UPDATE project_milestones pm
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          status = COALESCE($4, status),
          completed_at = COALESCE($5, completed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE pm.id = $6 AND pm.project_id = $7
      AND EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id AND p.church_id = $8)
      RETURNING pm.*
    `;
    const result = await this.pool.query(query, [title, description, due_date, status, completed_at, milestoneId, projectId, churchId]);
    return result.rows[0];
  }

  async deleteMilestone(milestoneId, projectId, churchId) {
    if (!churchId) throw new Error('deleteMilestone: churchId is required');
    const query = `DELETE FROM project_milestones pm
      WHERE pm.id = $1 AND pm.project_id = $2
      AND EXISTS (SELECT 1 FROM projects p WHERE p.id = pm.project_id AND p.church_id = $3)`;
    await this.pool.query(query, [milestoneId, projectId, churchId]);
  }

  async getProjectContributions(projectId, churchId) {
    if (!churchId) throw new Error('getProjectContributions: churchId is required');
    const query = `
      SELECT pc.*, u.first_name || ' ' || u.last_name as contributor_name
      FROM project_contributions pc
      LEFT JOIN users u ON pc.contributor_id = u.id
      WHERE pc.project_id = $1
      AND EXISTS (SELECT 1 FROM projects p WHERE p.id = pc.project_id AND p.church_id = $2)
      ORDER BY pc.date DESC
    `;
    const result = await this.pool.query(query, [projectId, churchId]);
    return result.rows;
  }

  async addContribution(projectId, contributionData, churchId) {
    if (!churchId) throw new Error('addContribution: churchId is required');
    const { amount, contributor_id, date, notes } = contributionData;
    const query = `
      INSERT INTO project_contributions (project_id, amount, contributor_id, date, notes, church_id)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE EXISTS (SELECT 1 FROM projects p WHERE p.id = $1 AND p.church_id = $6)
      RETURNING *
    `;
    const result = await this.pool.query(query, [projectId, amount, contributor_id, date || new Date().toISOString(), notes, churchId]);
    return result.rows[0];
  }

  async getProjectAnalytics(projectId, churchId) {
    if (!churchId) throw new Error('getProjectAnalytics: churchId is required');
    // Pre-aggregated derived tables — joining contributions and milestones
    // directly would cross-product the rows and inflate SUM/COUNT.
    const query = `
      SELECT
        p.*,
        COALESCE(cont.total_contributions, 0) as total_contributions,
        COALESCE(cont.unique_contributors, 0) as unique_contributors,
        COALESCE(ms.total_milestones, 0) as total_milestones,
        COALESCE(ms.completed_milestones, 0) as completed_milestones,
        COALESCE(ms.pending_milestones, 0) as pending_milestones
      FROM projects p
      LEFT JOIN (
        SELECT project_id,
               SUM(amount) as total_contributions,
               COUNT(DISTINCT contributor_id) as unique_contributors
        FROM project_contributions
        GROUP BY project_id
      ) cont ON cont.project_id = p.id
      LEFT JOIN (
        SELECT project_id,
               COUNT(*) as total_milestones,
               COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones,
               COUNT(*) FILTER (WHERE status = 'pending') as pending_milestones
        FROM project_milestones
        GROUP BY project_id
      ) ms ON ms.project_id = p.id
      WHERE p.id = $1 AND p.church_id = $2
    `;
    const result = await this.pool.query(query, [projectId, churchId]);
    return result.rows[0];
  }

  async updateProjectStatus(projectId, status, churchId) {
    if (!churchId) throw new Error('updateProjectStatus: churchId is required');
    const query = `
      UPDATE projects
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND church_id = $3
      RETURNING *
    `;
    const result = await this.pool.query(query, [status, projectId, churchId]);
    return result.rows[0];
  }
}

module.exports = new ProjectsRepository();
