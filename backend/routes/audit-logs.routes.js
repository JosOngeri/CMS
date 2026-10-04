const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogRepository = require('../repositories/AuditLogRepository');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('audit-logs.routes');

// Reject non-UUID params before the role checks query the DB — a bad value
// crashed the department-head check with invalid_text_representation (500).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const paramName of ['id', 'departmentId']) {
  router.param(paramName, (req, res, next, value) => {
    if (!UUID_RE.test(value)) {
      return res.status(400).json({ success: false, error: `Invalid ${paramName} format` });
    }
    next();
  });
}

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
      limit, offset, userId, action, tableName, departmentId, startDate, endDate,
      churchId: req.user.church_id
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

    const result = await auditLogRepository.getAuditLogById(id, req.user.church_id);

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
      const deptCheck = await auditLogRepository.checkDepartmentHead(departmentId, userId, req.user.church_id);
      const adminCheck = await auditLogRepository.checkDepartmentAdmin(departmentId, userId, req.user.church_id);

      if (!deptCheck && !adminCheck) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    const result = await auditLogRepository.getDepartmentAuditLogs(departmentId, req.user.church_id, limit, offset);

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
