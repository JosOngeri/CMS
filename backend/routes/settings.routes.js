const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');

const settingValidation = [
  body('key').trim().notEmpty().withMessage('Key is required'),
  body('value').notEmpty().withMessage('Value is required'),
  body('value_type').isIn(['string', 'number', 'boolean', 'json', 'color']).withMessage('Invalid value type'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('label').trim().notEmpty().withMessage('Label is required')
];

// Public routes
router.get('/public', settingsController.getPublicSettings);

// Admin routes
router.get('/', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), settingsController.getAllSettings);
router.put('/', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res, next) => {
  // Frontend may send a flat object of settings; convert to the array the controller expects
  if (!req.body.settings && typeof req.body === 'object') {
    req.body = { settings: Object.entries(req.body).map(([key, value]) => ({ key, value })) };
  }
  next();
}, settingsController.updateMultipleSettings);
router.get('/export/data', authenticateToken, requireRole(['Super Admin']), settingsController.exportSettings);
router.get('/history/audit', authenticateToken, requireRole(['Super Admin']), settingsController.getSettingsHistory);
router.get('/:key', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), settingsController.getSettingByKey);
router.post('/', authenticateToken, requireRole(['Super Admin']), settingValidation, settingsController.createSetting);
router.post('/import/data', authenticateToken, requireRole(['Super Admin']), settingsController.importSettings);
router.post('/reset', authenticateToken, requireRole(['Super Admin']), settingsController.resetToDefaults);
router.put('/bulk', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), settingsController.updateMultipleSettings);
router.put('/:key', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), settingsController.updateSetting);
router.delete('/:key', authenticateToken, requireRole(['Super Admin']), settingsController.deleteSetting);

// System health and maintenance
router.get('/system/health', authenticateToken, requireRole(['Super Admin']), settingsController.getSystemHealth);
router.post('/backup/create', authenticateToken, requireRole(['Super Admin']), settingsController.createBackup);
router.get('/backup/logs', authenticateToken, requireRole(['Super Admin']), settingsController.getBackupLogs);
router.post('/maintenance/mode', authenticateToken, requireRole(['Super Admin']), settingsController.setMaintenanceMode);
router.get('/maintenance/mode', settingsController.getMaintenanceMode);
router.post('/maintenance/schedule', authenticateToken, requireRole(['Super Admin']), settingsController.scheduleMaintenance);
router.get('/maintenance/schedules', authenticateToken, requireRole(['Super Admin']), settingsController.getMaintenanceSchedules);

module.exports = router;
