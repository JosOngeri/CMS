const DepartmentRepository = require('../repositories/DepartmentRepository');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/departments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dept-' + req.params.departmentId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
  }
});

/**
 * Department Controller
 * Handles department management, membership, communications, and file uploads
 */
class DepartmentController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('DepartmentController');
    this.upload = upload;
  }

  /**
   * Get all departments for current user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserDepartments(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const departments = await DepartmentRepository.getUserDepartments(userId, churchId);

      res.json({
        success: true,
        departments: departments
      });
    } catch (error) {
      this.logger.error('getUserDepartments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
  }

  /**
   * Get global department overview (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.category] - Filter by category
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGlobalDepartmentOverview(req, res) {
    try {
      const { category } = req.query;
      const churchId = req.user.church_id;

      const departments = await DepartmentRepository.getGlobalOverview({ category }, churchId);
      const recentActivity = await DepartmentRepository.getRecentActivity(churchId);
      const stats = await DepartmentRepository.getGlobalStats(churchId);

      res.json({
        success: true,
        data: {
          departments,
          recentActivity,
          stats: stats || {}
        }
      });
      
    } catch (error) {
      this.logger.error('getGlobalDepartmentOverview', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch global department overview',
        details: error.message
      });
    }
  }

  // Get department dashboard with metrics
  async getDepartmentDashboard(req, res) {
    try {
      const departmentId = req.departmentId || req.params.departmentId;
      const userId = req.user.id;
      const userRoles = req.user.roles || [];

      // Check if user is an admin (Super Admin, Pastor, First Elder)
      const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

      const departmentInfo = await DepartmentRepository.findDepartmentByIdWithLeader(departmentId);

      if (!departmentInfo) {
        return res.status(404).json({
          success: false,
          error: 'Department not found'
        });
      }

      const departmentName = departmentInfo?.name;
      const departmentCategory = departmentInfo?.category;
      const departmentSlug = departmentInfo?.slug;
      const departmentLogoUrl = departmentInfo?.logo_url;
      const departmentBannerUrl = departmentInfo?.banner_url;
      const departmentLogoColor = departmentInfo?.logo_color;
      const departmentBannerColor = departmentInfo?.banner_color;

      let userRole = 'Guest';
      if (!isAdmin) {
        const accessCheck = await DepartmentRepository.findMemberRole(departmentId, userId);

        if (!accessCheck) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this department. Join the department to access its dashboard.'
          });
        }

        userRole = accessCheck.role || 'Member';
      } else {
        userRole = 'Admin';
      }

      let metrics = { total_members: 0, communications_this_month: 0, meetings_this_month: 0, pending_tasks: 0, reports_this_month: 0, resources_added_this_month: 0 };
      try {
        const memberCount = await DepartmentRepository.getMemberCount(departmentId);
        this.logger.debug('getDepartmentMetrics', { departmentId, memberCount });

        metrics = await DepartmentRepository.getDepartmentMetrics(departmentId);
        this.logger.debug('getDepartmentMetrics', { departmentId, metrics });
      } catch (error) {
        this.logger.error('getDepartmentMetrics', error);
      }

      let recentActivities = [];
      try {
        recentActivities = await DepartmentRepository.getRecentActivities(departmentId);
      } catch (error) {
        this.logger.error('getRecentActivities', error);
      }

      let upcomingMeetings = [];
      try {
        upcomingMeetings = await DepartmentRepository.getUpcomingMeetings(departmentId);
      } catch (error) {
        this.logger.error('getUpcomingMeetings', error);
      }

      let pendingTasks = [];
      try {
        pendingTasks = await DepartmentRepository.getPendingTasks(departmentId);
      } catch (error) {
        this.logger.error('getPendingTasks', error);
      }
      
      const dashboard = {
        department: {
          id: departmentId,
          name: departmentName,
          category: departmentCategory,
          slug: departmentSlug,
          logo_url: departmentLogoUrl,
          banner_url: departmentBannerUrl,
          logo_color: departmentLogoColor,
          banner_color: departmentBannerColor,
          userRole: userRole
        },
        metrics: metrics,
        recentActivities: recentActivities,
        upcomingMeetings: upcomingMeetings,
        pendingTasks: pendingTasks
      };
      
      res.json({
        success: true,
        data: dashboard
      });
      
    } catch (error) {
      this.logger.error('getDepartmentDashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch department dashboard',
        details: error.message
      });
    }
  }

  // Create department communication
  async createCommunication(req, res) {
    try {
      const { departmentId } = req.params;
      const { title, message, type, priority, expiresAt } = req.body;
      const senderId = req.user.id;

      const accessCheck = await DepartmentRepository.findMemberRole(departmentId, senderId);

      if (!accessCheck) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }

      const communication = await DepartmentRepository.createCommunication({
        departmentId,
        title,
        message,
        type,
        priority: priority || 'normal',
        senderId,
        expiresAt
      });

      await this.notifyDepartmentMembers(departmentId, 'communication', communication || {});

      res.json({
        success: true,
        data: communication || null,
        message: 'Communication created successfully'
      });
      
    } catch (error) {
      this.logger.error('createCommunication', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create communication',
        details: error.message
      });
    }
  }

  // Get department communications
  async getCommunications(req, res) {
    try {
      const { departmentId } = req.params;
      const { limit = 20 } = req.query;
      const userId = req.user.id;

      const accessCheck = await DepartmentRepository.findMemberRole(departmentId, userId);

      if (!accessCheck) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }

      const communications = await DepartmentRepository.getCommunications(departmentId, limit);

      res.json({
        success: true,
        communications: communications
      });
    } catch (error) {
      this.logger.error('getCommunications', error);
      res.status(500).json({ success: false, error: 'Failed to fetch communications' });
    }
  }

  // Create department meeting
  async createMeeting(req, res) {
    try {
      const { departmentId } = req.params;
      const { title, description, meetingDate, duration, location } = req.body;
      const organizerId = req.user.id;

      const accessCheck = await DepartmentRepository.findMemberRole(departmentId, organizerId);

      if (!accessCheck) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }

      const meeting = await DepartmentRepository.createMeeting({
        departmentId,
        title,
        description,
        meetingDate,
        duration,
        location,
        organizerId
      });

      await DepartmentRepository.addMeetingAttendees(meeting?.id, departmentId);

      res.json({
        success: true,
        data: meeting || null,
        message: 'Meeting created successfully'
      });
      
    } catch (error) {
      this.logger.error('createMeeting', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create meeting',
        details: error.message
      });
    }
  }

  // Get all available components
  async getAllComponents(req, res) {
    try {
      const components = await DepartmentRepository.getAllComponents();

      res.json({
        success: true,
        data: components
      });
      
    } catch (error) {
      this.logger.error('getAllComponents', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch components',
        details: error.message
      });
    }
  }

  // Get components allocated to a department
  async getDepartmentComponents(req, res) {
    try {
      const { departmentId } = req.params;

      const components = await DepartmentRepository.getDepartmentComponents(departmentId);

      res.json({
        success: true,
        data: components
      });
      
    } catch (error) {
      this.logger.error('getDepartmentComponents', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch department components',
        details: error.message
      });
    }
  }

  // Allocate component to department
  async allocateComponent(req, res) {
    try {
      const { departmentId } = req.params;
      const { componentId } = req.body;
      const grantedBy = req.user.id;
      
      // Check if user has permission (admin or department head)
      const hasAdminRole = (req.user.roles || []).some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );
      
      if (!hasAdminRole) {
        const headId = await DepartmentRepository.findDepartmentHeadId(departmentId);

        if (!headId || headId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }
      }

      const allocation = await DepartmentRepository.allocateComponent(componentId, departmentId, grantedBy);

      res.json({
        success: true,
        data: allocation,
        message: 'Component allocated successfully'
      });
      
    } catch (error) {
      this.logger.error('allocateComponent', error);
      res.status(500).json({
        success: false,
        error: 'Failed to allocate component',
        details: error.message
      });
    }
  }

  // Remove component allocation from department
  async removeComponentAllocation(req, res) {
    try {
      const { departmentId, componentId } = req.params;
      
      // Check if user has permission (admin or department head)
      const hasAdminRole = (req.user.roles || []).some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );
      
      if (!hasAdminRole) {
        const headId = await DepartmentRepository.findDepartmentHeadId(departmentId);

        if (!headId || headId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }
      }

      await DepartmentRepository.removeComponentAllocation(componentId, departmentId);

      res.json({
        success: true,
        message: 'Component allocation removed successfully'
      });
      
    } catch (error) {
      this.logger.error('removeComponentAllocation', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove component allocation',
        details: error.message
      });
    }
  }

  // Grant admin access to user for department
  async grantDepartmentAdmin(req, res) {
    try {
      const { departmentId } = req.params;
      const { userId } = req.body;
      const grantedBy = req.user.id;
      
      // Check if user is department head or admin
      const hasAdminRole = (req.user.roles || []).some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );
      
      if (!hasAdminRole) {
        const headId = await DepartmentRepository.findDepartmentHeadId(departmentId);

        if (!headId || headId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Only department heads or admins can grant admin access'
          });
        }
      }

      const memberCheck = await DepartmentRepository.findMemberRole(departmentId, userId);

      if (!memberCheck) {
        return res.status(400).json({
          success: false,
          error: 'User must be a member of the department first'
        });
      }

      await DepartmentRepository.updateMemberRole(departmentId, userId, 'Admin');

      res.json({
        success: true,
        message: 'Admin access granted successfully'
      });
      
    } catch (error) {
      this.logger.error('grantDepartmentAdmin', error);
      res.status(500).json({
        success: false,
        error: 'Failed to grant admin access',
        details: error.message
      });
    }
  }

  // Revoke admin access from user for department
  async revokeDepartmentAdmin(req, res) {
    try {
      const { departmentId, userId } = req.params;
      
      // Check if user is department head or admin
      const hasAdminRole = (req.user.roles || []).some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );
      
      if (!hasAdminRole) {
        const headId = await DepartmentRepository.findDepartmentHeadId(departmentId);

        if (!headId || headId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Only department heads or admins can revoke admin access'
          });
        }
      }

      await DepartmentRepository.updateMemberRole(departmentId, userId, 'Member');

      res.json({
        success: true,
        message: 'Admin access revoked successfully'
      });
      
    } catch (error) {
      this.logger.error('revokeDepartmentAdmin', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke admin access',
        details: error.message
      });
    }
  }

  // Get department admins
  async getDepartmentAdmins(req, res) {
    try {
      const { departmentId } = req.params;

      const admins = await DepartmentRepository.getDepartmentAdmins(departmentId);

      res.json({
        success: true,
        data: admins
      });
      
    } catch (error) {
      this.logger.error('getDepartmentAdmins', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch department admins',
        details: error.message
      });
    }
  }

  async getDepartmentMembers(req, res) {
    try {
      const { departmentId } = req.params;
      const members = await DepartmentRepository.getMembers(departmentId);
      res.json({ success: true, data: members });
    } catch (error) {
      this.logger.error('getDepartmentMembers', error);
      res.status(500).json({ success: false, error: 'Failed to fetch members' });
    }
  }

  // Helper function to notify department members (placeholder for notification system)
  async notifyDepartmentMembers(departmentId, type, data) {
    try {
      // In a real implementation, this would send notifications via:
      // - Email notifications
      // - Push notifications for mobile app
      // - SMS notifications
      // - In-app notifications

      this.logger.debug('notifyDepartmentMembers', { departmentId, type, data });

      // For now, just log the notification
      return true;
    } catch (error) {
      this.logger.error('notifyDepartmentMembers', error);
      return false;
    }
  }

  // Upload department logo
  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { departmentId } = req.params;
      const logoUrl = `/uploads/departments/${req.file.filename}`;

      await DepartmentRepository.updateLogo(departmentId, logoUrl);

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: { logoUrl }
      });
    } catch (error) {
      this.logger.error('uploadLogo', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload logo',
        details: error.message
      });
    }
  }

  // Upload department banner
  async uploadBanner(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { departmentId } = req.params;
      const bannerUrl = `/uploads/departments/${req.file.filename}`;

      await DepartmentRepository.updateBanner(departmentId, bannerUrl);

      res.json({
        success: true,
        message: 'Banner uploaded successfully',
        data: { bannerUrl }
      });
    } catch (error) {
      this.logger.error('uploadBanner', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload banner',
        details: error.message
      });
    }
  }

  // Update department colors
  async updateColors(req, res) {
    try {
      const { departmentId } = req.params;
      const { logoColor, bannerColor } = req.body;

      await DepartmentRepository.updateColors(departmentId, logoColor, bannerColor);

      res.json({
        success: true,
        message: 'Colors updated successfully',
        data: { logoColor, bannerColor }
      });
    } catch (error) {
      this.logger.error('updateColors', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update colors',
        details: error.message
      });
    }
  }

  async getDepartmentPermissions(req, res) {
    try {
      const { departmentId } = req.params;

      const permissions = await DepartmentRepository.getPermissions(departmentId);

      res.json({ success: true, permissions });
    } catch (error) {
      this.logger.error('getDepartmentPermissions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department permissions' });
    }
  }

  async setDepartmentPermission(req, res) {
    try {
      const { departmentId } = req.params;
      const { userId, permission, granted } = req.body;

      const perm = await DepartmentRepository.setPermission(departmentId, userId, permission, granted);

      res.json({ success: true, permission: perm });
    } catch (error) {
      this.logger.error('setDepartmentPermission', error);
      res.status(500).json({ success: false, error: 'Failed to set department permission' });
    }
  }

  async getDepartmentActivity(req, res) {
    try {
      const { departmentId } = req.params;

      const activity = await DepartmentRepository.getActivity(departmentId);

      res.json({ success: true, activity });
    } catch (error) {
      this.logger.error('getDepartmentActivity', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department activity' });
    }
  }

  async logDepartmentActivity(req, res) {
    try {
      const { departmentId } = req.params;
      const { action, details } = req.body;
      const userId = req.user.id;

      await DepartmentRepository.logActivity(departmentId, userId, action, details);

      res.json({ success: true, message: 'Activity logged successfully' });
    } catch (error) {
      this.logger.error('logDepartmentActivity', error);
      res.status(500).json({ success: false, error: 'Failed to log activity' });
    }
  }

  async getDepartmentBranding(req, res) {
    try {
      const { departmentId } = req.params;

      const branding = await DepartmentRepository.getBranding(departmentId);

      if (!branding) {
        return res.status(404).json({ success: false, error: 'Department not found' });
      }

      res.json({ success: true, branding });
    } catch (error) {
      this.logger.error('getDepartmentBranding', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department branding' });
    }
  }

  async updateDepartmentBranding(req, res) {
    try {
      const { departmentId } = req.params;
      const { logoUrl, bannerUrl, primaryColor, secondaryColor, accentColor } = req.body;

      await DepartmentRepository.updateBranding(departmentId, {
        logoUrl,
        bannerUrl,
        primaryColor,
        secondaryColor,
        accentColor
      });

      res.json({ success: true, message: 'Department branding updated successfully' });
    } catch (error) {
      this.logger.error('updateDepartmentBranding', error);
      res.status(500).json({ success: false, error: 'Failed to update department branding' });
    }
  }

  async getDepartmentBudget(req, res) {
    try {
      const { departmentId } = req.params;

      const budget = await DepartmentRepository.getBudget(departmentId);

      res.json({ success: true, budget: budget || {} });
    } catch (error) {
      this.logger.error('getDepartmentBudget', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department budget' });
    }
  }

  async getDepartmentStatistics(req, res) {
    try {
      const { departmentId } = req.params;

      const statistics = await DepartmentRepository.getStatistics(departmentId);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      this.logger.error('getDepartmentStatistics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department statistics' });
    }
  }

  async getDepartmentSettings(req, res) {
    try {
      const { departmentId } = req.params;

      const settingsRows = await DepartmentRepository.getSettings(departmentId);

      const settings = {};
      settingsRows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      this.logger.error('getDepartmentSettings', error);
      res.status(500).json({ success: false, error: 'Failed to fetch department settings' });
    }
  }

  async updateDepartmentSettings(req, res) {
    try {
      const { departmentId } = req.params;
      const { settings } = req.body;

      for (const [key, value] of Object.entries(settings)) {
        await DepartmentRepository.upsertSetting(departmentId, key, value);
      }

      res.json({ success: true, message: 'Department settings updated successfully' });
    } catch (error) {
      this.logger.error('updateDepartmentSettings', error);
      res.status(500).json({ success: false, error: 'Failed to update department settings' });
    }
  }
}

module.exports = new DepartmentController();
module.exports.upload = upload;
