const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const departmentController = require('../controllers/department.controller');
const activityFeedController = require('../controllers/activityFeed.controller');
const departmentRepository = require('../repositories/DepartmentRepository');
const { logAction } = require('../helpers/auditLog');
const { sendNotification, notifyDepartmentAdmins } = require('../helpers/notify');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('department.routes');

// Middleware to convert slug to department ID
const convertSlugToId = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    
    logger.info('convertSlugToId', 'Input:', departmentId, 'Type:', typeof departmentId);
    
    // If it's already a UUID, skip conversion
    if (departmentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      logger.info('convertSlugToId', 'Already a UUID, skipping conversion');
      req.departmentId = departmentId;
      return next();
    }
    
    // Look up department by slug
    logger.info('convertSlugToId', 'Looking up department by slug:', departmentId);
    const result = await departmentRepository.getIdBySlug(departmentId);
    
    logger.info('convertSlugToId', 'Slug lookup result:', result);
    
    if (!result) {
      logger.info('convertSlugToId', 'Department not found for slug:', departmentId);
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    
    req.departmentId = result.id;
    logger.info('convertSlugToId', 'Converted to UUID:', req.departmentId);
    next();
  } catch (error) {
    logger.error('convertSlugToId', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process department identifier',
      details: error.message
    });
  }
};
// Get user's departments
router.get('/user', authenticateToken, departmentController.getUserDepartments);

// Get user's departments with roles (for My Departments tab)
router.get('/my-departments', authenticateToken, departmentController.getUserDepartments);

// Get available departments to join
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const availableDepartments = await departmentRepository.getAvailableDepartments(userId);

    res.json({
      success: true,
      data: availableDepartments
    });
  } catch (error) {
    logger.error('getAvailableDepartments', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available departments',
      details: error.message
    });
  }
});

// Join departments
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { department_ids } = req.body;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Department IDs are required'
      });
    }

    // Check if user is an admin (auto-approved)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // Insert user into selected departments
    const results = [];
    const pendingCount = [];
    const approvedCount = [];

    for (const departmentId of department_ids) {
      try {
        if (isAdmin) {
          // Auto-approve for admins
          const result = await departmentRepository.insertDepartmentMember(null, {
            userId,
            departmentId,
            role: 'Member',
            isActive: true,
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: userId
          });
          results.push(result);
          approvedCount.push(departmentId);

          // Log the auto-approval
          await logAction(pool, {
            actorId: userId,
            action: 'join_department_auto_approved',
            tableName: 'department_members',
            recordId: result.user_id,
            departmentId: departmentId,
            after: { status: 'approved', role: 'Member' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });
        } else {
          // Pending approval for non-admins
          const result = await departmentRepository.insertDepartmentMember(null, {
            userId,
            departmentId,
            role: 'Member',
            isActive: false,
            status: 'pending',
            approvedAt: null,
            approvedBy: null
          });
          results.push(result);
          pendingCount.push(departmentId);

          // Log the join request
          await logAction(pool, {
            actorId: userId,
            action: 'join_department_requested',
            tableName: 'department_members',
            recordId: result.user_id,
            departmentId: departmentId,
            after: { status: 'pending', role: 'Member' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });

          // Notify department admins about the pending request
          await notifyDepartmentAdmins(pool, departmentId, {
            type: 'approval_request',
            title: 'New membership request',
            body: 'A new member has requested to join your department.',
            link: `/dashboard/departments/${departmentId}`,
            relatedEntityType: 'department',
            relatedEntityId: departmentId
          });
        }
      } catch (error) {
        logger.error('joinDepartments', `Error joining department ${departmentId}:`, error);
      }
    }

    let message = '';
    if (isAdmin) {
      message = `Successfully joined ${approvedCount.length} department(s)`;
    } else {
      message = `Join request sent for ${pendingCount.length} department(s). Awaiting approval from department head.`;
    }

    res.json({
      success: true,
      message,
      data: results,
      pending: pendingCount.length,
      approved: approvedCount.length
    });
  } catch (error) {
    logger.error('joinDepartments', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join departments',
      details: error.message
    });
  }
});

// Leave a department
router.delete('/leave/:departmentId', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;

    // Get current state before update
    const beforeState = await pool.query(
      'SELECT * FROM department_members WHERE user_id = $1 AND department_id = $2',
      [userId, departmentId]
    );

    await pool.query(`
      UPDATE department_members
      SET is_active = false, status = 'rejected'
      WHERE user_id = $1 AND department_id = $2
    `, [userId, departmentId]);

    // Log the leave action
    await logAction(pool, {
      actorId: userId,
      action: 'leave_department',
      tableName: 'department_members',
      recordId: userId,
      departmentId: departmentId,
      before: beforeState.rows[0] || null,
      after: { status: 'rejected', is_active: false },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Successfully left the department'
    });
  } catch (error) {
    logger.error('leaveDepartment', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave department',
      details: error.message
    });
  }
});

