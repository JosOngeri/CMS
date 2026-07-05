const BaseController = require('./BaseController');
const UserRepository = require('../repositories/UserRepository');
const { createLogger } = require('../helpers/controllerLogger');

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
      const users = await UsersRepository.getAllWithRoles(churchId);

      res.json({ success: true, data: { users } });
      this.logger.info('getAllUsers', { count: users.length });
    } catch (error) {
      this.logger.error('getAllUsers', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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

      const user = await UsersRepository.getUserByIdWithRoles(id, churchId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      this.logger.error('getUserById', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const user = {
        ...result.rows[0],
        roles: result.rows[0].roles || []
      };
      
      res.json({ success: true, data: { user } });
    } catch (error) {
      this.logger.error('getUserById', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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

      const user = await UsersRepository.createUser({
        username, email, password, first_name, last_name, phone_number
      }, churchId);

      // Assign roles if provided
      if (roles && roles.length > 0) {
        await UsersRepository.updateUserRoles(user.id, roles, churchId);
      }

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      this.logger.error('createUser', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
          }
        }
      }
      
      res.status(201).json({ success: true, data: { user: result.rows[0] } });
      this.logger.info('createUser', { userId: result.rows[0].id, email });
    } catch (error) {
      this.logger.error('createUser', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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

      const user = await UsersRepository.updateUser(id, {
        email, first_name, last_name, phone_number
      }, churchId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Update roles if provided
      if (roles) {
        await UsersRepository.updateUserRoles(id, roles, churchId);
      }

      res.json({ success: true, data: user });
    } catch (error) {
      this.logger.error('updateUser', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Delete a user
      this.logger.info('updateUser', { userId: id });
    } catch (error) {
      this.logger.error('updateUser', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
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

      const user = await UserRepository.deleteUser(id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, message: 'User deleted successfully' });
      this.logger.info('deleteUser', { userId: id });
    } catch (error) {
      this.logger.error('deleteUser', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new UsersController();
