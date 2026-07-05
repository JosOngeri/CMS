const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');
const userRepository = require('../repositories/UserRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('users.routes');

// Middleware to convert user slug to user ID
const convertUserSlugToId = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'User identifier is required'
      });
    }

    // Special case: /me returns the current authenticated user
    if (id === 'me') {
      req.userId = req.user.id;
      return next();
    }

    // If it's already a UUID, skip conversion
    if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      req.userId = id;
      return next();
    }

    // Look up user by slug
    const result = await userRepository.findBySlug(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    req.userId = result.id;
    next();
  } catch (error) {
    logger.error('convertUserSlugToId', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process user identifier'
    });
  }
};

// Get member directory (read-only for all authenticated users)
router.get('/directory', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, role, department } = req.query;

    const result = await userRepository.getMemberDirectory({ page, limit, role, department });

    res.json(result);
  } catch (error) {
    logger.error('getMemberDirectory', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res) => {
  try {
    const { page = 1, limit = 50, role, department } = req.query;

    const result = await userRepository.getAllUsers({ page, limit, role, department });

    res.json(result);
  } catch (error) {
    logger.error('getUsers', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user
router.get('/:id', authenticateToken, convertUserSlugToId, async (req, res) => {
  try {
    const id = req.userId;

    // Users can only view their own profile unless they're admin
    if (req.user.id !== id && !req.user.roles.some(role => 
        ['Super Admin', 'Pastor', 'First Elder'].includes(role))) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const user = await userRepository.getUserWithDepartments(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('getUser', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/:id',
  authenticateToken,
  convertUserSlugToId,
  validationRules.idParam,
  validate,
  validationRules.user.update,
  validate,
  async (req, res) => {
    try {
      const id = req.userId;
      const { first_name, last_name, phone, email, is_active } = req.body;

      // Users can only update their own profile unless they're admin
      if (req.user.id !== id && !req.user.roles.some(role =>
          ['Super Admin', 'Pastor', 'First Elder'].includes(role))) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const result = await userRepository.updateUserProfile(id, { first_name, last_name, phone, email, is_active });

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User updated successfully',
        user: result
      });
    } catch (error) {
      logger.error('updateUser', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Assign role to user (admin only)
router.post('/:id/roles',
  authenticateToken,
  convertUserSlugToId,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  [
    body('role_id').isUUID().withMessage('Valid role ID required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const id = req.userId;
      const { role_id } = req.body;

      const result = await userRepository.assignRole(id, role_id);

      if (!result) {
        return res.status(400).json({ error: 'User already has this role' });
      }

      res.status(201).json({
        message: 'Role assigned successfully',
        user_role: result
      });
    } catch (error) {
      logger.error('assignRole', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove role from user (admin only)
router.delete('/:id/roles/:roleId',
  authenticateToken,
  convertUserSlugToId,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  async (req, res) => {
    try {
      const id = req.userId;
      const { roleId } = req.params;

      const result = await userRepository.removeRole(id, roleId);

      if (!result) {
        return res.status(404).json({ error: 'Role assignment not found' });
      }

      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      logger.error('removeRole', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Deactivate user (admin only)
router.patch('/:id/deactivate',
  authenticateToken,
  requireRole(['Super Admin']),
  convertUserSlugToId,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await userRepository.deactivateUser(id);

      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'User deactivated successfully',
        user: result
      });
    } catch (error) {
      logger.error('deactivateUser', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get user activity history
router.get('/activity-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const activities = await userRepository.getUserActivityHistory(userId, limit);

    res.json({
      activities
    });
  } catch (error) {
    logger.error('getActivityHistory', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password',
  authenticateToken,
  validationRules.user.changePassword,
  validate,
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      // Get current user with password
      const user = await userRepository.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await userRepository.resetPassword(userId, hashedPassword);

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('changePassword', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Prevent self-deletion
    if (id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await userRepository.softDeleteUser(id);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('deleteUser', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
