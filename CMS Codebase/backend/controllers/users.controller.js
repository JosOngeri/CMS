const BaseController = require('./BaseController');
const UserRepository = require('../repositories/UserRepository');
const { createLogger } = require('../helpers/controllerLogger');
const auditService = require('../services/auditService');

/**
 * Users Controller
 * Handles CRUD operations for user accounts
 */
class UsersController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('UsersController');
  }

  /**
   * Get all users with their roles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllUsers(req, res) {
    try {
      const churchId = req.user.church_id;
      const users = await UserRepository.getAllWithRoles(churchId);

      this.success(res, { users });
      this.logger.info('getAllUsers', { count: users.length });
    } catch (error) {
      this.logger.error('getAllUsers', error);
      this.error(res, 'Internal server error');
    }
  }

  /**
   * Get a single user by ID with roles
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const user = await UserRepository.getUserByIdWithRoles(id, churchId);

      if (!user) {
        return this.notFound(res, 'User not found');
      }

      this.success(res, { user });
    } catch (error) {
      this.logger.error('getUserById', error);
      this.error(res, 'Internal server error');
    }
  }

  /**
   * Create a new user with optional role assignment
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.username - Username
   * @param {string} req.body.email - Email
   * @param {string} req.body.password - Password
   * @param {string} req.body.first_name - First name
   * @param {string} req.body.last_name - Last name
   * @param {string} [req.body.phone_number] - Phone number
   * @param {string[]} [req.body.roles] - Array of role names
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createUser(req, res) {
    try {
      const { username, email, password, first_name, last_name, phone_number, roles } = req.body;
      const churchId = req.user.church_id;

      const user = await UserRepository.createUser({
        username, email, password, first_name, last_name, phone_number
      }, churchId);

      // Assign roles if provided
      if (roles && roles.length > 0) {
        await UserRepository.updateUserRoles(user.id, roles, churchId);
      }

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'CREATE',
        'users',
        user.id,
        null,
        user,
        req.ip,
        req.get('user-agent')
      );

      this.created(res, { user });
      this.logger.info('createUser', { userId: user.id, email });
    } catch (error) {
      this.logger.error('createUser', error);
      this.error(res, 'Internal server error');
    }
  }

  /**
   * Update an existing user and their roles
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - User ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.email] - Updated email
   * @param {string} [req.body.first_name] - Updated first name
   * @param {string} [req.body.last_name] - Updated last name
   * @param {string} [req.body.phone_number] - Updated phone number
   * @param {string[]} [req.body.roles] - Updated array of role names
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, first_name, last_name, phone_number, roles } = req.body;
      const churchId = req.user.church_id;

      // Get old user for audit log
      const oldUser = await UserRepository.getUserByIdWithRoles(id, churchId);

      const user = await UserRepository.updateUser(id, {
        email, first_name, last_name, phone_number
      }, churchId);

      if (!user) {
        return this.notFound(res, 'User not found');
      }

      // Update roles if provided
      if (roles) {
        await UserRepository.updateUserRoles(id, roles, churchId);
      }

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'UPDATE',
        'users',
        id,
        oldUser,
        user,
        req.ip,
        req.get('user-agent')
      );

      this.success(res, { user });
      this.logger.info('updateUser', { userId: id });
    } catch (error) {
      this.logger.error('updateUser', error);
      this.error(res, 'Internal server error');
    }
  }

  /**
   * Delete a user by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      // Get old user for audit log
      const oldUser = await UserRepository.getUserByIdWithRoles(id, churchId);

      const user = await UserRepository.deleteUser(id);

      if (!user) {
        return this.notFound(res, 'User not found');
      }

      // Log audit event
      await auditService.log(
        churchId,
        req.user.id,
        'DELETE',
        'users',
        id,
        oldUser,
        null,
        req.ip,
        req.get('user-agent')
      );

      this.success(res, { message: 'User deleted successfully' });
      this.logger.info('deleteUser', { userId: id });
    } catch (error) {
      this.logger.error('deleteUser', error);
      this.error(res, 'Internal server error');
    }
  }
}

module.exports = new UsersController();
