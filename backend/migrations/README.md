# backend/migrations/
Numbered SQL migrations applied in order.
## Files
| File | Purpose |
|---|---|
| `001_churches_table.sql` | Core tenancy table — `churches` was only ever created by the legacy `database/migrations/add_tenancy_core.sql`; fresh builds died on the first FK reference. |
| `002_00_base_schema.sql` | Base application schema — `users`, `roles`, `departments`, `announcements`, `payments`, `sms_*`, `events` (union of legacy `database/schema.sql` + `001_auth_schema.sql`). Sorts before the other `002_*` files. |
| `002_create_accounts.sql` | — |
| `002_department_features.sql` | — |
| `003_add_snapshot_tables.sql` | Snapshot and Rolling Update tables migration |
| `004_gallery_schema.sql` | Gallery Module Schema |
| `005_fix_missing_columns.sql` | DEPRECATED: Superseded by 007_auth_tables.sql, 010_documents_schema.sql, and 022_add_missing_church_id.sql. |
| `006_settings_schema.sql` | Settings table migration |
| `007_auth_tables.sql` | Auth tables migration |
| `008_permissions_schema.sql` | Permissions and role permissions schema |
| `009_fix_public_columns.sql` | Fix missing columns for public API endpoints |
| `010_fix_users_identity_columns.sql` | Fix missing columns in users table required by IdentityService and auth flow |
| `020_platform_admin_schema.sql` | Platform Admin Schema Migration |
| `021_add_global_username_constraint.sql` | Add global username unique constraint. |
| `022_add_missing_church_id.sql` | Add church_id to commonly referenced tables where it is missing |
| `023_create_members.sql` | Create members and fix department_members for production DB |
| `024_departments_multitenancy.sql` | Allow the same department names across churches (multi-tenant). |
| `025_dashboard_tables.sql` | Create tables required by the mobile dashboard and approvals module. |
| `026_mobile_parity.sql` | Mobile app parity support: |
| `027_events_time_poster.sql` | Migration 027: add event_time and poster_url to events |
| `028_mobile_missing_tables.sql` | Migration 028: tables/columns required by mobile app endpoints |
| `029_users_last_login.sql` | Migration 029: users.last_login for system-health "active users" metric |
| `030_dashboard_missing_tables.sql` | Migration 030: tables/columns for Pastor, Treasurer and Department Head dashboards |
| `031_department_features.sql` | Migration 031 (rev 2): department feature upgrade |
| `032_telegram_gallery.sql` | Migration 032: Telegram integration + gallery sync schema |
| `033_telegram_church_unique.sql` | Migration 033: Enforce one Telegram config per church |
| `034_department_hierarchy_leadership.sql` | Migration 034: Department hierarchy + leadership/handover + temporary access |
| `035_department_obligations.sql` | ============================================================================ |
| `036_composite_church_id_indexes.sql` | Migration 036: Composite church_id indexes |
| `037_remittance_ledger.sql` | Migration 037: Remittance ledger |
| `038_role_permission_backfill.sql` | Migration 038: Role-permission backfill |
| `039_users_missing_columns.sql` | Migration 039: Add users columns the codebase references but prod lacks. |
| `040_notifications_schema_alignment.sql` | Migration 040: Align notifications schema with NotificationsRepository. |
| `041_treasury_finance_tables.sql` | 041_treasury_finance_tables.sql |
| `042_security_settings_church.sql` | Security settings: church scoping + flexible settings payload |
| `043_payments_member_columns.sql` | Payments table: columns used by the member M-Pesa initiation flow |
| `044_gallery_uploads.sql` | Migration 044: Gallery direct uploads |
| `045_treasury_module_tables.sql` | Migration 045: Treasury module tables (church-scoped) |
| `046_treasury_schema_backfill.sql` | 046_treasury_schema_backfill.sql |
| `047_collections_schema.sql` | 047_collections_schema.sql |
| `048_gallery_member_features.sql` | 048_gallery_member_features.sql |
| `049_tenant_scoping_comments_exports_telegram.sql` | Migration 049: Tenant scoping for comments, accounting exports, and Telegram auth methods |
| `050_reports_tables.sql` | Reports persistence layer. |
| `051_telegram_channel_posts_columns.sql` | telegramService references announcement_id / synced_to_announcement on |
| `052_approval_workflow_tables.sql` | Approval workflow engine tables. |
| `053_chat_tables.sql` | Chat tables for controllers/chat.controller.js. |
| `054_document_approval_tables.sql` | Document approval support for services/documentApprovalService.js. |
| `055_department_components.sql` | Department component system for /departments/:id/components endpoints. |
| `056_settings_per_church_overrides.sql` | Migration 056: enable per-church settings overrides. |
| `057_audit_log_church_id.sql` | Migration 057: Tenant scope on audit_log |
| `058_events_category.sql` | Migration 058: events.category |
| `059_departments_head_id.sql` | Migration 059: departments.head_id |
| `060_approval_requester_backfill.sql` | L772: unify the approval_requests requester columns. |
| `061_null_church_unique_holes.sql` | L774: close the NULL-unique hole on (key, church_id)-style constraints. |
| `062_gallery_sentinel_church_backfill.sql` | L775: migration 004 stamped pre-existing gallery rows with the sentinel |
| `add_sms_contact_management.sql` | Add SMS Contact Management Tables to Msabato CMS |
_Generated by `scripts/generate-folder-readmes.js` — edit file headers, not this table._