// Get pending membership requests for a department (department head only)
router.get('/:departmentId/pending-requests', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;

    // Verify user is the department head or an admin
    const departmentCheck = await pool.query(`
      SELECT d.head_id, d.name as department_name
      FROM departments d
      WHERE d.id = $1
    `, [departmentId]);

    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    const isHead = departmentCheck.rows[0].head_id === userId;
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => req.user.roles?.includes(role));

    if (!isHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only department heads and admins can view pending requests.'
      });
    }

    // Get pending membership requests
    const pendingRequests = await pool.query(`
      SELECT
        dm.user_id,
        dm.department_id,
        dm.joined_at,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number
      FROM department_members dm
      JOIN users u ON dm.user_id = u.id
      WHERE dm.department_id = $1 AND dm.status = 'pending'
      ORDER BY dm.joined_at DESC
    `, [departmentId]);

    res.json({
      success: true,
      data: pendingRequests.rows,
      department_name: departmentCheck.rows[0].department_name
    });
  } catch (error) {
    logger.error('getPendingRequests', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending requests',
      details: error.message
    });
  }
});

// Approve a membership request (department head only)
router.post('/:departmentId/approve/:userId', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const { userId } = req.params;
    const approverId = req.user.id;

    // Verify user is the department head or an admin
    const departmentCheck = await pool.query(`
      SELECT d.head_id
      FROM departments d
      WHERE d.id = $1
    `, [departmentId]);

    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    const isHead = departmentCheck.rows[0].head_id === approverId;
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => req.user.roles?.includes(role));

    if (!isHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only department heads and admins can approve requests.'
      });
    }

    // Approve the membership request
    const result = await pool.query(`
      UPDATE department_members
      SET is_active = true, status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1
      WHERE user_id = $2 AND department_id = $3 AND status = 'pending'
      RETURNING *
    `, [approverId, userId, departmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending request found for this user and department'
      });
    }

    // Log the approval action
    await logAction(pool, {
      actorId: approverId,
      action: 'approve_membership',
      tableName: 'department_members',
      recordId: result.rows[0].user_id,
      departmentId: departmentId,
      before: { status: 'pending' },
      after: { status: 'approved', approved_by: approverId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify the user who was approved
    await sendNotification(pool, {
      recipientId: userId,
      type: 'membership_approved',
      title: 'Membership approved',
      body: 'Your department membership request has been approved.',
      link: `/dashboard/departments/${departmentId}`,
      relatedEntityType: 'department',
      relatedEntityId: departmentId
    });

    res.json({
      success: true,
      message: 'Membership request approved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('approveMembership', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve membership request',
      details: error.message
    });
  }
});

// Reject a membership request (department head only)
router.post('/:departmentId/reject/:userId', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const { userId } = req.params;
    const approverId = req.user.id;

    // Verify user is the department head or an admin
    const departmentCheck = await pool.query(`
      SELECT d.head_id
      FROM departments d
      WHERE d.id = $1
    `, [departmentId]);

    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    const isHead = departmentCheck.rows[0].head_id === approverId;
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => req.user.roles?.includes(role));

    if (!isHead && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only department heads and admins can reject requests.'
      });
    }

    // Reject the membership request
    const result = await pool.query(`
      UPDATE department_members
      SET is_active = false, status = 'rejected'
      WHERE user_id = $2 AND department_id = $3 AND status = 'pending'
      RETURNING *
    `, [userId, departmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending request found for this user and department'
      });
    }

    // Log the rejection action
    await logAction(pool, {
      actorId: approverId,
      action: 'reject_membership',
      tableName: 'department_members',
      recordId: result.rows[0].user_id,
      departmentId: departmentId,
      before: { status: 'pending' },
      after: { status: 'rejected' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify the user who was rejected
    await sendNotification(pool, {
      recipientId: userId,
      type: 'membership_rejected',
      title: 'Membership request rejected',
      body: 'Your department membership request has been rejected.',
      link: `/dashboard/my-departments`,
      relatedEntityType: 'department',
      relatedEntityId: departmentId
    });

    res.json({
      success: true,
      message: 'Membership request rejected successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('rejectMembership', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject membership request',
      details: error.message
    });
  }
});

// Get department dashboard
router.get('/:departmentId/dashboard', authenticateToken, convertSlugToId, departmentController.getDepartmentDashboard);

// Get department communications
router.get('/:departmentId/communications', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    const communications = await pool.query(`
      SELECT 
        dc.id,
        dc.title,
        dc.message,
        dc.type,
        dc.priority,
        dc.sent_at,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.email as sender_email
      FROM department_communications dc
      JOIN users u ON dc.sender_id = u.id
      WHERE dc.department_id = $1
      ORDER BY dc.sent_at DESC
      LIMIT $2 OFFSET $3
    `, [departmentId, limit, offset]);

    res.json({
      success: true,
      data: communications.rows
    });
  } catch (error) {
    logger.error('getDepartmentCommunications', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communications',
      details: error.message
    });
  }
});

