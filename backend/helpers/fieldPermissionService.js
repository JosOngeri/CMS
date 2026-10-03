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
      if (error.code === '42P01') {
        // Return empty permissions if table doesn't exist yet
        return {};
      }
      logger.error('getFieldPermissions', 'Get field permissions error:', error);
      throw error;
    }
  }

  async checkFieldPermission(userId, module, field, action, cached = null) {
    try {
      let permissions;
      if (cached) {
        permissions = cached;
      } else {
        permissions = await this.bulkFetchPermissions(userId, module);
      }

      if (permissions.all) {
        return true;
      }

      return !!(permissions[field] && permissions[field][action]);
    } catch (error) {
      logger.error('checkFieldPermission', 'Check field permission error:', error);
      // Default to false on error
      return false;
    }
  }

  /**
   * Bulk fetch permissions for a user and module to avoid N+1 queries
   * Results should be cached in req.user for the duration of the request
   */
  async bulkFetchPermissions(userId, module) {
    try {
      // Roles come from user_roles → roles join (canonical, per IdentityService);
      // users.role (singular) is a legacy fallback some rows still carry.
      const userResult = await pool.query(
        `SELECT r.name AS role_name
         FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
         UNION
         SELECT role FROM users WHERE id = $1 AND role IS NOT NULL`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return {};
      }

      const roles = userResult.rows.map(r => r.role_name).filter(Boolean);

      // Super Admin has all permissions
      if (roles.includes('Super Admin')) {
        return { all: true };
      }

      // Bulk fetch all field permissions for all roles in a single query
      const result = await pool.query(
        `SELECT field_name, can_read, can_write, can_delete
         FROM field_permissions
         WHERE role = ANY($1) AND module = $2`,
        [roles, module]
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
      logger.error('bulkFetchPermissions', 'Bulk fetch permissions error:', error);
      return {};
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
      // Use bulk fetch to avoid N+1 queries and leverage a single round-trip
      return await this.bulkFetchPermissions(userId, module);
    } catch (error) {
      logger.error('getModulePermissions', 'Get module permissions error:', error);
      return {};
    }
  }

  /**
   * Attach bulk permissions to req.user for the current request lifecycle
   */
  async cachePermissionsOnUser(req, module) {
    if (!req.user || !req.user.id) {
      return {};
    }

    if (!req.user.fieldPermissions) {
      req.user.fieldPermissions = {};
    }

    if (!req.user.fieldPermissions[module]) {
      req.user.fieldPermissions[module] = await this.bulkFetchPermissions(req.user.id, module);
    }

    return req.user.fieldPermissions[module];
  }

  /**
   * Check a field permission using the cached permissions on req.user when available
   */
  async checkCachedPermission(req, module, field, action) {
    const cached = await this.cachePermissionsOnUser(req, module);
    return this.checkFieldPermission(req.user.id, module, field, action, cached);
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
      return {}; // Fail closed — never leak unfiltered fields on error
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
