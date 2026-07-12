const BaseController = require('./BaseController');
const ProjectsRepository = require('../repositories/ProjectsRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const ProjectService = require('../services/ProjectService');
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

      return ResponseHandler.success(res, { projects });
    } catch (error) {
      this.logger.error('getAllProjects', error);
      return ResponseHandler.error(res, 'Failed to fetch projects');
    }
  }

  async getProjectById(req, res) {
    try {
      const { id } = req.params;

      const project = await ProjectsRepository.getWithDetails(id);

      if (!project) {
        return ResponseHandler.notFound(res, 'Project not found');
      }

      // Get additional data for enhanced response
      const milestones = await ProjectsRepository.getProjectMilestones(id);
      const contributions = await ProjectsRepository.getProjectContributions(id);
      
      // Use ProjectService for calculated values
      const projectSummary = ProjectService.getProjectSummary(project, milestones, contributions);

      return ResponseHandler.success(res, { project: projectSummary });
    } catch (error) {
      this.logger.error('getProjectById', error);
      return ResponseHandler.error(res, 'Failed to fetch project');
    }
  }

  async createProject(req, res) {
    try {
      const {
        project_code, project_name, description, project_type,
        start_date, end_date, target_amount, priority,
        assigned_to, department_id, fund_id
      } = req.body;

      // Validate project data
      const validation = ProjectService.validateProjectData({
        project_name, project_type, start_date, end_date, target_amount, priority
      });
      if (!validation.valid) {
        return ResponseHandler.validationError(res, validation.errors.map(e => ({
          field: 'general',
          message: e
        })));
      }

      // Generate project code using ProjectService
      const code = project_code || ProjectService.generateProjectCode(project_type);

      // Set recommended priority if not provided
      const recommendedPriority = priority || ProjectService.getRecommendedPriority({
        project_name, project_type, start_date, end_date, target_amount
      });

      const project = await ProjectsRepository.createProject({
        project_code: code,
        project_name,
        description,
        project_type,
        start_date,
        end_date,
        target_amount,
        priority: recommendedPriority,
        assigned_to,
        department_id,
        fund_id,
        created_by: req.user.id
      });

      return ResponseHandler.success(res, { project }, 'Project created successfully', 201);
    } catch (error) {
      this.logger.error('createProject', error);
      return ResponseHandler.error(res, 'Failed to create project');
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

      // Validate project data
      const validation = ProjectService.validateProjectData({
        project_name, project_type, start_date, end_date, target_amount, current_amount, priority
      });
      if (!validation.valid) {
        return ResponseHandler.validationError(res, validation.errors.map(e => ({
          field: 'general',
          message: e
        })));
      }

      // Validate status transition if changing status
      const currentProject = await ProjectsRepository.getWithDetails(id);
      if (currentProject && status && currentProject.status !== status) {
        const isValidTransition = ProjectService.isValidStatusTransition(currentProject.status, status);
        if (!isValidTransition) {
          return ResponseHandler.error(res, `Cannot transition from ${currentProject.status} to ${status}`, 400);
        }
      }

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
        return ResponseHandler.notFound(res, 'Project not found');
      }

      return ResponseHandler.success(res, { project }, 'Project updated successfully');
    } catch (error) {
      this.logger.error('updateProject', error);
      return ResponseHandler.error(res, 'Failed to update project');
    }
  }

  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const project = await ProjectsRepository.delete(id);

      if (!project) {
        return ResponseHandler.notFound(res, 'Project not found');
      }

      return ResponseHandler.success(res, null, 'Project deleted successfully');
    } catch (error) {
      this.logger.error('deleteProject', error);
      return ResponseHandler.error(res, 'Failed to delete project');
    }
  }

  async getProjectMilestones(req, res) {
    try {
      const { id } = req.params;
      const milestones = await ProjectsRepository.getProjectMilestones(id);
      
      // Add progress calculation using ProjectService
      const progress = ProjectService.calculateProgress(milestones);
      
      return ResponseHandler.success(res, { 
        milestones,
        progress
      });
    } catch (error) {
      this.logger.error('getProjectMilestones', error);
      return ResponseHandler.error(res, 'Failed to fetch milestones');
    }
  }

  async createMilestone(req, res) {
    try {
      const { id } = req.params;
      const { title, description, due_date, status } = req.body;

      // Validate milestone status
      if (status && status !== 'pending') {
        const validation = ProjectService.validateMilestoneTransition('pending', status, due_date);
        if (!validation.valid) {
          return ResponseHandler.error(res, validation.reason, 400);
        }
      }

      const milestone = await ProjectsRepository.createMilestone(id, {
        title, description, due_date, status: status || 'pending'
      });

      return ResponseHandler.success(res, { milestone }, 'Milestone created successfully', 201);
    } catch (error) {
      this.logger.error('createMilestone', error);
      return ResponseHandler.error(res, 'Failed to create milestone');
    }
  }

  async updateMilestone(req, res) {
    try {
      const { id, milestoneId } = req.params;
      const { title, description, due_date, status, completed_at } = req.body;

      // Get current milestone for validation
      const currentMilestone = await ProjectsRepository.getMilestoneById(milestoneId);
      if (currentMilestone && status && currentMilestone.status !== status) {
        const validation = ProjectService.validateMilestoneTransition(
          currentMilestone.status, 
          status, 
          currentMilestone.due_date
        );
        if (!validation.valid) {
          return ResponseHandler.error(res, validation.reason, 400);
        }
        if (validation.warning) {
          this.logger.warn('Milestone warning:', validation.warning);
        }
      }

      const milestone = await ProjectsRepository.updateMilestone(milestoneId, {
        title, description, due_date, status, completed_at
      });

      return ResponseHandler.success(res, { milestone }, 'Milestone updated successfully');
    } catch (error) {
      this.logger.error('updateMilestone', error);
      return ResponseHandler.error(res, 'Failed to update milestone');
    }
  }

  async deleteMilestone(req, res) {
    try {
      const { milestoneId } = req.params;
      await ProjectsRepository.deleteMilestone(milestoneId);

      return ResponseHandler.success(res, null, 'Milestone deleted successfully');
    } catch (error) {
      this.logger.error('deleteMilestone', error);
      return ResponseHandler.error(res, 'Failed to delete milestone');
    }
  }

  async getProjectContributions(req, res) {
    try {
      const { id } = req.params;
      const contributions = await ProjectsRepository.getProjectContributions(id);

      return ResponseHandler.success(res, { contributions });
    } catch (error) {
      this.logger.error('getProjectContributions', error);
      return ResponseHandler.error(res, 'Failed to fetch contributions');
    }
  }

  async addContribution(req, res) {
    try {
      const { id } = req.params;
      const { amount, contributor_id, date, notes } = req.body;
      const contribution = await ProjectsRepository.addContribution(id, {
        amount, contributor_id, date, notes
      });

      return ResponseHandler.success(res, { contribution }, 'Contribution added successfully', 201);
    } catch (error) {
      this.logger.error('addContribution', error);
      return ResponseHandler.error(res, 'Failed to add contribution');
    }
  }

  async getProjectAnalytics(req, res) {
    try {
      const { id } = req.params;

      const project = await ProjectsRepository.getWithDetails(id);
      if (!project) {
        return ResponseHandler.notFound(res, 'Project not found');
      }

      const milestones = await ProjectsRepository.getProjectMilestones(id);
      const contributions = await ProjectsRepository.getProjectContributions(id);

      // Use ProjectService for comprehensive analytics
      const analytics = {
        ...await ProjectsRepository.getProjectAnalytics(id),
        progress: ProjectService.calculateProgress(milestones),
        financial: ProjectService.calculateFinancialStatus(
          parseFloat(project.target_amount || 0),
          parseFloat(project.current_amount || 0)
        ),
        health_score: ProjectService.calculateHealthScore(
          ProjectService.calculateProgress(milestones),
          ProjectService.calculateFinancialStatus(
            parseFloat(project.target_amount || 0),
            parseFloat(project.current_amount || 0)
          )
        )
      };

      return ResponseHandler.success(res, { analytics });
    } catch (error) {
      this.logger.error('getProjectAnalytics', error);
      return ResponseHandler.error(res, 'Failed to fetch analytics');
    }
  }

  async updateProjectStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status transition
      const currentProject = await ProjectsRepository.getWithDetails(id);
      if (currentProject && currentProject.status !== status) {
        const isValidTransition = ProjectService.isValidStatusTransition(currentProject.status, status);
        if (!isValidTransition) {
          return ResponseHandler.error(res, `Cannot transition from ${currentProject.status} to ${status}`, 400);
        }
      }

      const project = await ProjectsRepository.updateProjectStatus(id, status);

      return ResponseHandler.success(res, { project }, 'Project status updated successfully');
    } catch (error) {
      this.logger.error('updateProjectStatus', error);
      return ResponseHandler.error(res, 'Failed to update status');
    }
  }
}

module.exports = new ProjectsController();
