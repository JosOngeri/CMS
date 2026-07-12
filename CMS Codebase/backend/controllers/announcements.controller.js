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
        return this.validationError(res, errors.array());
      }

      const { title, content, announcement_type = 'general', department_id, priority = 'normal', expires_at, is_public = true } = req.body;
      const churchId = req.user.church_id;

      const announcement = await AnnouncementsRepository.createAnnouncement({
        title, content, announcement_type, department_id,
        author_id: req.user.id, priority, expires_at, is_public
      }, churchId);

      const announcementWithDetails = await AnnouncementsRepository.getWithAuthorDetails(announcement.id, churchId);

      return this.success(res, announcementWithDetails, 'Announcement created successfully', 201);
    } catch (error) {
      this.logger.error('create', error);
      return this.error(res, error);
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

      return this.success(res, { announcements });
    } catch (error) {
      this.logger.error('getAll', error);
      return this.error(res, 'Failed to fetch announcements');
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
        return this.notFound(res, 'Announcement not found');
      }

      // Check access permissions using repository
      const hasAccess = await AnnouncementsRepository.checkAnnouncementAccess(
        req.user.id,
        req.user.roles,
        announcement
      );

      if (!hasAccess) {
        return this.forbidden(res, 'Access denied');
      }

      return this.success(res, { announcement });
    } catch (error) {
      this.logger.error('getById', error);
      return this.error(res, error);
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
        return this.validationError(res, errors.array());
      }

      const { id } = req.params;
      const { title, content, announcement_type, department_id, priority, expires_at, is_public } = req.body;

      // Check if user has admin permission using BaseController helper
      if (!this.isAdmin(req.user) && !this.isOwner(req.user.id, id)) {
        return this.forbidden(res, 'Permission denied');
      }

      const announcement = await AnnouncementsRepository.updateAnnouncement(id, {
        title, content, announcement_type, department_id, priority, expires_at, is_public
      });

      return this.success(res, { announcement }, 'Announcement updated successfully');
    } catch (error) {
      this.logger.error('update', error);
      return this.error(res, error);
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

      // Check if user has admin permission using BaseController helper
      if (!this.isAdmin(req.user)) {
        return this.forbidden(res, 'Permission denied');
      }

      await AnnouncementsRepository.deleteAnnouncement(id);

      return this.success(res, null, 'Announcement deleted successfully');
    } catch (error) {
      this.logger.error('delete', error);
      return this.error(res, error);
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

      const [result, total] = await Promise.all([
        AnnouncementsRepository.getPaginatedAnnouncements({ limit, offset, search, department_id, is_published: true }),
        AnnouncementsRepository.getAnnouncementCount({ search, department_id, is_published: true })
      ]);

      const pagination = this.buildPaginationMeta(total, page, limit);

      return this.success(res, {
        announcements: result,
        pagination
      });
    } catch (error) {
      this.logger.error('getPublic', error);
      return this.error(res, error);
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
        return this.notFound(res, 'Announcement not found');
      }
      return this.success(res, { announcement });
    } catch (error) {
      this.logger.error('getPublicById', error);
      return this.error(res, error);
    }
  }
}

module.exports = AnnouncementController;
