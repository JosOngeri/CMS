# Database Tables vs API Routes Validation

**Generated:** 2026-06-20

This document validates that database tables referenced in code have corresponding API endpoints.

---

## Database Tables Found in Code

| Table Name | Referenced In |
|------------|--------------|
| `accessibility` | 1 file(s) |
| `accessibility_settings` | 1 file(s) |
| `accounts` | 5 file(s) |
| `activity_feed` | 1 file(s) |
| `activity_log` | 1 file(s) |
| `announcements` | 7 file(s) |
| `api_logs` | 1 file(s) |
| `approval_history` | 2 file(s) |
| `approval_requests` | 9 file(s) |
| `approval_workflows` | 2 file(s) |
| `audit_log` | 4 file(s) |
| `auth_audit_log` | 2 file(s) |
| `blocked_ips` | 1 file(s) |
| `budget_items` | 1 file(s) |
| `budgets` | 3 file(s) |
| `church_accounts` | 1 file(s) |
| `collection_contributions` | 1 file(s) |
| `color_palette_colors` | 1 file(s) |
| `color_palettes` | 1 file(s) |
| `comments` | 1 file(s) |
| `content_categories` | 1 file(s) |
| `content_item_tags` | 1 file(s) |
| `content_items` | 3 file(s) |
| `content_revisions` | 1 file(s) |
| `content_tags` | 1 file(s) |
| `department_categories` | 1 file(s) |
| `department_communications` | 3 file(s) |
| `department_component_allocations` | 1 file(s) |
| `department_components` | 1 file(s) |
| `department_meeting_attendees` | 1 file(s) |
| `department_meetings` | 6 file(s) |
| `department_members` | 12 file(s) |
| `department_permissions` | 1 file(s) |
| `department_reports` | 1 file(s) |
| `department_resources` | 5 file(s) |
| `department_tasks` | 6 file(s) |
| `departments` | 16 file(s) |
| `documents` | 2 file(s) |
| `event_attendance` | 1 file(s) |
| `event_collections` | 1 file(s) |
| `event_registrations` | 2 file(s) |
| `events` | 8 file(s) |
| `expense_categories` | 1 file(s) |
| `expenses` | 3 file(s) |
| `failed_login_attempts` | 1 file(s) |
| `field_permissions` | 1 file(s) |
| `fixed_assets` | 1 file(s) |
| `funds` | 3 file(s) |
| `gallery_albums` | 2 file(s) |
| `gallery_comments` | 1 file(s) |
| `gallery_photo_tags` | 1 file(s) |
| `gallery_photos` | 2 file(s) |
| `gallery_tags` | 1 file(s) |
| `income_categories` | 2 file(s) |
| `information_schema` | 2 file(s) |
| `journal_entries` | 3 file(s) |
| `journal_entry_lines` | 3 file(s) |
| `login_attempts` | 1 file(s) |
| `member_attendance` | 3 file(s) |
| `member_contacts` | 1 file(s) |
| `member_group_memberships` | 1 file(s) |
| `member_groups` | 1 file(s) |
| `members` | 5 file(s) |
| `notification_preferences` | 1 file(s) |
| `notification_types` | 1 file(s) |
| `notifications` | 5 file(s) |
| `password_reset_tokens` | 1 file(s) |
| `payment_categories` | 2 file(s) |
| `payment_items` | 2 file(s) |
| `payment_methods` | 1 file(s) |
| `payments` | 10 file(s) |
| `permissions` | 2 file(s) |
| `personal_collections` | 1 file(s) |
| `pledge_campaigns` | 1 file(s) |
| `pledge_payments` | 1 file(s) |
| `pledges` | 2 file(s) |
| `projects` | 2 file(s) |
| `recurring_payments` | 1 file(s) |
| `refresh_tokens` | 2 file(s) |
| `report_executions` | 2 file(s) |
| `role_permissions` | 2 file(s) |
| `roles` | 6 file(s) |
| `saved_reports` | 1 file(s) |
| `saved_searches` | 1 file(s) |
| `scheduled_reports` | 2 file(s) |
| `security_logs` | 1 file(s) |
| `security_settings` | 1 file(s) |
| `selected_palette` | 1 file(s) |
| `seo_settings` | 1 file(s) |
| `setting` | 1 file(s) |
| `settings_audit_log` | 1 file(s) |
| `sms_ab_tests` | 1 file(s) |
| `sms_campaigns` | 1 file(s) |
| `sms_logs` | 2 file(s) |
| `sms_providers` | 1 file(s) |
| `sms_template_versions` | 1 file(s) |
| `sms_templates` | 1 file(s) |
| `system_logs` | 1 file(s) |
| `telegram_channel_media` | 1 file(s) |
| `telegram_channel_posts` | 2 file(s) |
| `telegram_channels` | 2 file(s) |
| `telegram_photos_cache` | 3 file(s) |
| `telegram_settings` | 2 file(s) |
| `test_results` | 1 file(s) |
| `ticket_types` | 1 file(s) |
| `transactions` | 5 file(s) |
| `user_preferences` | 1 file(s) |
| `user_roles` | 6 file(s) |
| `user_sessions` | 1 file(s) |
| `users` | 33 file(s) |
| `vendors` | 2 file(s) |
| `website_settings` | 1 file(s) |
| `workflow_assignments` | 1 file(s) |
| `your` | 1 file(s) |

