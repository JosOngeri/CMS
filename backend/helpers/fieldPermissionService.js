const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('fieldPermissionService');

class FieldPermissionService {
  async getFieldPermissions(role, module) {
    try {
      const result = await pool.query(
        `SELECT field_name, can_read, can_write, can_delete
         FROM field_permissions
         WHERE role = $1 AND module = $2`,
        [role, module]
      );

      const permissions = {};
      result.rows.forEach(row => {
        permissions[row.field_name] = {
          read: row.can_read,
          write: row.can_write,
          delete: row.can_delete
        };
      });

      return permissions;
    } catch (error) {
      logger.error('getFieldPermissions', 'Get field permissions error:', error);
      // Return empty permissions if table doesn't exist yet
      return {};
    }
  }

  async checkFieldPermission(userId, module, field, action) {
    try {
      // Get user roles
      const userResult = await pool.query(
        `SELECT roles FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return false;
      }

      const roles = userResult.rows[0].roles || [];

      // Super Admin has all permissions
      if (roles.includes('Super Admin')) {
        return true;
      }

      // Check field permissions for each role
      for (const role of roles) {
        const result = await pool.query(
          `SELECT can_${action} as has_permission
           FROM field_permissions
           WHERE role = $1 AND module = $2 AND field_name = $3`,
          [role, module, field]
        );

        if (result.rows.length > 0 && result.rows[0].has_permission) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('checkFieldPermission', 'Check field permission error:', error);
      // Default to false on error
      return false;
    }
  }

  async setFieldPermissions(role, module, fieldPermissions) {
    try {
      for (const [field, permissions] of Object.entries(fieldPermissions)) {
        await pool.query(
          `INSERT INTO field_permissions (role, module, field_name, can_read, can_write, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (role, module, field_name) 
           DO UPDATE SET can_read = $4, can_write = $5, can_delete = $6`,
          [
            role,
            module,
            field,
            permissions.read || false,
            permissions.write || false,
            permissions.delete || false
          ]
        );
      }

      return { success: true };
    } catch (error) {
      logger.error('setFieldPermissions', 'Set field permissions error:', error);
      throw error;
    }
  }

  async getModulePermissions(userId, module) {
    try {
      // Get user roles
      const userResult = await pool.query(
        `SELECT roles FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return {};
      }

      const roles = userResult.rows[0].roles || [];

      // Super Admin has all permissions
      if (roles.includes('Super Admin')) {
        return { all: true };
      }

      // Get all field permissions for the module
      const permissions = {};
      for (const role of roles) {
        const rolePermissions = await this.getFieldPermissions(role, module);
        Object.assign(permissions, rolePermissions);
      }

      return permissions;
    } catch (error) {
      logger.error('getModulePermissions', 'Get module permissions error:', error);
      return {};
    }
  }

  async filterFieldsByPermission(userId, module, data) {
    try {
      const permissions = await this.getModulePermissions(userId, module);

      if (permissions.all) {
        return data; // Super Admin sees all fields
      }

      // Filter data based on permissions
      const filteredData = {};
      for (const [field, value] of Object.entries(data)) {
        if (permissions[field] && permissions[field].read) {
          filteredData[field] = value;
        }
      }

      return filteredData;
    } catch (error) {
      logger.error('filterFieldsByPermission', 'Filter fields error:', error);
      return data; // Return original data on error
    }
  }

  async canEditField(userId, module, field) {
    return this.checkFieldPermission(userId, module, field, 'write');
  }

  async canDeleteField(userId, module, field) {
    return this.checkFieldPermission(userId, module, field, 'delete');
  }

  async canViewField(userId, module, field) {
    return this.checkFieldPermission(userId, module, field, 'read');
  }
}

module.exports = new FieldPermissionService();
