const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platform.controller');
const platformAuthController = require('../controllers/platformAuth.controller');
const platformTenancyController = require('../controllers/platformTenancy.controller');
const platformOpsController = require('../controllers/platformOps.controller');
const platformBusinessController = require('../controllers/platformBusiness.controller');
const { authenticatePlatformUser, requirePlatformPermission } = require('../middleware/platformAuth');
const { platformAuthLimiter } = require('../middleware/rateLimiter');

router.post('/auth/login', platformAuthLimiter, platformAuthController.login);
// 11.3 public status page — deliberately unauthenticated; exposes only
// component health + incident titles, never internals.
router.get('/status', platformOpsController.getPublicStatus);
router.get('/auth/me', authenticatePlatformUser, platformAuthController.getCurrentUser);
router.post('/auth/logout', authenticatePlatformUser, platformAuthController.logout);

// 3.3 Session management — self-service list/revoke; the /all view is
// permission-gated for the security console.
router.get('/auth/sessions', authenticatePlatformUser, platformAuthController.listMySessions);
router.get('/auth/sessions/all', authenticatePlatformUser, requirePlatformPermission('security:read'), platformAuthController.listAllSessions);
router.post('/auth/sessions/:id/revoke', authenticatePlatformUser, platformAuthController.revokeSession);
router.post('/auth/users/:userId/revoke-sessions', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformAuthController.revokeUserSessions);

// 3.4 MFA — setup is allowed even while mfa_pending (middleware allowlists
// these two paths); disable requires a live code.
router.post('/auth/mfa/setup', authenticatePlatformUser, platformAuthController.mfaSetup);
router.post('/auth/mfa/enable', authenticatePlatformUser, platformAuthController.mfaEnable);
router.post('/auth/mfa/disable', authenticatePlatformUser, platformAuthController.mfaDisable);

router.get('/stats', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformController.getPlatformStats);
router.get('/health', authenticatePlatformUser, requirePlatformPermission('health:read'), platformController.getPlatformHealth);
router.get('/activity', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getPlatformActivity);

router.get('/audit-logs', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getAuditLogs);
router.get('/audit-logs/actions', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getAuditActions);
router.get('/audit-logs/forensics', authenticatePlatformUser, requirePlatformPermission('audit:read'), platformController.getAuditForensics);
router.get('/audit-logs/export', authenticatePlatformUser, requirePlatformPermission('audit:export'), platformController.exportAuditLogs);

router.get('/settings', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformController.getSettings);
router.put('/settings', authenticatePlatformUser, requirePlatformPermission('settings:manage'), platformController.updateSettings);
// Global defaults + platform-managed keys of the church-facing `settings`
// table (provider creds, SaaS switches). Secrets masked on read.
router.get('/settings/catalog', authenticatePlatformUser, requirePlatformPermission('settings:read'), platformTenancyController.getSettingsCatalog);
router.put('/settings/catalog', authenticatePlatformUser, requirePlatformPermission('settings:manage'), platformTenancyController.updateSettingsCatalog);

// Platform staff accounts — gated by staff:manage, which today only the
// owner wildcard grants (see constants/platformPermissions.js).
router.get('/users', authenticatePlatformUser, requirePlatformPermission('staff:manage'), platformController.listPlatformUsers);
// 3.2: role catalog drives the assignment UI (register before /users/:id)
router.get('/users/roles/catalog', authenticatePlatformUser, requirePlatformPermission('staff:manage'), platformController.listPlatformRoles);
router.post('/users', authenticatePlatformUser, requirePlatformPermission('staff:manage'), platformController.createPlatformUser);
router.patch('/users/:id', authenticatePlatformUser, requirePlatformPermission('staff:manage'), platformController.updatePlatformUser);
router.post('/users/:id/reset-password', authenticatePlatformUser, requirePlatformPermission('staff:manage'), platformController.resetPlatformUserPassword);