**Total Tables:** 114

---

## API Routes Found

| Method | Path | File |
|--------|------|------|
| GET | `/settings` | routes\accessibility.routes.js |
| PUT | `/settings` | routes\accessibility.routes.js |
| POST | `/audit` | routes\accessibility.routes.js |
| GET | `/dashboard` | routes\analytics.routes.js |
| GET | `/member-growth` | routes\analytics.routes.js |
| GET | `/financial-trends` | routes\analytics.routes.js |
| GET | `/department-activity` | routes\analytics.routes.js |
| GET | `/attendance-trends` | routes\analytics.routes.js |
| GET | `/public` | routes\announcements.routes.js |
| GET | `/public/:id` | routes\announcements.routes.js |
| GET | `/` | routes\announcements.routes.js |
| GET | `/:id` | routes\announcements.routes.js |
| POST | `/` | routes\announcements.routes.js |
| PUT | `/:id` | routes\announcements.routes.js |
| DELETE | `/:id` | routes\announcements.routes.js |
| GET | `/workflows` | routes\approvals.routes.js |
| POST | `/workflows` | routes\approvals.routes.js |
| GET | `/analytics` | routes\approvals.routes.js |
| GET | `/pending-count` | routes\approvals.routes.js |
| POST | `/execute` | routes\approvals.routes.js |
| GET | `/` | routes\approvals.routes.js |
| GET | `/:id` | routes\approvals.routes.js |
| PUT | `/:id/approve` | routes\approvals.routes.js |
| PUT | `/:id/reject` | routes\approvals.routes.js |
| PUT | `/:id/delegate` | routes\approvals.routes.js |
| PUT | `/:approvalId/step` | routes\approvals.routes.js |
| GET | `/:approvalId/status` | routes\approvals.routes.js |
| GET | `/` | routes\audit-logs.routes.js |
| GET | `/:id` | routes\audit-logs.routes.js |
| GET | `/department/:departmentId` | routes\audit-logs.routes.js |
| POST | `/register` | routes\auth.routes.js |
| POST | `/login` | routes\auth.routes.js |
| POST | `/refresh-token` | routes\auth.routes.js |
| POST | `/logout` | routes\auth.routes.js |
| GET | `/profile` | routes\auth.routes.js |
| PUT | `/profile` | routes\auth.routes.js |
| PUT | `/password` | routes\auth.routes.js |
| GET | `/sessions` | routes\auth.routes.js |
| DELETE | `/sessions/:sessionId` | routes\auth.routes.js |
| DELETE | `/sessions` | routes\auth.routes.js |
| POST | `/mfa/enable` | routes\auth.routes.js |
| POST | `/mfa/verify` | routes\auth.routes.js |
| POST | `/mfa/disable` | routes\auth.routes.js |
| GET | `/audit-log` | routes\auth.routes.js |
| POST | `/forgot-password` | routes\auth.routes.js |
| POST | `/reset-password` | routes\auth.routes.js |
| POST | `/verify-email` | routes\auth.routes.js |
| GET | `/my-collections` | routes\collections.routes.js |
| GET | `/my-statement` | routes\collections.routes.js |
| POST | `/` | routes\collections.routes.js |
| POST | `/event` | routes\collections.routes.js |
| GET | `/:id` | routes\collections.routes.js |
| PUT | `/:id` | routes\collections.routes.js |
| PUT | `/:id/status` | routes\collections.routes.js |
| POST | `/:id/contributions` | routes\collections.routes.js |
| GET | `/:id/contributions` | routes\collections.routes.js |
| DELETE | `/:id/contributions/:contributionId` | routes\collections.routes.js |
| GET | `/:entityType/:entityId` | routes\comments.routes.js |
| POST | `/:entityType/:entityId` | routes\comments.routes.js |
| PUT | `/:commentId` | routes\comments.routes.js |
| DELETE | `/:commentId` | routes\comments.routes.js |
| GET | `/public/:slug` | routes\content.routes.js |
| GET | `/website-settings` | routes\content.routes.js |
| GET | `/categories-list` | routes\content.routes.js |
| GET | `/tags-list` | routes\content.routes.js |
| GET | `/` | routes\content.routes.js |
| POST | `/` | routes\content.routes.js |
| GET | `/:id` | routes\content.routes.js |
| PUT | `/:id` | routes\content.routes.js |
| DELETE | `/:id` | routes\content.routes.js |
| POST | `/:id/publish` | routes\content.routes.js |
| GET | `/:id/revisions` | routes\content.routes.js |
| POST | `/:id/rollback/:revisionId` | routes\content.routes.js |
| PUT | `/website-settings` | routes\content.routes.js |
| GET | `/overview` | routes\dashboard.routes.js |
| GET | `/stats` | routes\dashboard.routes.js |
| GET | `/activity` | routes\dashboard.routes.js |
| GET | `/performance` | routes\dashboard.routes.js |
| GET | `/attendance-trends` | routes\dashboard.routes.js |
| GET | `/financial-overview` | routes\dashboard.routes.js |
| GET | `/member-engagement` | routes\dashboard.routes.js |
| GET | `/system-health` | routes\dashboard.routes.js |
| GET | `/` | routes\department-categories.routes.js |
| GET | `/:id` | routes\department-categories.routes.js |
| POST | `/` | routes\department-categories.routes.js |
| PUT | `/:id` | routes\department-categories.routes.js |
| DELETE | `/:id` | routes\department-categories.routes.js |
| GET | `/user` | routes\department.routes.js |
| GET | `/my-departments` | routes\department.routes.js |
| GET | `/available` | routes\department.routes.js |
| POST | `/join` | routes\department.routes.js |
| DELETE | `/leave/:departmentId` | routes\department.routes.js |
| GET | `/:departmentId/pending-requests` | routes\department.routes.js |
| POST | `/:departmentId/approve/:userId` | routes\department.routes.js |
| POST | `/:departmentId/reject/:userId` | routes\department.routes.js |
| GET | `/:departmentId/dashboard` | routes\department.routes.js |
| GET | `/:departmentId/communications` | routes\department.routes.js |
| GET | `/:departmentId/members` | routes\department.routes.js |
| GET | `/:departmentId/meetings` | routes\department.routes.js |
| GET | `/:departmentId/tasks` | routes\department.routes.js |
| POST | `/:departmentId/tasks` | routes\department.routes.js |
| PUT | `/:departmentId/tasks/:taskId` | routes\department.routes.js |
| DELETE | `/:departmentId/tasks/:taskId` | routes\department.routes.js |
| GET | `/:departmentId/resources` | routes\department.routes.js |
| GET | `/:departmentId/activity-feed` | routes\department.routes.js |
| GET | `/:departmentId/activity-summary` | routes\department.routes.js |
| POST | `/:departmentId/logo` | routes\department.routes.js |
| POST | `/:departmentId/banner` | routes\department.routes.js |
| PUT | `/:departmentId/colors` | routes\department.routes.js |
| GET | `/overview` | routes\departments.routes.js |
| GET | `/` | routes\departments.routes.js |
| GET | `/:identifier` | routes\departments.routes.js |
| GET | `/:identifier/dashboard` | routes\departments.routes.js |
| GET | `/:id/members` | routes\departments.routes.js |
| GET | `/:id/communications` | routes\departments.routes.js |
| GET | `/:id/meetings` | routes\departments.routes.js |
| GET | `/:id/tasks` | routes\departments.routes.js |
| GET | `/:id/resources` | routes\departments.routes.js |
| POST | `/` | routes\departments.routes.js |
| PUT | `/:identifier` | routes\departments.routes.js |
| POST | `/:id/members` | routes\departments.routes.js |
| DELETE | `/:id/members/:userId` | routes\departments.routes.js |
| POST | `/batch` | routes\departments.routes.js |
| DELETE | `/:id` | routes\departments.routes.js |
| GET | `/components/all` | routes\departments.routes.js |
| GET | `/:id/components` | routes\departments.routes.js |
| POST | `/:id/components` | routes\departments.routes.js |
| DELETE | `/:id/components/:componentId` | routes\departments.routes.js |
| GET | `/:id/admins` | routes\departments.routes.js |
| POST | `/:id/admins` | routes\departments.routes.js |
| DELETE | `/:id/admins/:userId` | routes\departments.routes.js |
| GET | `/:identifier/pending-requests` | routes\departments.routes.js |
| POST | `/:identifier/approve/:userId` | routes\departments.routes.js |
| POST | `/:identifier/reject/:userId` | routes\departments.routes.js |
| GET | `/` | routes\documentation.routes.js |
| GET | `/:id` | routes\documentation.routes.js |
| POST | `/` | routes\documentation.routes.js |
| PUT | `/:id` | routes\documentation.routes.js |
| DELETE | `/:id` | routes\documentation.routes.js |
| POST | `/upload` | routes\documents.routes.js |
| GET | `/` | routes\documents.routes.js |
| GET | `/:id/download` | routes\documents.routes.js |
| PUT | `/:id` | routes\documents.routes.js |
| DELETE | `/:id` | routes\documents.routes.js |
| GET | `/` | routes\events.routes.js |
| GET | `/:id` | routes\events.routes.js |
| POST | `/` | routes\events.routes.js |
| PUT | `/:id` | routes\events.routes.js |
| POST | `/:id/register` | routes\events.routes.js |
| DELETE | `/:id/register` | routes\events.routes.js |
| PATCH | `/:id/attendance/:userId` | routes\events.routes.js |
| DELETE | `/:id` | routes\events.routes.js |
| GET | `/:id/ticket-types` | routes\events.routes.js |
| POST | `/:id/ticket-types` | routes\events.routes.js |
| POST | `/:id/register-with-payment` | routes\events.routes.js |
| GET | `/:id/registrations` | routes\events.routes.js |
| GET | `/` | routes\fieldPermissions.routes.js |
| POST | `/` | routes\fieldPermissions.routes.js |
| GET | `/module/:module` | routes\fieldPermissions.routes.js |
| GET | `/check` | routes\fieldPermissions.routes.js |
| GET | `/photos` | routes\gallery.routes.js |
| GET | `/categories` | routes\gallery.routes.js |
| GET | `/albums` | routes\gallery.routes.js |
| GET | `/albums/:id` | routes\gallery.routes.js |
| POST | `/albums` | routes\gallery.routes.js |
| PUT | `/albums/:id` | routes\gallery.routes.js |
| DELETE | `/albums/:id` | routes\gallery.routes.js |
| POST | `/albums/:albumId/photos` | routes\gallery.routes.js |
| PUT | `/photos/:id` | routes\gallery.routes.js |
| DELETE | `/photos/:id` | routes\gallery.routes.js |
| GET | `/tags` | routes\gallery.routes.js |
| POST | `/photos/tags` | routes\gallery.routes.js |
| DELETE | `/photos/:photoId/tags/:tagId` | routes\gallery.routes.js |
| GET | `/photos/:photoId/comments` | routes\gallery.routes.js |
| POST | `/photos/:photoId/comments` | routes\gallery.routes.js |
| GET | `/` | routes\health.js |
| GET | `/` | routes\members.routes.js |
| GET | `/stats` | routes\members.routes.js |
| GET | `/:id` | routes\members.routes.js |
| POST | `/` | routes\members.routes.js |
| PUT | `/:id` | routes\members.routes.js |
| DELETE | `/:id` | routes\members.routes.js |
| GET | `/dashboard` | routes\mobile.routes.js |
| GET | `/content` | routes\mobile.routes.js |
| GET | `/announcements` | routes\mobile.routes.js |
| GET | `/departments` | routes\mobile.routes.js |
| GET | `/events` | routes\mobile.routes.js |
| POST | `/sync` | routes\mobile.routes.js |
| GET | `/metrics` | routes\monitoring.routes.js |
| GET | `/logs` | routes\monitoring.routes.js |
| GET | `/` | routes\notifications.routes.js |
| GET | `/unread-count` | routes\notifications.routes.js |
| POST | `/:notificationId/read` | routes\notifications.routes.js |
| POST | `/mark-all-read` | routes\notifications.routes.js |
| POST | `/read-all` | routes\notifications.routes.js |
| DELETE | `/:notificationId` | routes\notifications.routes.js |
| GET | `/types` | routes\notifications.routes.js |
| GET | `/preferences` | routes\notifications.routes.js |
| PUT | `/preferences` | routes\notifications.routes.js |
| POST | `/` | routes\notifications.routes.js |
| GET | `/` | routes\palette.routes.js |
| GET | `/:id` | routes\palette.routes.js |
| GET | `/name/:name` | routes\palette.routes.js |
| POST | `/:id/apply` | routes\palette.routes.js |
| POST | `/` | routes\palette.routes.js |
| PUT | `/:id` | routes\palette.routes.js |
| DELETE | `/:id` | routes\palette.routes.js |
| POST | `/kopokopo/webhook` | routes\payment.routes.js |
| POST | `/initiate` | routes\payment.routes.js |
| POST | `/payment-link` | routes\payment.routes.js |
| POST | `/qr-code` | routes\payment.routes.js |
| GET | `/status/:paymentId` | routes\payment.routes.js |
| GET | `/history/:memberId` | routes\payment.routes.js |
| GET | `/all` | routes\payment.routes.js |
| GET | `/analytics` | routes\payment.routes.js |
| POST | `/refund/:paymentId` | routes\payment.routes.js |
| GET | `/methods` | routes\payments.routes.js |
| GET | `/categories` | routes\payments.routes.js |
| GET | `/my-payments` | routes\payments.routes.js |
| GET | `/` | routes\payments.routes.js |
| POST | `/` | routes\payments.routes.js |
| GET | `/payments` | routes\payments.routes.js |
| POST | `/payments` | routes\payments.routes.js |
| PUT | `/payments/:id/status` | routes\payments.routes.js |
| PUT | `/status/:id` | routes\payments.routes.js |
| GET | `/pledges` | routes\payments.routes.js |
| POST | `/pledges` | routes\payments.routes.js |
| POST | `/pledges/:pledgeId/payments` | routes\payments.routes.js |
| GET | `/summary` | routes\payments.routes.js |
| GET | `/:id/receipt` | routes\payments.routes.js |
| GET | `/metrics` | routes\performance.routes.js |
| GET | `/cache-stats` | routes\performance.routes.js |
| GET | `/financial` | routes\reports.routes.js |
| GET | `/department` | routes\reports.routes.js |
| GET | `/attendance` | routes\reports.routes.js |
| GET | `/sms` | routes\reports.routes.js |
| GET | `/approvals` | routes\reports.routes.js |
| GET | `/export` | routes\reports.routes.js |
| POST | `/save` | routes\reports.routes.js |
| GET | `/saved` | routes\reports.routes.js |
| POST | `/generate` | routes\reports.routes.js |
| POST | `/schedule` | routes\reports.routes.js |
| GET | `/scheduled` | routes\reports.routes.js |
| GET | `/scheduled/:reportId/executions` | routes\reports.routes.js |
| GET | `/templates` | routes\reports.routes.js |
| GET | `/global` | routes\search.routes.js |
| POST | `/` | routes\search.routes.js |
| POST | `/saved` | routes\search.routes.js |
| GET | `/saved` | routes\search.routes.js |
| DELETE | `/saved/:id` | routes\search.routes.js |
| GET | `/suggestions` | routes\search.routes.js |
| GET | `/logs` | routes\security.routes.js |
| GET | `/failed-attempts` | routes\security.routes.js |
| GET | `/blocked-ips` | routes\security.routes.js |
| POST | `/block-ip` | routes\security.routes.js |
| DELETE | `/unblock-ip/:ipAddress` | routes\security.routes.js |
| GET | `/sessions/:userId` | routes\security.routes.js |
| DELETE | `/sessions/:userId` | routes\security.routes.js |
| GET | `/settings` | routes\security.routes.js |
| PUT | `/settings` | routes\security.routes.js |
| GET | `/analytics` | routes\security.routes.js |
| GET | `/settings` | routes\seo.routes.js |
| PUT | `/settings` | routes\seo.routes.js |
| POST | `/analyze` | routes\seo.routes.js |
| GET | `/public` | routes\settings.routes.js |
| GET | `/` | routes\settings.routes.js |
| GET | `/export/data` | routes\settings.routes.js |
| GET | `/history/audit` | routes\settings.routes.js |
| GET | `/:key` | routes\settings.routes.js |
| POST | `/` | routes\settings.routes.js |
| POST | `/import/data` | routes\settings.routes.js |
| POST | `/reset` | routes\settings.routes.js |
| PUT | `/bulk` | routes\settings.routes.js |
| PUT | `/:key` | routes\settings.routes.js |
| DELETE | `/:key` | routes\settings.routes.js |
| GET | `/providers` | routes\sms.routes.js |
| POST | `/providers` | routes\sms.routes.js |
| GET | `/templates` | routes\sms.routes.js |
| POST | `/templates` | routes\sms.routes.js |
| DELETE | `/templates/:id` | routes\sms.routes.js |
| POST | `/send` | routes\sms.routes.js |
| POST | `/send-blessed` | routes\sms.routes.js |
| GET | `/logs` | routes\sms.routes.js |
| GET | `/history` | routes\sms.routes.js |
| GET | `/balance` | routes\sms.routes.js |
| GET | `/campaigns` | routes\sms.routes.js |
| POST | `/campaigns` | routes\sms.routes.js |
| POST | `/campaigns/:campaignId/send` | routes\sms.routes.js |
| PUT | `/campaigns/:id/status` | routes\sms.routes.js |
| GET | `/stats` | routes\sms.routes.js |
| GET | `/analytics` | routes\sms.routes.js |
| GET | `/rate-limit` | routes\sms.routes.js |
| GET | `/recent` | routes\sms.routes.js |
| GET | `/templates/:id/analytics` | routes\sms.routes.js |
| GET | `/templates/:id/versions` | routes\sms.routes.js |
| PUT | `/templates/:id/approve` | routes\sms.routes.js |
| PUT | `/templates/:id/reject` | routes\sms.routes.js |
| GET | `/templates/:id/ab-tests` | routes\sms.routes.js |
| POST | `/campaigns/:id/optimize` | routes\sms.routes.js |
| GET | `/analytics/predictive` | routes\sms.routes.js |
| GET | `/analytics/benchmarks` | routes\sms.routes.js |
| GET | `/analytics/collaboration` | routes\sms.routes.js |
| GET | `/google` | routes\socialAuth.routes.js |
| GET | `/google/callback` | routes\socialAuth.routes.js |
| GET | `/facebook` | routes\socialAuth.routes.js |
| GET | `/facebook/callback` | routes\socialAuth.routes.js |
| POST | `/link` | routes\socialAuth.routes.js |
| DELETE | `/unlink/:provider` | routes\socialAuth.routes.js |
| GET | `/channels` | routes\telegram.routes.js |
| POST | `/channels` | routes\telegram.routes.js |
| PUT | `/channels/:id` | routes\telegram.routes.js |
| DELETE | `/channels/:id` | routes\telegram.routes.js |
| POST | `/channels/:id/post` | routes\telegram.routes.js |
| GET | `/channels/:id/posts` | routes\telegram.routes.js |
| POST | `/channels/:id/sync` | routes\telegram.routes.js |
| POST | `/upload-photo` | routes\telegram.routes.js |
| GET | `/settings` | routes\telegram.routes.js |
| PUT | `/settings` | routes\telegram.routes.js |
| GET | `/auth/status` | routes\telegram.routes.js |
| POST | `/auth/start` | routes\telegram.routes.js |
| POST | `/auth/start-fallback` | routes\telegram.routes.js |
| POST | `/auth/verify` | routes\telegram.routes.js |
| GET | `/cache/health` | routes\telegram.routes.js |
| POST | `/cache/refresh` | routes\telegram.routes.js |
| GET | `/channels/:id/gallery-photos` | routes\telegram.routes.js |
| POST | `/webhook` | routes\telegram.routes.js |
| GET | `/results` | routes\testing.routes.js |
| POST | `/run/:type` | routes\testing.routes.js |
| GET | `/accounts` | routes\treasury.routes.js |
| POST | `/accounts` | routes\treasury.routes.js |
| GET | `/transactions` | routes\treasury.routes.js |
| POST | `/transactions` | routes\treasury.routes.js |
| PUT | `/transactions/:id/approve` | routes\treasury.routes.js |
| GET | `/income-categories` | routes\treasury.routes.js |
| GET | `/expense-categories` | routes\treasury.routes.js |
| GET | `/budgets` | routes\treasury.routes.js |
| POST | `/budgets` | routes\treasury.routes.js |
| GET | `/budgets/:budgetId/items` | routes\treasury.routes.js |
| POST | `/budgets/:budgetId/items` | routes\treasury.routes.js |
| GET | `/budgets/alerts` | routes\treasury.routes.js |
| GET | `/summary` | routes\treasury.routes.js |
| GET | `/vendors` | routes\treasury.routes.js |
| POST | `/vendors` | routes\treasury.routes.js |
| PUT | `/vendors/:id` | routes\treasury.routes.js |
| DELETE | `/vendors/:id` | routes\treasury.routes.js |
| GET | `/analytics` | routes\treasury.routes.js |
| GET | `/recurring-payments` | routes\treasury.routes.js |
| POST | `/recurring-payments` | routes\treasury.routes.js |
| PUT | `/recurring-payments/:id` | routes\treasury.routes.js |
| DELETE | `/recurring-payments/:id` | routes\treasury.routes.js |
| POST | `/recurring-payments/:id/pause` | routes\treasury.routes.js |
| POST | `/recurring-payments/:id/activate` | routes\treasury.routes.js |
| GET | `/receipts` | routes\treasury.routes.js |
| GET | `/receipts/:id/pdf` | routes\treasury.routes.js |
| GET | `/projects` | routes\treasury.routes.js |
| POST | `/projects` | routes\treasury.routes.js |
| PUT | `/projects/:id` | routes\treasury.routes.js |
| DELETE | `/projects/:id` | routes\treasury.routes.js |
| GET | `/pledges` | routes\treasury.routes.js |
| POST | `/pledges` | routes\treasury.routes.js |
| PUT | `/pledges/:id` | routes\treasury.routes.js |
| DELETE | `/pledges/:id` | routes\treasury.routes.js |
| GET | `/campaigns` | routes\treasury.routes.js |
| POST | `/campaigns` | routes\treasury.routes.js |
| GET | `/directory` | routes\users.routes.js |
| GET | `/` | routes\users.routes.js |
| GET | `/:id` | routes\users.routes.js |
| PUT | `/:id` | routes\users.routes.js |
| POST | `/:id/roles` | routes\users.routes.js |
| DELETE | `/:id/roles/:roleId` | routes\users.routes.js |
| PATCH | `/:id/deactivate` | routes\users.routes.js |
| GET | `/activity-history` | routes\users.routes.js |
| POST | `/change-password` | routes\users.routes.js |
| DELETE | `/:id` | routes\users.routes.js |
| GET | `/preferences` | routes\userSettings.routes.js |
| PUT | `/preferences` | routes\userSettings.routes.js |
| POST | `/change-password` | routes\userSettings.routes.js |
| GET | `/activity-history` | routes\userSettings.routes.js |
| GET | `/` | modules\treasury\routes\account.routes.js |
| GET | `/hierarchy` | modules\treasury\routes\account.routes.js |
| GET | `/trial-balance` | modules\treasury\routes\account.routes.js |
| GET | `/:id` | modules\treasury\routes\account.routes.js |
| POST | `/` | modules\treasury\routes\account.routes.js |
| PUT | `/:id` | modules\treasury\routes\account.routes.js |
| DELETE | `/:id` | modules\treasury\routes\account.routes.js |
| GET | `/` | modules\treasury\routes\budget.routes.js |
| GET | `/alerts` | modules\treasury\routes\budget.routes.js |
| GET | `/comparison` | modules\treasury\routes\budget.routes.js |
| GET | `/:id` | modules\treasury\routes\budget.routes.js |
| POST | `/` | modules\treasury\routes\budget.routes.js |
| PUT | `/:id` | modules\treasury\routes\budget.routes.js |
| POST | `/:id/activate` | modules\treasury\routes\budget.routes.js |
| POST | `/:id/close` | modules\treasury\routes\budget.routes.js |
| GET | `/` | modules\treasury\routes\expense.routes.js |
| GET | `/pending` | modules\treasury\routes\expense.routes.js |
| GET | `/summary` | modules\treasury\routes\expense.routes.js |
| GET | `/report` | modules\treasury\routes\expense.routes.js |
| GET | `/:id` | modules\treasury\routes\expense.routes.js |
| POST | `/` | modules\treasury\routes\expense.routes.js |
| PUT | `/:id` | modules\treasury\routes\expense.routes.js |
| POST | `/:id/approve` | modules\treasury\routes\expense.routes.js |
| POST | `/:id/reject` | modules\treasury\routes\expense.routes.js |
| POST | `/:id/pay` | modules\treasury\routes\expense.routes.js |
| GET | `/` | modules\treasury\routes\fund.routes.js |
| GET | `/balances` | modules\treasury\routes\fund.routes.js |
| GET | `/:id` | modules\treasury\routes\fund.routes.js |
| POST | `/` | modules\treasury\routes\fund.routes.js |
| PUT | `/:id` | modules\treasury\routes\fund.routes.js |
| DELETE | `/:id` | modules\treasury\routes\fund.routes.js |
| GET | `/` | modules\treasury\routes\journalEntry.routes.js |
| GET | `/:id` | modules\treasury\routes\journalEntry.routes.js |
| POST | `/` | modules\treasury\routes\journalEntry.routes.js |
| PUT | `/:id` | modules\treasury\routes\journalEntry.routes.js |
| POST | `/:id/reverse` | modules\treasury\routes\journalEntry.routes.js |
| GET | `/accounts/:account_id/transactions` | modules\treasury\routes\journalEntry.routes.js |

