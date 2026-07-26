const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * SMS Groups Controller
 * Handles contact group management for SMS platform
 */
class SMSGroupsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SMSGroupsController');
    this.db = require('../config/database');
  }

  /**
   * Get all groups with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.source] - Filter by source
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGroups(req, res) {
    try {
      const { source } = req.query;
      const churchId = req.user.church_id;

      let query = `
        SELECT g.*, 
               (SELECT COUNT(*) FROM sms_contacts c WHERE c.group_id = g.id) as actual_contact_count
        FROM sms_groups g
        WHERE g.church_id = $1
      `;
      const params = [churchId];
      let paramCount = 1;

      if (source && source !== 'all') {
        paramCount++;
        query += ` AND g.source = $${paramCount}`;
        params.push(source);
      }

      query += ' ORDER BY g.created_at DESC';

      const result = await this.db.query(query, params);
      this.success(res, { groups: result.rows });
    } catch (error) {
      this.logger.error('getGroups', error);
      this.error(res, 'Failed to fetch groups');
    }
  }

  /**
   * Get a single group by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGroup(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const query = `
        SELECT g.*,
               (SELECT COUNT(*) FROM sms_contacts c WHERE c.group_id = g.id) as actual_contact_count
        FROM sms_groups g
        WHERE g.id = $1 AND g.church_id = $2
      `;
      const result = await this.db.query(query, [id, churchId]);

      if (result.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      this.success(res, { group: result.rows[0] });
    } catch (error) {
      this.logger.error('getGroup', error);
      this.error(res, 'Failed to fetch group');
    }
  }

  /**
   * Get members of a specific group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getGroupMembers(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      // Verify group belongs to church
      const groupCheck = await this.db.query(
        'SELECT id FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (groupCheck.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      const query = `
        SELECT c.*
        FROM sms_contacts c
        WHERE c.group_id = $1 AND c.church_id = $2
        ORDER BY c.name ASC
      `;
      const result = await this.db.query(query, [id, churchId]);

      this.success(res, { contacts: result.rows });
    } catch (error) {
      this.logger.error('getGroupMembers', error);
      this.error(res, 'Failed to fetch group members');
    }
  }

  /**
   * Create a new group
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Group name
   * @param {string} [req.body.description] - Group description
   * @param {string} [req.body.source] - Source
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createGroup(req, res) {
    try {
      const { name, description, source } = req.body;
      const churchId = req.user.church_id;

      if (!name || name.trim() === '') {
        return this.error(res, 'Group name is required');
      }

      const query = `
        INSERT INTO sms_groups (church_id, name, description, source)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [
        churchId,
        name.trim(),
        description || null,
        source || 'local'
      ];

      const result = await this.db.query(query, values);
      this.success(res, { group: result.rows[0] }, 201);
    } catch (error) {
      this.logger.error('createGroup', error);
      this.error(res, 'Failed to create group');
    }
  }

  /**
   * Update an existing group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} req.body - Request body
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const churchId = req.user.church_id;

      // Check if group exists and belongs to church
      const existingGroup = await this.db.query(
        'SELECT * FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (existingGroup.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      // Prevent editing website-imported groups
      if (existingGroup.rows[0].source === 'website') {
        return this.error(res, 'Cannot edit website-imported groups');
      }

      const query = `
        UPDATE sms_groups
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND church_id = $4
        RETURNING *
      `;
      const values = [id, name, description, churchId];

      const result = await this.db.query(query, values);
      this.success(res, { group: result.rows[0] });
    } catch (error) {
      this.logger.error('updateGroup', error);
      this.error(res, 'Failed to update group');
    }
  }

  /**
   * Delete a group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteGroup(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      // Check if group exists and belongs to church
      const existingGroup = await this.db.query(
        'SELECT * FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (existingGroup.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      // Prevent deleting website-imported groups
      if (existingGroup.rows[0].source === 'website') {
        return this.error(res, 'Cannot delete website-imported groups');
      }

      // Remove group_id from contacts in this group
      await this.db.query(
        'UPDATE sms_contacts SET group_id = NULL WHERE group_id = $1 AND church_id = $2',
        [id, churchId]
      );

      // Delete user permissions for this group
      await this.db.query(
        'DELETE FROM user_group_permissions WHERE group_id = $1',
        [id]
      );

      // Delete the group
      await this.db.query(
        'DELETE FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      this.success(res, { message: 'Group deleted successfully' });
    } catch (error) {
      this.logger.error('deleteGroup', error);
      this.error(res, 'Failed to delete group');
    }
  }

  /**
   * Add members to a group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} req.body - Request body
   * @param {string[]} req.body.contactIds - Contact IDs to add
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addGroupMembers(req, res) {
    try {
      const { id } = req.params;
      const { contactIds } = req.body;
      const churchId = req.user.church_id;

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return this.error(res, 'Contact IDs array is required');
      }

      // Verify group exists
      const groupCheck = await this.db.query(
        'SELECT id FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (groupCheck.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      // Add contacts to group
      let added = 0;
      for (const contactId of contactIds) {
        try {
          await this.db.query(
            `UPDATE sms_contacts 
             SET group_id = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND church_id = $3`,
            [id, contactId, churchId]
          );
          added++;
        } catch (error) {
          // Skip invalid contacts
          continue;
        }
      }

      // Update group contact count
      await this.db.query(
        'UPDATE sms_groups SET contact_count = contact_count + $1 WHERE id = $2',
        [added, id]
      );

      this.success(res, { message: `Added ${added} contacts to group` });
    } catch (error) {
      this.logger.error('addGroupMembers', error);
      this.error(res, 'Failed to add group members');
    }
  }

  /**
   * Remove members from a group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} req.body - Request body
   * @param {string[]} req.body.contactIds - Contact IDs to remove
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async removeGroupMembers(req, res) {
    try {
      const { id } = req.params;
      const { contactIds } = req.body;
      const churchId = req.user.church_id;

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return this.error(res, 'Contact IDs array is required');
      }

      // Verify group exists
      const groupCheck = await this.db.query(
        'SELECT id FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (groupCheck.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      // Remove contacts from group
      let removed = 0;
      for (const contactId of contactIds) {
        try {
          await this.db.query(
            `UPDATE sms_contacts 
             SET group_id = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND church_id = $2 AND group_id = $3`,
            [contactId, churchId, id]
          );
          removed++;
        } catch (error) {
          // Skip invalid contacts
          continue;
        }
      }

      // Update group contact count
      await this.db.query(
        'UPDATE sms_groups SET contact_count = contact_count - $1 WHERE id = $2',
        [removed, id]
      );

      this.success(res, { message: `Removed ${removed} contacts from group` });
    } catch (error) {
      this.logger.error('removeGroupMembers', error);
      this.error(res, 'Failed to remove group members');
    }
  }

  /**
   * Set user permissions for a group
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Group ID
   * @param {Object} req.body - Request body
   * @param {number} req.body.userId - User ID
   * @param {boolean} req.body.canView - Can view permission
   * @param {boolean} req.body.canSend - Can send permission
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async setGroupPermissions(req, res) {
    try {
      const { id } = req.params;
      const { userId, canView, canSend } = req.body;
      const churchId = req.user.church_id;

      // Verify group exists
      const groupCheck = await this.db.query(
        'SELECT id FROM sms_groups WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (groupCheck.rows.length === 0) {
        return this.error(res, 'Group not found', 404);
      }

      // Verify user exists and belongs to church
      const userCheck = await this.db.query(
        'SELECT id FROM users WHERE id = $1 AND church_id = $2',
        [userId, churchId]
      );

      if (userCheck.rows.length === 0) {
        return this.error(res, 'User not found', 404);
      }

      // Upsert permission
      await this.db.query(
        `INSERT INTO user_group_permissions (user_id, group_id, can_view, can_send)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, group_id)
         DO UPDATE SET can_view = $3, can_send = $4`,
        [userId, id, canView || false, canSend || false]
      );

      this.success(res, { message: 'Permissions updated successfully' });
    } catch (error) {
      this.logger.error('setGroupPermissions', error);
      this.error(res, 'Failed to set group permissions');
    }
  }

  /**
   * Get user permissions for groups
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserGroupPermissions(req, res) {
    try {
      const { userId } = req.params;
      const churchId = req.user.church_id;

      const query = `
        SELECT ugp.*, g.name as group_name
        FROM user_group_permissions ugp
        JOIN sms_groups g ON ugp.group_id = g.id
        WHERE ugp.user_id = $1 AND g.church_id = $2
      `;
      const result = await this.db.query(query, [userId, churchId]);

      this.success(res, { permissions: result.rows });
    } catch (error) {
      this.logger.error('getUserGroupPermissions', error);
      this.error(res, 'Failed to fetch user permissions');
    }
  }
}

module.exports = new SMSGroupsController();