// Get department members
router.get('/:departmentId/members', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    const members = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.phone_number,
        dm.role,
        dm.joined_at
      FROM department_members dm
      JOIN users u ON dm.user_id = u.id
      WHERE dm.department_id = $1 AND dm.is_active = true
      ORDER BY dm.role, u.first_name, u.last_name
    `, [departmentId]);

    res.json({
      success: true,
      data: members.rows
    });
  } catch (error) {
    logger.error('getDepartmentMembers', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
      details: error.message
    });
  }
});

// Get department meetings
router.get('/:departmentId/meetings', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    const meetings = await pool.query(`
      SELECT 
        id,
        title,
        description,
        meeting_date,
        duration,
        location,
        status,
        created_at
      FROM department_meetings
      WHERE department_id = $1
      ORDER BY meeting_date DESC
    `, [departmentId]);

    res.json({
      success: true,
      data: meetings.rows
    });
  } catch (error) {
    logger.error('getDepartmentMeetings', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings',
      details: error.message
    });
  }
});

// Get department tasks
router.get('/:departmentId/tasks', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    const tasks = await pool.query(`
      SELECT 
        id,
        title,
        description,
        status,
        priority,
        due_date,
        assigned_to,
        assigned_by,
        created_at
      FROM department_tasks
      WHERE department_id = $1
      ORDER BY created_at DESC
    `, [departmentId]);

    res.json({
      success: true,
      data: tasks.rows
    });
  } catch (error) {
    logger.error('getDepartmentTasks', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
});

// Create department task
router.post('/:departmentId/tasks', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const { title, description, dueDate, priority, assignedTo } = req.body;

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    // Verify assignee is a member of the department
    if (assignedTo) {
      const memberCheck = await pool.query(`
        SELECT 1 FROM department_members
        WHERE department_id = $1 AND user_id = $2 AND is_active = true
      `, [departmentId, assignedTo]);

      if (memberCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Assignee must be a member of this department'
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO department_tasks (title, description, due_date, priority, assigned_to, assigned_by, department_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [title, description, dueDate, priority, assignedTo, userId, departmentId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('createTask', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  }
});

// Update task status
router.put('/:departmentId/tasks/:taskId', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const taskId = req.params.taskId;
    const { status } = req.body;

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    // Verify task belongs to this department
    const taskCheck = await pool.query(`
      SELECT id FROM department_tasks
      WHERE id = $1 AND department_id = $2
    `, [taskId, departmentId]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const result = await pool.query(`
      UPDATE department_tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, taskId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('updateTask', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    });
  }
});

// Delete task
router.delete('/:departmentId/tasks/:taskId', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const taskId = req.params.taskId;

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    // Verify task belongs to this department
    const taskCheck = await pool.query(`
      SELECT id FROM department_tasks
      WHERE id = $1 AND department_id = $2
    `, [taskId, departmentId]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    await pool.query(`
      DELETE FROM department_tasks
      WHERE id = $1
    `, [taskId]);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('deleteTask', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      details: error.message
    });
  }
});

// Get department resources
router.get('/:departmentId/resources', authenticateToken, convertSlugToId, async (req, res) => {
  try {
    const departmentId = req.departmentId;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];

    // Check if user is an admin (Super Admin, Pastor, First Elder)
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user has access to this department
    if (!isAdmin) {
      const accessCheck = await pool.query(`
        SELECT dm.role FROM department_members dm
        WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
      `, [departmentId, userId]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this department'
        });
      }
    }

    const resources = await pool.query(`
      SELECT 
        id,
        title,
        description,
        file_path,
        file_type,
        file_size,
        uploaded_by,
        uploaded_at
      FROM department_resources
      WHERE department_id = $1
      ORDER BY uploaded_at DESC
    `, [departmentId]);

    res.json({
      success: true,
      data: resources.rows
    });
  } catch (error) {
    logger.error('getDepartmentResources', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resources',
      details: error.message
    });
  }
});

// Get department activity feed
router.get('/:departmentId/activity-feed', authenticateToken, convertSlugToId, activityFeedController.getActivityFeed);

// Get department activity summary
router.get('/:departmentId/activity-summary', authenticateToken, convertSlugToId, activityFeedController.getActivitySummary);

// Upload department logo
router.post('/:departmentId/logo', authenticateToken, convertSlugToId, departmentController.upload.single('logo'), departmentController.uploadLogo);

// Upload department banner
router.post('/:departmentId/banner', authenticateToken, convertSlugToId, departmentController.upload.single('banner'), departmentController.uploadBanner);

// Update department colors
router.put('/:departmentId/colors', authenticateToken, convertSlugToId, departmentController.updateColors);

module.exports = router;