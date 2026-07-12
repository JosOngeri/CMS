const BaseController = require('./BaseController');
const DepartmentsRepository = require('../repositories/DepartmentsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Departments Controller
 * Handles departments, members, meetings, tasks, and resources
 */
class DepartmentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DepartmentsController');
  }

  /**
   * Get all departments with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.isActive] - Filter by active status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllDepartments(req, res) {
    try {
      const { category, isActive } = req.query;
      const churchId = req.user.church_id;

      const filters = {};
      if (category) filters.category = category;
      if (isActive !== undefined) filters.is_active = isActive === 'true';

      const departments = await DepartmentsRepository.findAll(filters, churchId);

      res.json({ success: true, data: departments });
    } catch (error) {
      this.logger.error('getAllDepartments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
  }

  /**
   * Get department by ID with members
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentById(req, res) {
    try {
      const { id } = req.params;

      const department = await DepartmentsRepository.getDepartmentById(id);

      if (!department) {
        return res.status(404).json({ success: false, error: 'Department not found' });
      }

      // Get department members
      const members = await DepartmentsRepository.getDepartmentMembers(id);

      res.json({
        success: true,
        data: { ...department, members }
      });
    } catch (error) {
      this.logger.error('getDepartmentById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department' });
    }
  }

  /**
   * Create a new department
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Department name
   * @param {string} [req.body.description] - Department description
   * @param {string} [req.body.category] - Department category
   * @param {string} [req.body.leaderName] - Leader name
   * @param {string} [req.body.leaderContact] - Leader contact
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createDepartment(req, res) {
    try {
      const { name, description, category, leaderName, leaderContact } = req.body;
      const churchId = req.user.church_id;
      const churchSlug = req.user.church_slug;

      const department = await DepartmentsRepository.createDepartment(name, description, category, leaderName, leaderContact, churchId, churchSlug);

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      this.logger.error('createDepartment', error);
      res.status(500).json({ success: false, error: 'Failed to create department' });
    }
  }

  /**
   * Update a department
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Department ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.name] - Department name
   * @param {string} [req.body.description] - Department description
   * @param {string} [req.body.category] - Department category
   * @param {string} [req.body.leaderName] - Leader name
   * @param {string} [req.body.leaderContact] - Leader contact
   * @param {boolean} [req.body.isActive] - Active status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name, description, category, leaderName, leaderContact, isActive } = req.body;

      const department = await DepartmentsRepository.updateDepartment(id, name, description, category, leaderName, leaderContact, isActive);

      if (!department) {
        return res.status(404).json({ success: false, error: 'Department not found' });
      }

      res.json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      this.logger.error('updateDepartment', error);
      res.status(500).json({ success: false, error: 'Failed to update department' });
    }
  }

  /**
   * Delete a department
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      await DepartmentsRepository.deleteDepartment(id);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      this.logger.error('deleteDepartment', error);
      res.status(500).json({ success: false, error: 'Failed to delete department' });
    }
  }

  /**
   * Add a member to a department
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} [req.body.role] - Member role
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addMember(req, res) {
    try {
      const { departmentId } = req.params;
      const { userId, role } = req.body;

      const member = await DepartmentsRepository.addMember(userId, departmentId, role);

      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: member
      });
    } catch (error) {
      this.logger.error('addMember', error);
      res.status(500).json({ success: false, error: 'Failed to add member' });
    }
  }

  /**
   * Remove a member from a department
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeMember(req, res) {
    try {
      const { departmentId, userId } = req.params;

      await DepartmentsRepository.removeMember(departmentId, userId);

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      this.logger.error('removeMember', error);
      res.status(500).json({ success: false, error: 'Failed to remove member' });
    }
  }

  /**
   * Get department meetings
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMeetings(req, res) {
    try {
      const { departmentId } = req.params;
      const { status } = req.query;

      const meetings = await DepartmentsRepository.getMeetings(departmentId, status);
      res.json({ success: true, data: meetings });
    } catch (error) {
      this.logger.error('getMeetings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch meetings' });
    }
  }

  /**
   * Create a department meeting
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Meeting title
   * @param {string} [req.body.description] - Meeting description
   * @param {string} req.body.meetingDate - Meeting date
   * @param {string} [req.body.duration] - Meeting duration
   * @param {string} [req.body.location] - Meeting location
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createMeeting(req, res) {
    try {
      const { departmentId } = req.params;
      const { title, description, meetingDate, duration, location } = req.body;
      const userId = req.user.id;

      const meeting = await DepartmentsRepository.createMeeting(departmentId, title, description, meetingDate, duration, location, userId);

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: meeting
      });
    } catch (error) {
      this.logger.error('createMeeting', error);
      res.status(500).json({ success: false, error: 'Failed to create meeting' });
    }
  }

  /**
   * Get department tasks
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.assignedTo] - Filter by assigned user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTasks(req, res) {
    try {
      const { departmentId } = req.params;
      const { status, assignedTo } = req.query;

      const tasks = await DepartmentsRepository.getTasks(departmentId, status, assignedTo);
      res.json({ success: true, data: tasks });
    } catch (error) {
      this.logger.error('getTasks', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
  }

  /**
   * Create a department task
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Task title
   * @param {string} [req.body.description] - Task description
   * @param {string} req.body.assignedTo - Assigned user ID
   * @param {string} [req.body.dueDate] - Due date
   * @param {string} [req.body.priority] - Task priority
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createTask(req, res) {
    try {
      const { departmentId } = req.params;
      const { title, description, assignedTo, dueDate, priority } = req.body;
      const userId = req.user.id;

      const task = await DepartmentsRepository.createTask(departmentId, title, description, assignedTo, userId, dueDate, priority);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      this.logger.error('createTask', error);
      res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  }

  /**
   * Update task status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.taskId - Task ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status } = req.body;

      const task = await DepartmentsRepository.updateTaskStatus(taskId, status);

      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: task
      });
    } catch (error) {
      this.logger.error('updateTaskStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update task status' });
    }
  }

  /**
   * Get department resources
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getResources(req, res) {
    try {
      const { departmentId } = req.params;

      const resources = await DepartmentsRepository.getResources(departmentId);
      res.json({ success: true, data: resources });
    } catch (error) {
      this.logger.error('getResources', error);
      res.status(500).json({ success: false, error: 'Failed to fetch resources' });
    }
  }

  /**
   * Create a department resource
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Resource name
   * @param {string} [req.body.description] - Resource description
   * @param {string} req.body.type - Resource type
   * @param {string} [req.body.url] - Resource URL
   * @param {string} [req.body.filePath] - File path
   * @param {boolean} [req.body.isPublic] - Public visibility
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createResource(req, res) {
    try {
      const { departmentId } = req.params;
      const { name, description, type, url, filePath, isPublic } = req.body;
      const userId = req.user.id;

      const resource = await DepartmentsRepository.createResource(departmentId, name, description, type, url, filePath, userId, isPublic);

      res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: resource
      });
    } catch (error) {
      this.logger.error('createResource', error);
      res.status(500).json({ success: false, error: 'Failed to create resource' });
    }
  }

  /**
   * Get department permissions
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentPermissions(req, res) {
    try {
      const { departmentId } = req.params;
      const churchId = req.user.church_id;

      const permissions = await DepartmentsRepository.getDepartmentPermissions(departmentId, churchId);

      res.json({ success: true, data: permissions });
    } catch (error) {
      this.logger.error('getDepartmentPermissions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department permissions' });
    }
  }

  /**
   * Set department permission
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.userId - User ID
   * @param {string} req.body.permission - Permission type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setDepartmentPermission(req, res) {
    try {
      const { departmentId } = req.params;
      const { userId, permission } = req.body;

      const permissionResult = await DepartmentsRepository.setDepartmentPermission(departmentId, userId, permission);

      res.json({ success: true, data: permissionResult });
    } catch (error) {
      this.logger.error('setDepartmentPermission', error);
      res.status(500).json({ success: false, error: 'Failed to set department permission' });
    }
  }

  /**
   * Get department activity feed
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.limit] - Limit results
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentActivity(req, res) {
    try {
      const { departmentId } = req.params;
      const { limit = 50 } = req.query;

      const activities = await DepartmentsRepository.getDepartmentActivity(departmentId, limit);
      res.json({ success: true, data: activities });
    } catch (error) {
      this.logger.error('getDepartmentActivity', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department activity' });
    }
  }

  /**
   * Log department activity
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.action - Action performed
   * @param {string} [req.body.description] - Activity description
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async logDepartmentActivity(req, res) {
    try {
      const { departmentId } = req.params;
      const { action, description } = req.body;
      const userId = req.user.id;

      const activity = await DepartmentsRepository.logDepartmentActivity(departmentId, userId, action, description);

      res.json({ success: true, data: activity });
    } catch (error) {
      this.logger.error('logDepartmentActivity', error);
      res.status(500).json({ success: false, error: 'Failed to log department activity' });
    }
  }

  /**
   * Get department branding
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentBranding(req, res) {
    try {
      const { departmentId } = req.params;

      const department = await DepartmentsRepository.getDepartmentById(departmentId);

      if (!department) {
        return res.status(404).json({ success: false, error: 'Department not found' });
      }

      res.json({ 
        success: true, 
        data: {
          logo: department.logo,
          banner: department.banner,
          primary_color: department.primary_color,
          secondary_color: department.secondary_color,
          description: department.description
        }
      });
    } catch (error) {
      this.logger.error('getDepartmentBranding', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department branding' });
    }
  }

  /**
   * Update department branding
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.logo] - Logo URL
   * @param {string} [req.body.banner] - Banner URL
   * @param {string} [req.body.primaryColor] - Primary color
   * @param {string} [req.body.secondaryColor] - Secondary color
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateDepartmentBranding(req, res) {
    try {
      const { departmentId } = req.params;
      const { logo, banner, primaryColor, secondaryColor } = req.body;

      const department = await DepartmentsRepository.updateDepartmentBranding(departmentId, logo, banner, primaryColor, secondaryColor);

      if (!department) {
        return res.status(404).json({ success: false, error: 'Department not found' });
      }

      res.json({ success: true, data: department });
    } catch (error) {
      this.logger.error('updateDepartmentBranding', error);
      res.status(500).json({ success: false, error: 'Failed to update department branding' });
    }
  }

  /**
   * Get department budget tracking
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.year] - Fiscal year
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentBudget(req, res) {
    try {
      const { departmentId } = req.params;
      const churchId = req.user.church_id;

      const budget = await DepartmentsRepository.getDepartmentBudget(departmentId, churchId);

      res.json({ success: true, data: budget });
    } catch (error) {
      this.logger.error('getDepartmentBudget', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department budget' });
    }
  }

  /**
   * Get department statistics
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentStatistics(req, res) {
    try {
      const { departmentId } = req.params;
      const churchId = req.user.church_id;

      const statistics = await DepartmentsRepository.getDepartmentStatistics(departmentId, churchId);

      // Get task count by status
      const tasksByStatus = await DepartmentsRepository.getTasksByStatus(departmentId);

      // Get resource count
      const resourceCount = await DepartmentsRepository.getResourceCount(departmentId);

      res.json({
        success: true,
        data: {
          members: parseInt(statistics.total_members || 0),
          tasks_by_status: tasksByStatus,
          recent_meetings: parseInt(statistics.recent_meetings || 0),
          resources: resourceCount
        }
      });
    } catch (error) {
      this.logger.error('getDepartmentStatistics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department statistics' });
    }
  }

  /**
   * Get department settings
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentSettings(req, res) {
    try {
      const { departmentId } = req.params;

      const settings = await DepartmentsRepository.getDepartmentSettings(departmentId);
      res.json({ success: true, data: settings });
    } catch (error) {
      this.logger.error('getDepartmentSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department settings' });
    }
  }

  /**
   * Update department settings
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.departmentId - Department ID
   * @param {Object} req.body - Request body
   * @param {Object} req.body.settings - Settings object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateDepartmentSettings(req, res) {
    try {
      const { departmentId } = req.params;
      const { settings } = req.body;

      await DepartmentsRepository.updateDepartmentSettings(departmentId, settings);

      res.json({ success: true, message: 'Department settings updated successfully' });
    } catch (error) {
      this.logger.error('updateDepartmentSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update department settings' });
    }
  }
}

module.exports = new DepartmentsController();