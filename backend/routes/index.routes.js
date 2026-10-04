/**
 * Canonical /api route table — mounts every domain router with its rate limiter + pagination clamp.
 * Legacy singular mounts (/department, /payment) 308-redirect to plural.
 * @exports express.Router
 * @deps routes/*.routes.js, middleware/{rateLimiter,pagination}
 * @known /treasury/dashboard + /treasury/chart-of-accounts mount AFTER two /treasury parents (fallthrough-dependent).
 */
const express = require('express');
const router = express.Router();

const {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  generalLimiter,
  strictLimiter
} = require('../middleware/rateLimiter');
const { clampQueryPagination } = require('../middleware/pagination');

// Import all route modules
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
const telegramChurchRoutes = require('./telegramChurch.routes');
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
const mobileRoutes = require('./mobile.routes');
const platformRoutes = require('./platform.routes');
const smsContactsRoutes = require('./smsContacts.routes');
const smsGroupsRoutes = require('./smsGroups.routes');
const smsAuthRoutes = require('./smsAuth.routes');
const smsSyncRoutes = require('./smsSync.routes');

// Mount routes with appropriate middleware
// Note: route modules apply their own auth (authenticateToken, identityGuard, etc.)
router.use('/auth', authLimiter, authRoutes);
router.use('/churches', generalLimiter, churchRoutes);
router.use('/users', generalLimiter, clampQueryPagination(), usersRoutes);
router.use('/user-settings', generalLimiter, userSettingsRoutes);
router.use('/announcements', generalLimiter, clampQueryPagination(), announcementsRoutes);
// 11.2: church-side end of the platform <-> church admin thread
router.use('/platform-messages', generalLimiter, require('./platformMessages.routes'));
// Canonical mount: every department endpoint lives under /api/departments.
// department.routes.js is mounted first so its member-scoped paths win before
// the generic /:identifier routes in departments.routes.js.
router.use('/departments', generalLimiter, clampQueryPagination(), departmentRoutes);
router.use('/departments', generalLimiter, clampQueryPagination(), departmentsRoutes);
router.use('/departments', generalLimiter, require('./department_community.routes'));
router.use('/departments', generalLimiter, require('./department_leadership.routes').router);
router.use('/departments', generalLimiter, require('./department_finance.routes'));
router.use('/department', generalLimiter, (req, res) => {
  const suffix = req.originalUrl.slice(req.baseUrl.length);
  res.redirect(308, `${req.baseUrl.replace(/\/department$/, '/departments')}${suffix}`);
});
router.use('/department-features', generalLimiter, departmentFeaturesRoutes);
router.use('/department-categories', generalLimiter, departmentCategoriesRoutes);
router.use('/apk', generalLimiter, require('./apk.routes'));
router.use('/payments', strictLimiter, paymentsRoutes);
// Legacy singular mount keeps old clients working while every handler is
// served from payments.routes.js.
router.use('/payment', strictLimiter, (req, res) => {
  const suffix = req.originalUrl.slice(req.baseUrl.length);
  res.redirect(308, `${req.baseUrl.replace(/\/payment$/, '/payments')}${suffix}`);
});
router.use('/members', generalLimiter, clampQueryPagination(), membersRoutes);
router.use('/events', generalLimiter, clampQueryPagination(), eventsRoutes);
router.use('/sms', strictLimiter, smsRoutes);
router.use('/dashboard', generalLimiter, dashboardRoutes);
// Specific /treasury sub-mounts first — they must not depend on the parent
// routers falling through.
router.use('/treasury/dashboard', strictLimiter, require('./treasuryDashboard.routes'));
router.use('/treasury/chart-of-accounts', strictLimiter, require('./chartOfAccounts.routes'));
router.use('/treasury', strictLimiter, require('../modules/treasury/routes'));
// Legacy treasury surface — catches the endpoints the module routes do not cover
// (transactions, vendors, recurring-payments, pledges, projects, fixed-assets,
// bank-reconciliations, reports, receipts, contributions, exports, campaigns).
router.use('/treasury', strictLimiter, require('./treasury.routes'));
// Frontend calls /api/projects/:id/{milestones,contributions,analytics,status}
router.use('/projects', strictLimiter, require('./projects.routes'));
router.use('/settings', generalLimiter, settingsRoutes);
router.use('/gallery', generalLimiter, galleryRoutes);
router.use('/gallery-albums', generalLimiter, galleryAlbumsRoutes);
router.use('/palettes', generalLimiter, paletteRoutes);
router.use('/notifications', generalLimiter, notificationsRoutes);
router.use('/approvals', strictLimiter, approvalsRoutes);
router.use('/comments', generalLimiter, commentsRoutes);
router.use('/field-permissions', generalLimiter, fieldPermissionsRoutes);
router.use('/audit-logs', strictLimiter, clampQueryPagination(), auditLogsRoutes);
router.use('/logs', strictLimiter, require('./logs.routes'));
router.use('/security', strictLimiter, securityRoutes);
router.use('/collections', generalLimiter, collectionsRoutes);
router.use('/reports', generalLimiter, reportsRoutes);
router.use('/documents', uploadLimiter, clampQueryPagination(), documentsRoutes);
router.use('/telegram', generalLimiter, telegramRoutes);
router.use('/telegramAuth', generalLimiter, telegramAuthRoutes);
router.use('/telegram-church', generalLimiter, telegramChurchRoutes);
router.use('/content', generalLimiter, clampQueryPagination(), contentRoutes);
// router.use('/sda-content', generalLimiter, require('./sdaContent.routes'));
router.use('/reconciliation', strictLimiter, reconciliationRoutes);
router.use('/mpesa', generalLimiter, clampQueryPagination(), mpesaRoutes);
router.use('/manual-payments', strictLimiter, manualPaymentRoutes);
router.use('/gateway', generalLimiter, gatewayRoutes);
router.use('/sms-hub', generalLimiter, smsHubRoutes);
router.use('/document-approval', strictLimiter, documentApprovalRoutes);
router.use('/analytics', generalLimiter, analyticsRoutes);
router.use('/ai', strictLimiter, aiRoutes);
router.use('/chat', generalLimiter, clampQueryPagination(), chatRoutes);
router.use('/sync', strictLimiter, syncRoutes);
router.use('/mobile', generalLimiter, mobileRoutes);
router.use('/platform', strictLimiter, platformRoutes);
router.use('/sms-contacts', generalLimiter, smsContactsRoutes);
router.use('/sms-groups', generalLimiter, smsGroupsRoutes);
router.use('/sms/auth', authLimiter, smsAuthRoutes);
router.use('/sms/sync', generalLimiter, smsSyncRoutes);

module.exports = router;
