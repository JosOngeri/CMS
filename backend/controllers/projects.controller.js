const BaseController = require('./BaseController');
const ProjectsRepository = require('../repositories/ProjectsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Projects Controller
 * Handles project accounting and tracking
 */
class ProjectsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ProjectsController');
  }

  async getAllProjects(req, res) {
    try {
      const { status, project_type, department_id, is_active } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (project_type) filters.project_type = project_type;
      if (department_id) filters.department_id = department_id;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const projects = await ProjectsRepository.getAllWithDetails(filters);

      res.json({ success: true, data: projects });
    } catch (error) {
      this.logger.error('getAllProjects', error);
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
  }

  async getProjectById(req, res) {
    try {
      const { id } = req.params;

      const project = await ProjectsRepository.getWithDetails(id);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: project });
    } catch (error) {
      this.logger.error('getProjectById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
  }

  async createProject(req, res) {
    try {
      const {
        project_code, project_name, description, project_type,
        start_date, end_date, target_amount, priority,
        assigned_to, department_id, fund_id
      } = req.body;

      const code = project_code || `PRJ-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const project = await ProjectsRepository.createProject({
        project_code: code,
        project_name,
        description,
        project_type,
        start_date,
        end_date,
        target_amount,
        priority,
        assigned_to,
        department_id,
        fund_id,
        created_by: req.user.id
      });

      res.json({ success: true, data: project });
    } catch (error) {
      this.logger.error('createProject', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  }

  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const {
        project_name, description, project_type, start_date, end_date,
        target_amount, current_amount, status, priority,
        assigned_to, department_id, fund_id, is_active
      } = req.body;

      const project = await ProjectsRepository.updateProject(id, {
        project_name,
        description,
        project_type,
        start_date,
        end_date,
        target_amount,
        current_amount,
        status,
        priority,
        assigned_to,
        department_id,
        fund_id,
        is_active
      });

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: project });
    } catch (error) {
      this.logger.error('updateProject', error);
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  }

  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const project = await ProjectsRepository.delete(id);

      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      this.logger.error('deleteProject', error);
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  }

  async getProjectMilestones(req, res) {
    try {
      const { id } = req.params;
      const milestones = await ProjectsRepository.getProjectMilestones(id);
      res.json({ success: true, data: milestones });
    } catch (error) {
      this.logger.error('getProjectMilestones', error);
      res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
    }
  }

  async createMilestone(req, res) {
    try {
      const { id } = req.params;
      const { title, description, due_date, status } = req.body;
      const milestone = await ProjectsRepository.createMilestone(id, {
        title, description, due_date, status
      });
      res.status(201).json({ success: true, data: milestone });
    } catch (error) {
      this.logger.error('createMilestone', error);
      res.status(500).json({ success: false, error: 'Failed to create milestone' });
    }
  }

  async updateMilestone(req, res) {
    try {
      const { id, milestoneId } = req.params;
      const { title, description, due_date, status, completed_at } = req.body;
      const milestone = await ProjectsRepository.updateMilestone(milestoneId, {
        title, description, due_date, status, completed_at
      });
      res.json({ success: true, data: milestone });
    } catch (error) {
      this.logger.error('updateMilestone', error);
      res.status(500).json({ success: false, error: 'Failed to update milestone' });
    }
  }

  async deleteMilestone(req, res) {
    try {
      const { milestoneId } = req.params;
      await ProjectsRepository.deleteMilestone(milestoneId);
      res.json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
      this.logger.error('deleteMilestone', error);
      res.status(500).json({ success: false, error: 'Failed to delete milestone' });
    }
  }

  async getProjectContributions(req, res) {
    try {
      const { id } = req.params;
      const contributions = await ProjectsRepository.getProjectContributions(id);
      res.json({ success: true, data: contributions });
    } catch (error) {
      this.logger.error('getProjectContributions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch contributions' });
    }
  }

  async addContribution(req, res) {
    try {
      const { id } = req.params;
      const { amount, contributor_id, date, notes } = req.body;
      const contribution = await ProjectsRepository.addContribution(id, {
        amount, contributor_id, date, notes
      });
      res.status(201).json({ success: true, data: contribution });
    } catch (error) {
      this.logger.error('addContribution', error);
      res.status(500).json({ success: false, error: 'Failed to add contribution' });
    }
  }

  async getProjectAnalytics(req, res) {
    try {
      const { id } = req.params;
      const analytics = await ProjectsRepository.getProjectAnalytics(id);
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getProjectAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }

  async updateProjectStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const project = await ProjectsRepository.updateProjectStatus(id, status);
      res.json({ success: true, data: project });
    } catch (error) {
      this.logger.error('updateProjectStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  }
}

module.exports = new ProjectsController();
