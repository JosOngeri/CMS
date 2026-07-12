const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const departmentsController = require('../controllers/departments.controller');
const departmentController = require('../controllers/department.controller');
const { logAction } = require('../helpers/auditLog');
const { sendNotification, notifyDepartmentAdmins } = require('../helpers/notify');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('departments.routes');

// Get global department overview (admin only)
router.get('/overview', 
  authenticateToken, 
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  departmentController.getGlobalDepartmentOverview
);

// Get all departments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT d.*
      FROM departments d
      WHERE d.is_active = true
      ORDER BY d.name ASC
    `;

    const result = await pool.query(query);

    res.json({
      departments: result.rows
    });
  } catch (error) {
    logger.error('getDepartments', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single department by slug or ID
router.get('/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by slug first, then by ID
    const query = `
      SELECT d.*, u.first_name as head_first_name, u.last_name as head_last_name
      FROM departments d
      LEFT JOIN users u ON d.head_id = u.id
      WHERE d.slug = $1 OR d.id::text = $1
    `;

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ department: result.rows[0] });
  } catch (error) {
    logger.error('getDepartment', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department dashboard data by slug or ID
router.get('/:identifier/dashboard', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Get department basic info by slug or ID
    const deptQuery = 'SELECT * FROM departments WHERE slug = $1 OR id::text = $1';
    const deptResult = await pool.query(deptQuery, [identifier]);

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const department = deptResult.rows[0];

    // Get member count (simplified - just count users if department_members table doesn't exist)
    let memberCount = 0;
    try {
      const memberQuery = `
        SELECT COUNT(*) as count
        FROM department_members
        WHERE department_id = $1
      `;
      const memberResult = await pool.query(memberQuery, [department.id]);
      memberCount = parseInt(memberResult.rows[0].count);
    } catch (err) {
      // department_members table doesn't exist, use default
      memberCount = 0;
    }

    res.json({
      success: true,
      department: {
        ...department,
        member_count: memberCount,
        recent_activity: [],
        pending_requests: [],
        upcoming_events: []
      }
    });
  } catch (error) {
    logger.error('getDepartmentDashboard', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number,
             dm.role, dm.joined_at
      FROM users u
      INNER JOIN department_members dm ON u.id = dm.user_id
      WHERE dm.department_id = $1 AND u.is_active = true
      ORDER BY dm.joined_at ASC
    `;

    const result = await pool.query(query, [id]);
    res.json({ members: result.rows });
  } catch (error) {
    logger.error('getDepartmentMembers', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department communications
router.get('/:id/communications', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT dc.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM department_communications dc
       LEFT JOIN users u ON dc.created_by = u.id
       WHERE dc.department_id = $1
       ORDER BY dc.created_at DESC
       LIMIT $2`,
      [id, limit]
    );

    res.json({ communications: result.rows });
  } catch (error) {
    logger.error('getDepartmentCommunications', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department meetings
router.get('/:id/meetings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dm.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM department_meetings dm
       LEFT JOIN users u ON dm.created_by = u.id
       WHERE dm.department_id = $1
       ORDER BY dm.meeting_date ASC`,
      [id]
    );

    res.json({ meetings: result.rows });
  } catch (error) {
    logger.error('getDepartmentMeetings', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department tasks
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dt.*, u.first_name || ' ' || u.last_name as assignee_name,
              cb.first_name || ' ' || cb.last_name as created_by_name
       FROM department_tasks dt
       LEFT JOIN users u ON dt.assignee_id = u.id
       LEFT JOIN users cb ON dt.created_by = cb.id
       WHERE dt.department_id = $1
       ORDER BY dt.due_date ASC`,
      [id]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    logger.error('getDepartmentTasks', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department resources
router.get('/:id/resources', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dr.*, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM department_resources dr
       LEFT JOIN users u ON dr.uploaded_by = u.id
       WHERE dr.department_id = $1
       ORDER BY dr.uploaded_at DESC`,
      [id]
    );

    res.json({ resources: result.rows });
  } catch (error) {
    logger.error('getDepartmentResources', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create department (admin only)
router.post('/',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  validationRules.department.create,
  validate,
  async (req, res) => {
    try {
      const { name, description, head_id, category, leader_name, leader_contact } = req.body;
      const churchId = req.user.church_id;
      const churchSlug = req.user.church_slug;
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const query = `
        INSERT INTO departments (name, description, head_id, category, leader_name, leader_contact, church_id, church_slug, slug, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *
      `;

      const result = await pool.query(query, [name, description, head_id || null, category || null, leader_name || null, leader_contact || null, churchId, churchSlug, slug]);

      // Log the department creation
      await logAction(pool, {
        actorId: req.user.id,
        action: 'create_department',
        tableName: 'departments',
        recordId: result.rows[0].id,
        after: result.rows[0],
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Notify the new department head if assigned
      if (head_id) {
        await sendNotification(pool, {
          recipientId: head_id,
          type: 'department_created',
          title: 'You have been assigned as department head',
          body: `You have been assigned as the head of the ${name} department.`,
          link: `/dashboard/departments/${result.rows[0].id}`,
          relatedEntityType: 'department',
          relatedEntityId: result.rows[0].id
        });
      }

      res.status(201).json({
        message: 'Department created successfully',
        department: result.rows[0]
      });
    } catch (error) {
      logger.error('createDepartment', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
);

// Update department (admin or department head)
router.put('/:identifier',
  authenticateToken,
  async (req, res) => {
    try {
      const { identifier } = req.params;
      const { name, description, head_id, category, slug } = req.body;

      // Get department by slug or ID
      const deptQuery = 'SELECT * FROM departments WHERE slug = $1 OR id::text = $1';
      const deptResult = await pool.query(deptQuery, [identifier]);

      if (deptResult.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const department = deptResult.rows[0];
      const id = department.id;

      // Check permissions
      const hasAdminRole = req.user.roles && req.user.roles.some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );

      if (!hasAdminRole) {
        // Check if user is department head
        if (department.head_id !== req.user.id) {
          return res.status(403).json({ error: 'Permission denied' });
        }
      }

      // Get current state before update
      const beforeState = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);

      // Generate new slug if name changed and slug not provided
      let newSlug = slug;
      if (name && !slug && name !== department.name) {
        newSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      const updateQuery = `
        UPDATE departments
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            head_id = COALESCE($3, head_id),
            category = COALESCE($4, category),
            slug = COALESCE($5, slug),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [name, description, head_id, category, newSlug, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      res.json({
        message: 'Department updated successfully',
        department: result.rows[0]
      });
    } catch (error) {
      logger.error('updateDepartment', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add member to department (admin or department head)
router.post('/:id/members',
  authenticateToken,
  validationRules.idParam,
  validate,
  validationRules.department.addMember,
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, role_in_department } = req.body;

      // Check permissions
      const hasAdminRole = req.user.roles.some(role =>
        ['Super Admin', 'Pastor', 'First Elder'].includes(role)
      );

      if (!hasAdminRole) {
        // Check if user is department head
        const deptQuery = 'SELECT head_id FROM departments WHERE id = $1';
        const deptResult = await pool.query(deptQuery, [id]);

        if (deptResult.rows.length === 0 || deptResult.rows[0].head_id !== req.user.id) {
          return res.status(403).json({ error: 'Permission denied' });
        }
      }

      const query = `
        INSERT INTO department_members (user_id, department_id, role_in_department)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, department_id) DO UPDATE
        SET role_in_department = EXCLUDED.role_in_department
        RETURNING *
      `;

      const result = await pool.query(query, [user_id, id, role_in_department]);

      // Log the member addition
      await logAction(pool, {
        actorId: req.user.id,
        action: 'add_department_member',
        tableName: 'department_members',
        recordId: user_id,
        departmentId: id,
        after: { user_id, department_id: id, role_in_department },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Notify the added member
      await sendNotification(pool, {
        recipientId: user_id,
        type: 'member_added',
        title: 'Added to department',
        body: `You have been added to a department.`,
        link: `/dashboard/departments/${id}`,
        relatedEntityType: 'department',
        relatedEntityId: id
      });

      res.status(201).json({
        message: 'Member added to department successfully',
        membership: result.rows[0]
      });
    } catch (error) {
      logger.error('addDepartmentMember', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove member from department (admin or department head)
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check permissions
    const hasAdminRole = req.user.roles.some(role =>
      ['Super Admin', 'Pastor', 'First Elder'].includes(role)
    );

    if (!hasAdminRole) {
      // Check if user is department head
      const deptQuery = 'SELECT head_id FROM departments WHERE id = $1';
      const deptResult = await pool.query(deptQuery, [id]);

      if (deptResult.rows.length === 0 || deptResult.rows[0].head_id !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    // Get current state before deletion
    const beforeState = await pool.query(
      'SELECT * FROM department_members WHERE department_id = $1 AND user_id = $2',
      [id, userId]
    );

    await pool.query('DELETE FROM department_members WHERE department_id = $1 AND user_id = $2', [id, userId]);

    // Log the member removal
    await logAction(pool, {
      actorId: req.user.id,
      action: 'remove_department_member',
      tableName: 'department_members',
      recordId: userId,
      departmentId: id,
      before: beforeState.rows[0] || null,
      after: null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify the removed member
    await sendNotification(pool, {
      recipientId: userId,
      type: 'member_removed',
      title: 'Removed from department',
      body: 'You have been removed from a department.',
      link: `/dashboard/my-departments`,
      relatedEntityType: 'department',
      relatedEntityId: id
    });

    res.json({ message: 'Member removed from department successfully' });
  } catch (error) {
    logger.error('removeDepartmentMember', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch operations for departments (admin only)
router.post('/batch',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  async (req, res) => {
    try {
      const { action, department_ids } = req.body;

      logger.info('batchOperation', 'Batch operation request received', {
        action,
        department_ids,
        user: req.user?.email,
        roles: req.user?.roles
      });

      if (!action) {
        logger.info('batchOperation', 'Batch operation failed: No action provided');
        return res.status(400).json({ error: 'Invalid request. Action is required' });
      }

      // For selected operations, department_ids is required
      if (['activate_selected', 'deactivate_selected', 'delete_selected'].includes(action)) {
        if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
          return res.status(400).json({ error: 'Invalid request. Department IDs array required for this action' });
        }
      }

      let query;
      let params;
      let message;

      switch (action) {
        case 'activate_all':
          query = 'UPDATE departments SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE is_active = false RETURNING *';
          params = [];
          message = 'All departments activated successfully';
          break;
        case 'deactivate_all':
          query = 'UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE is_active = true RETURNING *';
          params = [];
          message = 'All departments deactivated successfully';
          break;
        case 'activate_selected':
          query = 'UPDATE departments SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1) RETURNING *';
          params = [department_ids];
          message = 'Selected departments activated successfully';
          break;
        case 'deactivate_selected':
          query = 'UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1) RETURNING *';
          params = [department_ids];
          message = 'Selected departments deactivated successfully';
          break;
        case 'delete_selected':
          query = 'DELETE FROM departments WHERE id = ANY($1) RETURNING *';
          params = [department_ids];
          message = 'Selected departments deleted successfully';
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      const result = await pool.query(query, params);

      res.json({
        message,
        affected_count: result.rows.length,
        departments: result.rows
      });
    } catch (error) {
      logger.error('batchOperation', error);
      logger.error('batchOperation', 'Error details', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message,
        code: error.code 
      });
    }
  }
);

// Delete department (admin only)
router.delete('/:id',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  validationRules.idParam,
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      res.json({ message: 'Department deleted successfully' });
    } catch (error) {
      logger.error('deleteDepartment', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Component Management Routes

// Get all available components (admin only)
router.get('/components/all',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder']),
  departmentController.getAllComponents
);

// Get components allocated to a department
router.get('/:id/components',
  authenticateToken,
  departmentController.getDepartmentComponents
);

// Allocate component to department (admin or department head)
router.post('/:id/components',
  authenticateToken,
  validationRules.idParam,
  validate,
  departmentController.allocateComponent
);

// Remove component allocation from department (admin or department head)
router.delete('/:id/components/:componentId',
  authenticateToken,
  departmentController.removeComponentAllocation
);

// Permission Management Routes

// Get department admins
router.get('/:id/admins',
  authenticateToken,
  departmentController.getDepartmentAdmins
);

// Grant admin access to user (department head or admin only)
router.post('/:id/admins',
  authenticateToken,
  validationRules.idParam,
  validate,
  departmentController.grantDepartmentAdmin
);

// Revoke admin access from user (department head or admin only)
router.delete('/:id/admins/:userId',
  authenticateToken,
  departmentController.revokeDepartmentAdmin
);



// Get pending department membership requests
router.get('/:identifier/pending-requests', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Get department ID from slug or ID
    const deptQuery = 'SELECT id FROM departments WHERE slug = $1 OR id::text = $1';
    const deptResult = await pool.query(deptQuery, [identifier]);

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.rows[0].id;

    const result = await pool.query(
      `SELECT dm.*, u.first_name, u.last_name, u.email, u.phone_number
       FROM department_members dm
       INNER JOIN users u ON dm.user_id = u.id
       WHERE dm.department_id = $1 AND dm.status = 'pending'
       ORDER BY dm.requested_at DESC`,
      [departmentId]
    );

    res.json({ pending_requests: result.rows });
  } catch (error) {
    logger.error('getPendingRequests', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve department membership request
router.post('/:identifier/approve/:userId', authenticateToken, async (req, res) => {
  try {
    const { identifier, userId } = req.params;

    // Get department ID from slug or ID
    const deptQuery = 'SELECT id FROM departments WHERE slug = $1 OR id::text = $1';
    const deptResult = await pool.query(deptQuery, [identifier]);

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.rows[0].id;

    const result = await pool.query(
      `UPDATE department_members 
       SET status = 'approved', 
           approved_by = $1, 
           approved_at = NOW(),
           joined_at = NOW()
       WHERE department_id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, departmentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    res.json({ 
      message: 'Membership request approved',
      member: result.rows[0]
    });
  } catch (error) {
    logger.error('approveRequest', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject department membership request
router.post('/:identifier/reject/:userId', authenticateToken, async (req, res) => {
  try {
    const { identifier, userId } = req.params;

    // Get department ID from slug or ID
    const deptQuery = 'SELECT id FROM departments WHERE slug = $1 OR id::text = $1';
    const deptResult = await pool.query(deptQuery, [identifier]);

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.rows[0].id;

    const result = await pool.query(
      `DELETE FROM department_members 
       WHERE department_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [departmentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    res.json({ 
      message: 'Membership request rejected',
      member: result.rows[0]
    });
  } catch (error) {
    logger.error('rejectRequest', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Department permissions
router.get('/:departmentId/permissions', authenticateToken, departmentController.getDepartmentPermissions);
router.post('/:departmentId/permissions', authenticateToken, requireRole(['Super Admin', 'Pastor', 'Department Head']), departmentController.setDepartmentPermission);

// Department activity feed
router.get('/:departmentId/activity', authenticateToken, departmentController.getDepartmentActivity);
router.post('/:departmentId/activity', authenticateToken, departmentController.logDepartmentActivity);

// Department branding
router.get('/:departmentId/branding', authenticateToken, departmentController.getDepartmentBranding);
router.put('/:departmentId/branding', authenticateToken, requireRole(['Super Admin', 'Pastor', 'Department Head']), departmentController.updateDepartmentBranding);

// Department budget tracking
router.get('/:departmentId/budget', authenticateToken, requireRole(['Super Admin', 'Pastor', 'Treasurer', 'Department Head']), departmentController.getDepartmentBudget);

// Department statistics
router.get('/:departmentId/statistics', authenticateToken, departmentController.getDepartmentStatistics);

// Department settings
router.get('/:departmentId/settings', authenticateToken, departmentController.getDepartmentSettings);
router.put('/:departmentId/settings', authenticateToken, requireRole(['Super Admin', 'Pastor', 'Department Head']), departmentController.updateDepartmentSettings);

module.exports = router;
