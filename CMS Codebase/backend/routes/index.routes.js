const express = require('express');
const router = express.Router();

const {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  uploadLimiter,
  generalLimiter,
  strictLimiter
} = require('../middleware/rateLimiter');

// Import all route modules
const health = require('./health');
const authRoutes = require('./auth.routes');
const churchRoutes = require('./church.routes');
const usersRoutes = require('./users.routes');
const userSettingsRoutes = require('./userSettings.routes');
const announcementsRoutes = require('./announcements.routes');
const departmentsRoutes = require('./departments.routes');
const departmentRoutes = require('./department.routes');
const departmentFeaturesRoutes = require('./departmentFeatures.routes');
const departmentCategoriesRoutes = require('./department-categories.routes');
const paymentsRoutes = require('./payments.routes');
const paymentRoutes = require('./payment.routes');
const membersRoutes = require('./members.routes');
const eventsRoutes = require('./events.routes');
const smsRoutes = require('./sms.routes');
const dashboardRoutes = require('./dashboard.routes');
const settingsRoutes = require('./settings.routes');
const galleryRoutes = require('./gallery.routes');
const galleryAlbumsRoutes = require('./galleryAlbums.routes');
const paletteRoutes = require('./palette.routes');
const notificationsRoutes = require('./notifications.routes');
const approvalsRoutes = require('./approvals.routes');
const commentsRoutes = require('./comments.routes');
const fieldPermissionsRoutes = require('./fieldPermissions.routes');
const auditLogsRoutes = require('./audit-logs.routes');
const securityRoutes = require('./security.routes');
const collectionsRoutes = require('./collections.routes');
const reportsRoutes = require('./reports.routes');
const documentsRoutes = require('./documents.routes');
const telegramRoutes = require('./telegram.routes');
const telegramAuthRoutes = require('./telegramAuth.routes');
const contentRoutes = require('./content.routes');
const reconciliationRoutes = require('./reconciliation.routes');
const mpesaRoutes = require('./mpesa.routes');
const manualPaymentRoutes = require('./manualPayment.routes');
const gatewayRoutes = require('./gateway.routes');
const smsHubRoutes = require('./smsHub.routes');
const documentApprovalRoutes = require('./documentApproval.routes');
const analyticsRoutes = require('./analytics.routes');
const aiRoutes = require('./ai.routes');
const chatRoutes = require('./chat.routes');
const syncRoutes = require('./sync.routes');

// Mount routes with appropriate middleware
// Note: route modules apply their own auth (authenticateToken, identityGuard, etc.)
router.use('/health', health);
router.use('/auth', authLimiter, authRoutes);
router.use('/auth/reset-password', passwordResetLimiter, authRoutes);
router.use('/churches', generalLimiter, churchRoutes);
router.use('/users', generalLimiter, usersRoutes);
router.use('/user-settings', generalLimiter, userSettingsRoutes);
router.use('/announcements', generalLimiter, announcementsRoutes);
router.use('/departments', generalLimiter, departmentsRoutes);
router.use('/department', generalLimiter, departmentRoutes);
router.use('/department-features', generalLimiter, departmentFeaturesRoutes);
router.use('/department-categories', generalLimiter, departmentCategoriesRoutes);
router.use('/payments', strictLimiter, paymentsRoutes);
router.use('/payment', strictLimiter, paymentRoutes);
router.use('/members', generalLimiter, membersRoutes);
router.use('/events', generalLimiter, eventsRoutes);
router.use('/sms', strictLimiter, smsRoutes);
router.use('/dashboard', generalLimiter, dashboardRoutes);
router.use('/treasury', strictLimiter, require('../modules/treasury/routes'));
router.use('/settings', generalLimiter, settingsRoutes);
router.use('/gallery', generalLimiter, galleryRoutes);
router.use('/gallery-albums', generalLimiter, galleryAlbumsRoutes);
router.use('/palettes', generalLimiter, paletteRoutes);
router.use('/notifications', generalLimiter, notificationsRoutes);
router.use('/approvals', strictLimiter, approvalsRoutes);
router.use('/comments', generalLimiter, commentsRoutes);
router.use('/field-permissions', generalLimiter, fieldPermissionsRoutes);
router.use('/audit-logs', strictLimiter, auditLogsRoutes);
router.use('/security', strictLimiter, securityRoutes);
router.use('/collections', generalLimiter, collectionsRoutes);
router.use('/reports', generalLimiter, reportsRoutes);
router.use('/documents', uploadLimiter, documentsRoutes);
router.use('/telegram', generalLimiter, telegramRoutes);
router.use('/telegramAuth', generalLimiter, telegramAuthRoutes);
router.use('/content', generalLimiter, contentRoutes);
// router.use('/sda-content', generalLimiter, require('./sdaContent.routes'));
router.use('/reconciliation', strictLimiter, reconciliationRoutes);
router.use('/mpesa', generalLimiter, mpesaRoutes);
router.use('/manual-payments', strictLimiter, manualPaymentRoutes);
router.use('/gateway', generalLimiter, gatewayRoutes);
router.use('/sms-hub', generalLimiter, smsHubRoutes);
router.use('/document-approval', strictLimiter, documentApprovalRoutes);
router.use('/analytics', generalLimiter, analyticsRoutes);
router.use('/ai', strictLimiter, aiRoutes);
router.use('/chat', generalLimiter, chatRoutes);
router.use('/sync', generalLimiter, syncRoutes);

module.exports = router;
