const BaseController = require('./BaseController');
const MembersRepository = require('../repositories/MembersRepository');
const { createLogger } = require('../helpers/controllerLogger');
const auditService = require('../services/auditService');

/**
 * Members Controller
 * Handles CRUD operations for church members
 */
class MembersController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('MembersController');
  }

  /**
   * Get all members with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number
   * @param {number} [req.query.limit=20] - Items per page
   * @param {string} [req.query.search] - Search term
   * @param {string} [req.query.status] - Filter by membership status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllMembers(req, res) {
    try {
      const { page = 1, limit = 20, search, status, filter } = req.query;
      const offset = (page - 1) * limit;
      const churchId = req.user.church_id;

      const members = await MembersRepository.getAll(
        { search, status, filter, limit, offset },
        churchId
      );

      const total = await MembersRepository.count({ status, filter }, churchId);

      res.json({
        success: true,
        data: members,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      this.logger.error('getAllMembers', error);
      this.error(res, 'Failed to fetch members');
    }
  }

  /**
   * Get a single member by ID with contacts and groups
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Member ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMemberById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const member = await MembersRepository.getWithContactsAndGroups(id, churchId);

      if (!member) {
        return this.notFound(res, 'Member not found');
      }

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      this.logger.error('getMemberById', error);
      this.error(res, 'Failed to fetch member');
    }
  }

  /**
   * Create a new member
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.first_name - First name
   * @param {string} req.body.last_name - Last name
   * @param {string} [req.body.date_of_birth] - Date of birth
   * @param {string} [req.body.gender] - Gender
   * @param {string} [req.body.marital_status] - Marital status
   * @param {string} [req.body.occupation] - Occupation
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createMember(req, res) {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        occupation,
        address,
        city,
        phone,
        email,
        baptism_date,
        membership_status,
        joined_date,
        notes,
        contacts,
      } = req.body;

      const member = await MembersRepository.createMember({
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        occupation,
        address,
        city,
        phone,
        email,
        baptism_date,
        membership_status: membership_status || 'active',
        joined_date,
        notes
      });

      // Add contacts if provided
      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          await MembersRepository.addMemberContact(member.id, {
            contact_type: contact.type,
            contact_value: contact.value,
            is_primary: contact.is_primary || false
          });
        }
      }

      // Log audit event
      await auditService.log(
        req.user.church_id,
        req.user.id,
        'CREATE',
        'members',
        member.id,
        null,
        member,
        req.ip,
        req.get('user-agent')
      );

      this.created(res, { data: member });
    } catch (error) {
      this.logger.error('createMember', error);
      this.error(res, 'Failed to create member');
    }
  }

  /**
   * Update an existing member
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Member ID
   * @param {Object} req.body - Request body with member fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateMember(req, res) {
    try {
      const { id } = req.params;
      const {
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        occupation,
        address,
        city,
        phone,
        email,
        baptism_date,
        membership_status,
        joined_date,
        notes,
      } = req.body;

      // Get old member for audit log
      const oldMember = await MembersRepository.getWithContactsAndGroups(id, req.user.church_id);

      const member = await MembersRepository.updateMember(id, {
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        occupation,
        address,
        city,
        phone,
        email,
        baptism_date,
        membership_status,
        joined_date,
        notes
      });

      if (!member) {
        return this.notFound(res, 'Member not found');
      }

      // Log audit event
      await auditService.log(
        req.user.church_id,
        req.user.id,
        'UPDATE',
        'members',
        id,
        oldMember,
        member,
        req.ip,
        req.get('user-agent')
      );

      this.success(res, { data: member });
    } catch (error) {
      this.logger.error('updateMember', error);
      this.error(res, 'Failed to update member');
    }
  }

  /**
   * Delete a member by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Member ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteMember(req, res) {
    try {
      const { id } = req.params;

      // Get old member for audit log
      const oldMember = await MembersRepository.getWithContactsAndGroups(id, req.user.church_id);

      await MembersRepository.deleteMember(id);

      // Log audit event
      await auditService.log(
        req.user.church_id,
        req.user.id,
        'DELETE',
        'members',
        id,
        oldMember,
        null,
        req.ip,
        req.get('user-agent')
      );

      this.success(res, { message: 'Member deleted successfully' });
      this.logger.info('deleteMember', { memberId: id });
    } catch (error) {
      this.logger.error('deleteMember', error);
      this.error(res, 'Failed to delete member');
    }
  }

  /**
   * Get member statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMemberStats(req, res) {
    try {
      const churchId = req.user.church_id;

      const stats = await MembersRepository.getMemberStats(churchId);

      res.json({
        success: true,
        data: {
          total: stats.total_members,
          active: stats.active_members,
          inactive: stats.inactive_members,
          visitors: stats.visitors,
          new_30_days: stats.new_members_30_days,
        },
      });
    } catch (error) {
      this.logger.error('getMemberStats', error);
      this.error(res, 'Failed to fetch stats');
    }
  }
}

module.exports = new MembersController();