router.get('/tenants', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getAllTenants);
router.post('/tenants', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.createTenant);
router.put('/tenants/:id', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.updateTenant);
router.post('/tenants/:id/archive', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.archiveTenant);
// 1.5 Offboarding lifecycle — offboard starts retention clock, purge is
// owner-only (data:export) and locked until the retention deadline passes.
router.post('/tenants/:id/offboard', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.offboardTenant);
router.post('/tenants/:id/purge', authenticatePlatformUser, requirePlatformPermission('data:export'), platformTenancyController.purgeTenant);
// 7.6 demo-data lifecycle
router.patch('/tenants/:id/demo', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.setTenantDemo);
// 6.8: per-tenant rate-limit overrides + 1.4: tenant templates
router.get('/tenants/:id/rate-limit', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantRateLimit);
router.put('/tenants/:id/rate-limit', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.setTenantRateLimit);
router.delete('/tenants/:id/rate-limit', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.deleteTenantRateLimit);
router.get('/tenant-templates', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.listTemplates);
router.post('/tenant-templates', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.createTemplate);
router.post('/tenants/:id/apply-template', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.applyTemplate);
// 11.2: platform <-> church admin messaging thread
router.get('/tenants/:id/messages', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantMessages);
router.post('/tenants/:id/messages', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.sendTenantMessage);
// 7.3: member CSV import wizard (rows normalized client-side)
router.post('/tenants/:id/members/import', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.importTenantMembers);
router.post('/tenants/purge-demos', authenticatePlatformUser, requirePlatformPermission('data:export'), platformTenancyController.purgeDemoTenants);
router.get('/tenants/:id', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantById);
router.get('/tenants/:id/stats', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantStats);
router.get('/tenants/:id/activity', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformController.getTenantActivity);
router.post('/tenants/:id/suspend', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.suspendTenant);
router.post('/tenants/:id/activate', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformController.activateTenant);

// ── §2 Tenant Administration ────────────────────────────────────────────
router.get('/tenants/:id/users', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantUsers);
router.post('/tenants/:id/reset-admin', authenticatePlatformUser, requirePlatformPermission('tenant:administer'), platformTenancyController.resetTenantAdmin);
router.post('/tenants/:id/impersonate', authenticatePlatformUser, requirePlatformPermission('tenant:impersonate'), platformTenancyController.impersonateTenant);
router.post('/impersonate/end', authenticatePlatformUser, requirePlatformPermission('tenant:impersonate'), platformTenancyController.endImpersonationSession);
router.get('/impersonations', authenticatePlatformUser, requirePlatformPermission('security:read'), platformTenancyController.getImpersonations);
router.get('/tenants/:id/flags', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantFlags);
router.put('/tenants/:id/flags', authenticatePlatformUser, requirePlatformPermission('flags:manage'), platformTenancyController.setTenantFlag);
router.get('/tenants/:id/quotas', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantQuotas);
router.put('/tenants/:id/quotas', authenticatePlatformUser, requirePlatformPermission('tenant:administer'), platformTenancyController.setTenantQuotas);
router.put('/tenants/:id/onboarding', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.updateTenantOnboarding);
router.post('/tenants/:id/trial', authenticatePlatformUser, requirePlatformPermission('tenant:manage'), platformTenancyController.updateTenantTrial);
// 6.4 tenant session oversight
router.get('/tenants/:id/sessions', authenticatePlatformUser, requirePlatformPermission('security:read'), platformTenancyController.getTenantSessions);
router.post('/tenants/:id/users/:userId/revoke-sessions', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformTenancyController.revokeTenantUserSessions);
// 10.5 per-tenant benchmarks vs the fleet
router.get('/tenants/:id/benchmarks', authenticatePlatformUser, requirePlatformPermission('metrics:read'), platformBusinessController.getTenantBenchmarks);
router.post('/tenants/:id/quarantine', authenticatePlatformUser, requirePlatformPermission('incidents:manage'), platformTenancyController.setTenantQuarantine);

// ── §4 Monitoring & Health ──────────────────────────────────────────────
router.get('/fleet', authenticatePlatformUser, requirePlatformPermission('health:read'), platformOpsController.getFleet);
// 4.7: log explorer over platform_app_logs (read is the lightest gate in this area)
router.get('/logs', authenticatePlatformUser, requirePlatformPermission('health:read'), platformOpsController.getAppLogs);
router.get('/jobs', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.getJobs);
router.post('/jobs/:id/retry', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.retryJob);
router.get('/alerts', authenticatePlatformUser, requirePlatformPermission('health:read'), platformOpsController.getAlerts);
router.post('/alerts/:id/resolve', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.resolveAlert);
router.post('/alerts/evaluate', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.evaluateAlerts);
router.get('/integrations', authenticatePlatformUser, requirePlatformPermission('health:read'), platformOpsController.getIntegrations);
router.get('/alert-rules', authenticatePlatformUser, requirePlatformPermission('health:read'), platformOpsController.getAlertRules);
router.post('/alert-rules', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.createAlertRule);
router.patch('/alert-rules/:id', authenticatePlatformUser, requirePlatformPermission('monitoring:manage'), platformOpsController.updateAlertRule);

