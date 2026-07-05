const { body, validationResult } = require('express-validator');
const BaseController = require('./BaseController');
const AnnouncementsRepository = require('../repositories/AnnouncementsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Announcement Controller
 * Handles CRUD operations for church announcements
 */
class AnnouncementController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('AnnouncementController');
  }
  /**
   * Create a new announcement
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Announcement title
   * @param {string} req.body.content - Announcement content
   * @param {string} [req.body.announcement_type='general'] - Type of announcement
   * @param {string} [req.body.department_id] - Department ID (optional)
   * @param {string} [req.body.priority='normal'] - Priority level
   * @param {string} [req.body.expires_at] - Expiration date
   * @param {boolean} [req.body.is_public=true] - Public visibility
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { title, content, announcement_type = 'general', department_id, priority = 'normal', expires_at, is_public = true } = req.body;
      const churchId = req.user.church_id;

      const announcement = await AnnouncementsRepository.createAnnouncement({
        title, content, announcement_type, department_id,
        author_id: req.user.id, priority, expires_at, is_public
      }, churchId);

      const announcementWithDetails = await AnnouncementsRepository.getWithAuthorDetails(announcement.id, churchId);

      res.status(201).json({
        message: 'Announcement created successfully',
        announcement: announcementWithDetails
      });
    } catch (error) {
      this.logger.error('create', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get all announcements with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number
   * @param {number} [req.query.limit=20] - Items per page
   * @param {string} [req.query.department_id] - Filter by department
   * @param {string} [req.query.priority] - Filter by priority
   * @param {boolean} [req.query.is_public] - Filter by public status
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAll(req, res) {
    try {
      const churchId = req.user.church_id;
      const announcements = await AnnouncementsRepository.getRecent(churchId, 20);

      res.json({ success: true, announcements });
    } catch (error) {
      this.logger.error('getAll', error);
      res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
    }
  }

  /**
   * Get a single announcement by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Announcement ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const announcement = await AnnouncementsRepository.getWithAuthorDetails(id, churchId);

      if (!announcement) {
        return res.status(404).json({ success: false, error: 'Announcement not found' });
      }

      // Check access permissions
      if (!announcement.is_public &&
          !req.user.roles.includes('Super Admin') &&
          !req.user.roles.includes('Pastor') &&
          !req.user.roles.includes('First Elder')) {

        // Check if user is member of the department
        const deptMember = await AnnouncementsRepository.checkDepartmentMember(req.user.id, announcement.department_id);

        if (!deptMember) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      res.json({ announcement });
    } catch (error) {
      this.logger.error('getById', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Update an existing announcement
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Announcement ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.title] - Updated title
   * @param {string} [req.body.content] - Updated content
   * @param {string} [req.body.announcement_type] - Updated type
   * @param {string} [req.body.department_id] - Updated department ID
   * @param {string} [req.body.priority] - Updated priority
   * @param {string} [req.body.expires_at] - Updated expiration date
   * @param {boolean} [req.body.is_public] - Updated public status
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const { title, content, announcement_type, department_id, priority, expires_at, is_public } = req.body;

      // Check if user has admin permission
      const hasAdminPermission = await AnnouncementsRepository.checkAdminPermission(req.user.id, 'Super Admin');

      if (!hasAdminPermission && req.user.id !== id) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const announcement = await AnnouncementsRepository.updateAnnouncement(id, {
        title, content, announcement_type, department_id, priority, expires_at, is_public
      });

      res.json({
        message: 'Announcement updated successfully',
        announcement
      });
    } catch (error) {
      this.logger.error('update', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Delete an announcement
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Announcement ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Check if user has admin permission
      const hasAdminPermission = await AnnouncementsRepository.checkAdminPermission(req.user.id, 'Super Admin');

      if (!hasAdminPermission) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      await AnnouncementsRepository.deleteAnnouncement(id);

      res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
      this.logger.error('delete', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get public announcements (no authentication required)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number
   * @param {number} [req.query.limit=10] - Items per page
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPublic(req, res) {
    try {
      const { page = 1, limit = 10, search, department_id } = req.query;
      const offset = (page - 1) * limit;

      const query = `
        SELECT a.*, 
               u.first_name, u.last_name,
               d.name as department_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.is_public = true 
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM announcements a
        WHERE a.is_public = true 
          AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
      `;

      const [result, total] = await Promise.all([
        AnnouncementsRepository.getPaginatedAnnouncements({ limit, offset, search, department_id, is_published: true }),
        AnnouncementsRepository.getAnnouncementCount({ search, department_id, is_published: true })
      ]);

      const pages = Math.ceil(total / limit);

      res.json({
        announcements: result,
        pagination: {
          current: parseInt(page),
          total: pages,
          count: result.length,
          total_items: total
        }
      });
    } catch (error) {
      this.logger.error('getPublic', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get a single public announcement by ID (no authentication required)
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Announcement ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPublicById(req, res) {
    try {
      const { id } = req.params;
      const announcement = await AnnouncementsRepository.getAnnouncementById(id);
      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      res.json({ announcement });
    } catch (error) {
      this.logger.error('getPublicById', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AnnouncementController;
