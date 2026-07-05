const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogRepository = require('../repositories/AuditLogRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('audit-logs.routes');

// Get audit logs (admin only)
router.get('/', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      userId,
      action,
      tableName,
      departmentId,
      startDate,
      endDate
    } = req.query;

    const result = await auditLogRepository.getAuditLogs({
      limit, offset, userId, action, tableName, departmentId, startDate, endDate
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('getAuditLogs', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      details: error.message
    });
  }
});

// Get audit log by ID
router.get('/:id', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await auditLogRepository.getAuditLogById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('getAuditLogById', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
      details: error.message
    });
  }
});

// Get audit logs for a specific department (department head and admins)
router.get('/department/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const { limit = 100, offset = 0 } = req.query;

    // Check if user is an admin
    const isAdmin = ['Super Admin', 'Pastor', 'First Elder'].some(role => userRoles.includes(role));

    // If not admin, verify user is department head or admin
    if (!isAdmin) {
      const deptCheck = await auditLogRepository.checkDepartmentHead(departmentId, userId);
      const adminCheck = await auditLogRepository.checkDepartmentAdmin(departmentId, userId);

      if (!deptCheck && !adminCheck) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    const result = await auditLogRepository.getDepartmentAuditLogs(departmentId, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('getDepartmentAuditLogs', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department audit logs',
      details: error.message
    });
  }
});

module.exports = router;