**Total Routes:** 415

---

## Coverage Analysis

### Tables with Likely Route Coverage

| Table | Likely Route | Has Route? |
|-------|--------------|-----------|
| `accessibility` | Unknown | ⚠️ No mapping |
| `accessibility_settings` | `/accessibility/settings` | ✅ Yes |
| `accounts` | `/treasury/accounts` | ✅ Yes |
| `activity_feed` | `/activity-feed` | ✅ Yes |
| `activity_log` | `/activity-log` | ✅ Yes |
| `announcements` | `/announcements` | ✅ Yes |
| `api_logs` | `/monitoring/logs` | ✅ Yes |
| `approval_history` | `/approvals/:id/history` | ✅ Yes |
| `approval_requests` | `/approvals` | ✅ Yes |
| `approval_workflows` | `/approvals/workflows` | ✅ Yes |
| `audit_log` | `/audit-logs` | ✅ Yes |
| `auth_audit_log` | `/auth/audit-log` | ✅ Yes |
| `blocked_ips` | `/security/blocked-ips` | ✅ Yes |
| `budget_items` | `/treasury/budgets/:budgetId/items` | ✅ Yes |
| `budgets` | `/treasury/budgets` | ✅ Yes |
| `church_accounts` | `/treasury/accounts` | ✅ Yes |
| `collection_contributions` | `/collections/:id/contributions` | ✅ Yes |
| `color_palette_colors` | `/palette` | ✅ Yes |
| `color_palettes` | `/palette` | ✅ Yes |
| `comments` | `/comments/:entityType/:entityId` | ✅ Yes |
| `content_categories` | `/content/categories-list` | ✅ Yes |
| `content_item_tags` | `/content/tags` | ✅ Yes |
| `content_items` | `/content` | ✅ Yes |
| `content_revisions` | `/content/revisions` | ✅ Yes |
| `content_tags` | `/content/tags` | ✅ Yes |
| `department_categories` | `/department-categories` | ✅ Yes |
| `department_communications` | `/departments/:id/communications` | ✅ Yes |
| `department_component_allocations` | `/departments/:id/components` | ✅ Yes |
| `department_components` | `/departments/:id/components` | ✅ Yes |
| `department_meeting_attendees` | `/departments/:id/meetings` | ✅ Yes |
| `department_meetings` | `/departments/:id/meetings` | ✅ Yes |
| `department_members` | `/departments/:id/members` | ✅ Yes |
| `department_permissions` | `/departments/:id/permissions` | ✅ Yes |
| `department_reports` | `/departments/:id/reports` | ✅ Yes |
| `department_resources` | `/departments/:id/resources` | ✅ Yes |
| `department_tasks` | `/departments/:id/tasks` | ✅ Yes |
| `departments` | `/departments` | ✅ Yes |
| `documents` | `/documents` | ✅ Yes |
| `event_attendance` | `/events/attendance` | ✅ Yes |
| `event_collections` | `/collections/event` | ✅ Yes |
| `event_registrations` | `/events/registrations` | ✅ Yes |
| `events` | `/events` | ✅ Yes |
| `expense_categories` | `/treasury/expense-categories` | ✅ Yes |
| `expenses` | `/treasury/expenses` | ✅ Yes |
| `failed_login_attempts` | `/security/failed-attempts` | ✅ Yes |
| `field_permissions` | `/field-permissions` | ✅ Yes |
| `fixed_assets` | `/treasury/fixed-assets` | ✅ Yes |
| `funds` | `/treasury/funds` | ✅ Yes |
| `gallery_albums` | `/gallery/albums` | ✅ Yes |
| `gallery_comments` | `/gallery/photos/:photoId/comments` | ✅ Yes |
| `gallery_photo_tags` | `/gallery/photos/:photoId/tags` | ✅ Yes |
| `gallery_photos` | `/gallery/photos` | ✅ Yes |
| `gallery_tags` | `/gallery/tags` | ✅ Yes |
| `income_categories` | `/treasury/income-categories` | ✅ Yes |
| `information_schema` | Unknown | ⚠️ No mapping |
| `journal_entries` | `/treasury/journal-entries` | ✅ Yes |
| `journal_entry_lines` | `/treasury/journal-entries` | ✅ Yes |
| `login_attempts` | `/security/failed-attempts` | ✅ Yes |
| `member_attendance` | `/members/attendance` | ✅ Yes |
| `member_contacts` | `/members/:id/contacts` | ✅ Yes |
| `member_group_memberships` | `/members/groups` | ✅ Yes |
| `member_groups` | `/members/groups` | ✅ Yes |
| `members` | `/members` | ✅ Yes |
| `notification_preferences` | `/notifications/preferences` | ✅ Yes |
| `notification_types` | `/notifications/types` | ✅ Yes |
| `notifications` | `/notifications` | ✅ Yes |
| `password_reset_tokens` | `/auth/reset-password` | ✅ Yes |
| `payment_categories` | `/payments/categories` | ✅ Yes |
| `payment_items` | `/payments` | ✅ Yes |
| `payment_methods` | `/payments/methods` | ✅ Yes |
| `payments` | `/payments` | ✅ Yes |
| `permissions` | `/users/:id/roles` | ✅ Yes |
| `personal_collections` | `/collections/my-collections` | ✅ Yes |
| `pledge_campaigns` | `/treasury/campaigns` | ✅ Yes |
| `pledge_payments` | `/payments/pledges/:pledgeId/payments` | ✅ Yes |
| `pledges` | `/payments/pledges` | ✅ Yes |
| `projects` | Unknown | ⚠️ No mapping |
| `recurring_payments` | `/treasury/recurring-payments` | ✅ Yes |
| `refresh_tokens` | `/auth/refresh-token` | ✅ Yes |
| `report_executions` | `/reports/scheduled/:reportId/executions` | ✅ Yes |
| `role_permissions` | `/users/:id/roles` | ✅ Yes |
| `roles` | `/users/:id/roles` | ✅ Yes |
| `saved_reports` | `/reports/saved` | ✅ Yes |
| `saved_searches` | `/search/saved` | ✅ Yes |
| `scheduled_reports` | `/reports/scheduled` | ✅ Yes |
| `security_logs` | `/security/logs` | ✅ Yes |
| `security_settings` | `/security/settings` | ✅ Yes |
| `selected_palette` | `/palette` | ✅ Yes |
| `seo_settings` | `/seo/settings` | ✅ Yes |
| `setting` | Unknown | ⚠️ No mapping |
| `settings_audit_log` | `/settings/history/audit` | ✅ Yes |
| `sms_ab_tests` | `/sms/templates/:id/ab-tests` | ✅ Yes |
| `sms_campaigns` | `/sms/campaigns` | ✅ Yes |
| `sms_logs` | `/sms/logs` | ✅ Yes |
| `sms_providers` | `/sms/providers` | ✅ Yes |
| `sms_template_versions` | `/sms/templates/:id/versions` | ✅ Yes |
| `sms_templates` | `/sms/templates` | ✅ Yes |
| `system_logs` | `/monitoring/logs` | ✅ Yes |
| `telegram_channel_media` | `/telegram/upload-photo` | ✅ Yes |
| `telegram_channel_posts` | `/telegram/channels/:id/posts` | ✅ Yes |
| `telegram_channels` | `/telegram/channels` | ✅ Yes |
| `telegram_photos_cache` | `/telegram/cache/health` | ✅ Yes |
| `telegram_settings` | `/telegram/settings` | ✅ Yes |
| `test_results` | `/testing/results` | ✅ Yes |
| `ticket_types` | `/support/tickets` | ✅ Yes |
| `transactions` | `/treasury/transactions` | ✅ Yes |
| `user_preferences` | `/user-settings/preferences` | ✅ Yes |
| `user_roles` | `/users/:id/roles` | ✅ Yes |
| `user_sessions` | `/auth/sessions` | ✅ Yes |
| `users` | `/users` | ✅ Yes |
| `vendors` | `/treasury/vendors` | ✅ Yes |
| `website_settings` | Unknown | ⚠️ No mapping |
| `workflow_assignments` | `/approvals/workflows` | ✅ Yes |
| `your` | Unknown | ⚠️ No mapping |

**Covered:** 108 | **Uncovered:** 6

### Tables Without Clear Route Mapping

| Table | Referenced In |
|-------|--------------|
| `accessibility` | controllers\accessibility.controller.js |
| `information_schema` | controllers\documents.controller.js, controllers\mobile.controller.js |
| `projects` | controllers\treasury.controller.js, modules\treasury\repositories\expense.repository.js |
| `setting` | controllers\settings.controller.js |
| `website_settings` | controllers\content.controller.js |
| `your` | routes\department.routes.js |

---

*This document is auto-generated by validate-db-routes.js*
