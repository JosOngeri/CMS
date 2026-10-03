const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platform.controller');
const platformAuthController = require('../controllers/platformAuth.controller');
const { authenticatePlatformUser, requirePlatformRole, requirePlatformPermission } = require('../middleware/platformAuth');
const { platformAuthLimiter } = require('../middleware/rateLimiter');

router.post('/auth/login', platformAuthLimiter, platformAuthController.login);
router.get('/auth/me', authenticatePlatformUser, platformAuthController.getCurrentUser);
router.post('/auth/logout', authenticatePlatformUser, platformAuthController.logout);

router.get('/stats', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformController.getPlatformStats);
router.get('/health', authenticatePlatformUser, requirePlatformPermission('health:read'), platformController.getPlatformHealth);
router.get('/activity', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getPlatformActivity);

router.get('/audit-logs', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getAuditLogs);
router.get('/audit-logs/actions', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getAuditActions);

router.get('/settings', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformController.getSettings);
router.put('/settings', authenticatePlatformUser, requirePlatformPermission('settings:manage'), platformController.updateSettings);

// Platform staff accounts — owner-only; admins manage tenants, not peers.
router.get('/users', authenticatePlatformUser, requirePlatformRole(['platform_owner']), platformController.listPlatformUsers);
router.post('/users', authenticatePlatformUser, requirePlatformRole(['platform_owner']), platformController.createPlatformUser);
router.patch('/users/:id', authenticatePlatformUser, requirePlatformRole(['platform_owner']), platformController.updatePlatformUser);
router.post('/users/:id/reset-password', authenticatePlatformUser, requirePlatformRole(['platform_owner']), platformController.resetPlatformUserPassword);

router.get('/tenants', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getAllTenants);
router.post('/tenants', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.createTenant);
router.put('/tenants/:id', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.updateTenant);
router.post('/tenants/:id/archive', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.archiveTenant);
router.get('/tenants/:id', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantById);
router.get('/tenants/:id/stats', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantStats);
router.get('/tenants/:id/activity', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantActivity);
router.post('/tenants/:id/suspend', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.suspendTenant);
router.post('/tenants/:id/activate', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.activateTenant);

module.exports = router;