// ── §5 Payments & Oversight ─────────────────────────────────────────────
router.get('/payments', authenticatePlatformUser, requirePlatformPermission('payments:read'), platformOpsController.getPaymentFeed);
router.get('/payments/stuck', authenticatePlatformUser, requirePlatformPermission('payments:read'), platformOpsController.getStuckPayments);
router.post('/payments/:id/reconcile', authenticatePlatformUser, requirePlatformPermission('payments:manage'), platformOpsController.reconcilePayment);
// 5.4 refund oversight + 5.5 per-tenant SMS ledger
router.get('/payments/refunds', authenticatePlatformUser, requirePlatformPermission('payments:read'), platformOpsController.getRefunds);
router.post('/payments/refunds/:id/decision', authenticatePlatformUser, requirePlatformPermission('payments:manage'), platformOpsController.decideRefund);
// 5.3: M-Pesa statement import + auto-matching (parsed client-side)
router.post('/payments/reconcile-statement', authenticatePlatformUser, requirePlatformPermission('payments:manage'), platformOpsController.reconcileStatement);
router.get('/sms-ledger', authenticatePlatformUser, requirePlatformPermission('payments:read'), platformOpsController.getSmsLedger);

// ── §6 Security & Compliance ────────────────────────────────────────────
router.get('/security', authenticatePlatformUser, requirePlatformPermission('security:read'), platformOpsController.getSecurityCenter);
router.post('/security/ip-rules', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformOpsController.createIpRule);
router.delete('/security/ip-rules/:id', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformOpsController.deleteIpRule);
router.post('/security/unlock', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformOpsController.unlockTenantUser);
router.get('/security/permission-audit', authenticatePlatformUser, requirePlatformPermission('security:read'), platformOpsController.getPermissionAudit);
router.get('/security/data-requests', authenticatePlatformUser, requirePlatformPermission('security:read'), platformOpsController.getDataRequests);
router.post('/security/data-requests', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.createDataRequest);
router.patch('/security/data-requests/:id', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.updateDataRequest);
router.get('/security/credentials', authenticatePlatformUser, requirePlatformPermission('security:read'), platformOpsController.getCredentialRotations);
router.post('/security/credentials', authenticatePlatformUser, requirePlatformPermission('security:manage'), platformOpsController.markCredentialRotated);

// ── §7 Data Management ──────────────────────────────────────────────────
router.get('/data/backups', authenticatePlatformUser, requirePlatformPermission('data:read'), platformOpsController.getBackups);
router.post('/data/backups', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.recordBackup);
router.post('/data/backups/run', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.runBackup);
router.post('/data/backups/:id/verify', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.verifyBackup);
router.post('/data/backups/:id/restore-staging', authenticatePlatformUser, requirePlatformPermission('data:manage'), platformOpsController.restoreBackupToStaging);
router.get('/tenants/:id/export', authenticatePlatformUser, requirePlatformPermission('data:export'), platformOpsController.exportTenant);
router.get('/data/storage', authenticatePlatformUser, requirePlatformPermission('data:read'), platformOpsController.getTenantStorage);
router.get('/data/schema', authenticatePlatformUser, requirePlatformPermission('data:read'), platformOpsController.getSchemaVersion);

// ── §8 Disaster & Incident ──────────────────────────────────────────────
router.get('/incidents', authenticatePlatformUser, requirePlatformPermission('incidents:read'), platformOpsController.getIncidents);
router.post('/incidents', authenticatePlatformUser, requirePlatformPermission('incidents:manage'), platformOpsController.createIncident);
router.patch('/incidents/:id', authenticatePlatformUser, requirePlatformPermission('incidents:manage'), platformOpsController.updateIncident);

// ── §9 Billing & Revenue ────────────────────────────────────────────────
router.get('/billing/plans', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.getPlans);
router.post('/billing/plans', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.createPlan);
router.patch('/billing/plans/:id', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.updatePlan);
router.get('/billing/subscriptions', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.getSubscriptions);
router.put('/billing/subscriptions/:churchId', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.updateSubscription);
router.get('/billing/invoices', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.getInvoices);
router.post('/billing/invoices', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.createInvoice);
router.post('/billing/invoices/:id/status', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.updateInvoiceStatus);
// 9.4 credit notes + printable invoice
router.post('/billing/invoices/:id/credit', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.creditInvoice);
router.get('/billing/invoices/:id/print', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.printInvoice);
router.get('/billing/revenue', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.getRevenueReport);
router.get('/billing/dunning', authenticatePlatformUser, requirePlatformPermission('billing:read'), platformBusinessController.getDunningPreview);
router.post('/billing/dunning/run', authenticatePlatformUser, requirePlatformPermission('billing:manage'), platformBusinessController.runDunning);

// ── §10 Analytics & Reporting ───────────────────────────────────────────
router.get('/analytics/growth', authenticatePlatformUser, requirePlatformPermission('metrics:read'), platformBusinessController.getGrowthMetrics);
router.get('/analytics/usage', authenticatePlatformUser, requirePlatformPermission('metrics:read'), platformBusinessController.getUsageReport);
router.get('/analytics/adoption', authenticatePlatformUser, requirePlatformPermission('metrics:read'), platformBusinessController.getAdoptionReport);
router.get('/analytics/export.csv', authenticatePlatformUser, requirePlatformPermission('metrics:read'), platformBusinessController.exportMetricsCsv);

// ── §11 Communication ───────────────────────────────────────────────────
router.get('/announcements', authenticatePlatformUser, requirePlatformPermission('communication:manage'), platformBusinessController.getAnnouncements);
router.post('/announcements', authenticatePlatformUser, requirePlatformPermission('communication:manage'), platformBusinessController.createAnnouncement);
router.patch('/announcements/:id', authenticatePlatformUser, requirePlatformPermission('communication:manage'), platformBusinessController.updateAnnouncement);
// 11.4 message templates (welcome, dunning, security notices)
router.get('/communication/templates', authenticatePlatformUser, requirePlatformPermission('communication:manage'), platformBusinessController.getMessageTemplates);
router.put('/communication/templates/:key', authenticatePlatformUser, requirePlatformPermission('communication:manage'), platformBusinessController.upsertMessageTemplate);

// ── §12 Support Operations ──────────────────────────────────────────────
router.get('/support/tickets', authenticatePlatformUser, requirePlatformPermission('support:read'), platformBusinessController.getTickets);
router.post('/support/tickets', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.createTicket);
router.patch('/support/tickets/:id', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.updateTicket);
router.get('/support/tickets/:id/messages', authenticatePlatformUser, requirePlatformPermission('support:read'), platformBusinessController.getTicketMessages);
router.post('/support/tickets/:id/messages', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.addTicketMessage);
// 12.2 time-boxed support access grants (ticket-linked impersonation)
router.get('/support/access', authenticatePlatformUser, requirePlatformPermission('support:read'), platformBusinessController.listSupportAccess);
router.post('/support/tickets/:id/grant-access', authenticatePlatformUser, requirePlatformPermission('tenant:impersonate'), platformBusinessController.grantSupportAccess);
router.post('/support/access/:id/revoke', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.revokeSupportAccess);
router.get('/support/known-issues', authenticatePlatformUser, requirePlatformPermission('support:read'), platformBusinessController.getKnownIssues);
router.post('/support/known-issues', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.createKnownIssue);
router.patch('/support/known-issues/:id', authenticatePlatformUser, requirePlatformPermission('support:manage'), platformBusinessController.updateKnownIssue);
router.get('/support/health-scores', authenticatePlatformUser, requirePlatformPermission('support:read'), platformBusinessController.getHealthScores);

// ── §13 Platform Configuration ──────────────────────────────────────────
router.get('/flags', authenticatePlatformUser, requirePlatformPermission('flags:manage'), platformBusinessController.getPlatformFlags);
router.put('/flags', authenticatePlatformUser, requirePlatformPermission('flags:manage'), platformBusinessController.setPlatformFlag);
router.get('/version', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformBusinessController.getVersion);
router.get('/deploys', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformBusinessController.getDeploys);
router.get('/integrations/config', authenticatePlatformUser, requirePlatformPermission('settings:manage'), platformBusinessController.getIntegrationConfig);
router.get('/maintenance', authenticatePlatformUser, requirePlatformPermission('platform:read'), platformBusinessController.getMaintenance);
router.put('/maintenance', authenticatePlatformUser, requirePlatformPermission('flags:manage'), platformBusinessController.setMaintenance);

// ── §2.5 Config override ────────────────────────────────────────────────
router.put('/tenants/:id/settings', authenticatePlatformUser, requirePlatformPermission('tenant:administer'), platformTenancyController.updateTenantSettings);
// Church settings catalog — resolved per-church view of the `settings`
// table: effective value, override vs inherited, masked secrets.
// :key is the setting name (e.g. site_name), DELETE reverts to global.
router.get('/tenants/:id/settings/catalog', authenticatePlatformUser, requirePlatformPermission('tenant:read'), platformTenancyController.getTenantSettingsCatalog);
router.put('/tenants/:id/settings/catalog', authenticatePlatformUser, requirePlatformPermission('tenant:administer'), platformTenancyController.updateTenantSettingsCatalog);
router.delete('/tenants/:id/settings/catalog/:key', authenticatePlatformUser, requirePlatformPermission('tenant:administer'), platformTenancyController.deleteTenantSetting);

module.exports = router;