# KMainCMS Complete File Inventory
Date: 2026-06-21
Purpose: Comprehensive static analysis coverage

## Backend Controllers (38 files)
- accessibility.controller.js
- activityFeed.controller.js
- analytics.controller.js
- announcements.controller.js
- approvals.controller.js
- auth.controller.js [ANALYZED]
- collection.controller.js
- comments.controller.js
- content.controller.js [ANALYZED]
- dashboard.controller.js
- department.controller.js [ANALYZED]
- departments.controller.js
- documentation.controller.js
- documents.controller.js
- events.controller.js
- fieldPermissions.controller.js
- gallery.controller.js [ANALYZED]
- members.controller.js
- mobile.controller.js
- monitoring.controller.js
- notifications.controller.js
- palette.controller.js
- payment.controller.js [ANALYZED]
- payments.controller.js
- performance.controller.js
- reports.controller.js [ANALYZED]
- search.controller.js
- security.controller.js
- seo.controller.js
- settings.controller.js
- sms.controller.js [ANALYZED]
- socialAuth.controller.js
- telegram.controller.js [ANALYZED]
- telegramAuth.controller.js
- testing.controller.js
- treasury.controller.js [ANALYZED]
- userSettings.controller.js
- users.controller.js [ANALYZED]

**Status:** 10/38 analyzed (26%)

## Backend Routes (40 files)
- accessibility.routes.js
- analytics.routes.js
- announcements.routes.js
- approvals.routes.js
- audit-logs.routes.js
- auth.routes.js [ANALYZED]
- collections.routes.js
- comments.routes.js
- content.routes.js
- dashboard.routes.js
- department-categories.routes.js
- department.routes.js
- departments.routes.js
- documentation.routes.js
- documents.routes.js
- events.routes.js
- fieldPermissions.routes.js
- gallery.routes.js
- health.js
- members.routes.js
- mobile.routes.js
- monitoring.routes.js
- notifications.routes.js
- palette.routes.js
- payment.routes.js
- payments.routes.js
- performance.routes.js
- reports.routes.js
- search.routes.js
- security.routes.js
- seo.routes.js
- settings.routes.js
- sms.routes.js
- socialAuth.routes.js
- telegram.routes.js
- telegramAuth.routes.js
- testing.routes.js
- treasury.routes.js
- userSettings.routes.js
- users.routes.js

**Status:** 1/40 analyzed (2.5%)

## Backend Middleware (6 files)
- auth.js
- errorHandler.js
- rateLimiter.js [ANALYZED]
- securityMiddleware.js [ANALYZED]
- treasurySecurity.js
- validation.js

**Status:** 2/6 analyzed (33%)

## Backend Helpers (11 files)
- activityLogger.js
- auditLog.js
- cacheService.js
- errorHandler.js
- fieldPermissionService.js
- galleryCache.js
- notify.js
- reportScheduler.js
- security.js
- websocket.js
- workflowEngine.js

**Status:** 0/11 analyzed (0%)

## Backend Services (5 files)
- accounting.service.js
- kopokopo.js
- telegramClient.service.js
- telegramMTProto.js
- telegramService.js

**Status:** 0/5 analyzed (0%)

## Backend Config (4 files)
- database.js [ANALYZED]
- logging.js
- passport.js [ANALYZED]
- telegram.js [ANALYZED]

**Status:** 3/4 analyzed (75%)

## Backend Utils (4 files)
- mpesa.js
- jwt.js [ANALYZED]
- errorHandler.js
- emailService.js

**Status:** 1/4 analyzed (25%)

## Backend Core Files (4 files)
- app.js [ANALYZED]
- server.js [ANALYZED]
- package.json [ANALYZED]
- .env.example [ANALYZED]

**Status:** 4/4 analyzed (100%)

## Database Schema Files (44 files)
- 001_auth_schema.sql [ANALYZED]
- 002_settings_schema.sql [ANALYZED]
- 003_members_schema.sql [ANALYZED]
- activity_feed_indexes.sql
- add_categories_hierarchy.sql
- add_event_poster_column.sql
- add_gallery_missing_columns.sql
- add_indexes.sql
- add_mpesa_settings.sql
- add_photo_location_column.sql
- add_website_settings.sql
- approvals_schema.sql
- auth_enhancements.sql
- check_and_fix_slugs.sql
- complete_schema.sql
- complete_seed.sql
- content_schema.sql
- create_department_components_tables.sql
- departments_enhancements.sql
- departments_schema.sql
- departments_seed_updated.sql
- documents_schema.sql
- gallery_schema.sql
- migrations/add_approval_status_to_department_members.sql
- migrations/add_department_logo_banner.sql
- migrations/add_is_active_to_department_members.sql
- migrations/add_is_active_to_departments.sql
- migrations/add_poster_url_to_events.sql
- migrations/add_slug_to_departments.sql
- migrations/add_slug_to_users.sql
- migrations/add_sms_delivery_tracking.sql
- migrations/clean_up_slugs.sql
- migrations/create_approvals_audit_notifications.sql
- migrations/create_event_collections.sql
- migrations/create_user_preferences.sql
- migrations/004_gallery_schema.sql
- migrations/005_fix_missing_columns.sql
- notifications_schema.sql
- payments_schema.sql [ANALYZED]
- role_hierarchy.sql
- sample_data.sql
- schema.sql
- security_schema.sql
- seed_church_workers.sql
- settings_schema.sql
- treasury_schema.sql [ANALYZED]

**Status:** 5/44 analyzed (11%)

## Frontend JSX Files (42+ files)
- sms/SMS.jsx
- pages/users/UserManagement.jsx
- pages/treasury/Vendors.jsx
- pages/treasury/TreasuryDashboard.jsx
- pages/treasury/TreasuryAnalytics.jsx
- pages/treasury/RecurringPayments.jsx
- pages/treasury/Receipts.jsx
- pages/treasury/Projects.jsx
- pages/treasury/Pledges.jsx
- pages/treasury/JournalEntries.jsx
- pages/treasury/Funds.jsx
- pages/treasury/FixedAssets.jsx
- pages/treasury/FinancialReports.jsx
- pages/treasury/Expenses.jsx
- pages/treasury/Contributions.jsx
- pages/treasury/ChartOfAccounts.jsx
- pages/treasury/Budgets.jsx
- pages/treasury/BankReconciliations.jsx
- pages/testing/Testing.jsx
- pages/telegram/TelegramSettings.jsx
- pages/telegram/TelegramPosts.jsx
- pages/telegram/TelegramPostMessage.jsx
- pages/telegram/TelegramPhotoUpload.jsx
- pages/telegram/TelegramChannels.jsx
- pages/telegram/TelegramCacheHealth.jsx
- pages/telegram/TelegramAuth.jsx
- pages/telegram/Telegram.jsx
- pages/settings/Settings.jsx
- pages/seo/SEO.jsx
- pages/security/Security.jsx
- pages/reports/Reports.jsx
- pages/PublicHome.jsx
- pages/public/Terms.jsx
- pages/public/PublicAnnouncementDetail.jsx
- pages/public/Privacy.jsx
- pages/profile/ProfileManagement.jsx
- pages/profile/Profile.jsx
- pages/payments/PaymentManagement.jsx
- pages/payments/Payments.jsx
- pages/photoGallery/PhotoGalleryPage.jsx
- pages/notifications/Notifications.jsx
- pages/login/LoginPage.jsx
- pages/login/ForgotPasswordPage.jsx
- pages/departments/DepartmentOverview.jsx
- pages/departments/DepartmentDashboard.jsx
- pages/departments/components/ComponentAllocation.jsx
- pages/dashboard/Dashboard.jsx
- pages/content/ContentManagement.jsx
- pages/announcements/Announcements.jsx
- pages/admin/AdminPanel.jsx
- components/search/AdvancedSearch.jsx [ANALYZED]
- router.jsx
- router/public.routes.jsx
- router/dashboard.routes.jsx
- router/auth.routes.jsx

**Status:** 1/42+ analyzed (~2%)

## Frontend JS Files (Core)
- core/api/client.js [ANALYZED]
- core/hooks/useApi.js [ANALYZED]
- core/hooks/index.js
- utils/errorHandler.js
- utils/dateGrouping.js
- utils/cache.js
- vite.config.js
- tailwind.config.js
- start-dev.js

**Status:** 2/9 analyzed (22%)

## Flutter Mobile App (Directory)
- android/
- ios/
- lib/
- assets/
- .metadata
- .gitignore
- README.md
- app.json
- package.json
- pubspec.yaml
- ANDROID_STUDIO_INSTRUCTIONS.md

**Status:** 0% analyzed

## Mobile App (Directory)
- src/
- .nvmrc
- App.js
- README.md
- app.json
- package.json

**Status:** 0% analyzed

## Test Files (Backend)
- tests/utils/testHelpers.js
- tests/simple.test.js
- tests/setup.js
- tests/e2e/user-workflows.test.js
- tests/api/tests/notifications.test.js
- tests/api/tests/health.test.js
- tests/api/tests/documents.test.js
- tests/api/tests/database.test.js
- tests/api/tests/auth.test.js
- tests/api/tests/approvals.test.js
- tests/api/setup/test-helpers.js
- tests/api/setup/global-setup.js
- tests/api/jest.config.js

**Status:** 0% analyzed

## Configuration Files (Root)
- .gitignore
- .windsurfrules
- API_DOCUMENTATION.md
- ARCHITECTURE.md
- BROKEN_LINKS_ROUTES_REPORT.md
- CODEBASE_AUDIT_REPORT.md
- CONTAbo_DEPLOYMENT.md
- DEPLOYMENT.md
- DEVELOPER_GUIDE.md
- ERROR_HANDLING_AND_LOAD_BALANCING_PLAN.md
- IMPLEMENTATION_SUMMARY.md
- IMPROVEMENT_RECOMMENDATIONS.md
- IMPROVEMENT_RECOMMENDATIONS_REPORT.md
- KiserianMainSDAApp.apk
- MICROSERVICES_ARCHITECTURE.md
- MODULARIZATION_SUMMARY.md
- NEXT_STEPS_SUMMARY.md
- PHASE_2_IMPLEMENTATION_PLAN.md
- PROGRESS_TRACKING.md
- README.md
- SESSION_LOG_2025-06-18.md
- SYSTEM_DOCUMENTATION.md
- SYSTEM_IMPROVEMENT_PLAN.md
- Safaricom APIs.postman_collection.json
- TREASURY_IMPLEMENTATION_SUMMARY.md
- docker-compose.yml
- docker-compose.microservices.yml
- package.json
- nginx/nginx.conf
- services/api-gateway/
- todo-lists/

**Status:** 0% analyzed

## Summary Statistics

**Total Source Files for Analysis:** ~200+
- Backend Controllers: 38 (10 analyzed)
- Backend Routes: 40 (1 analyzed)
- Backend Middleware: 6 (2 analyzed)
- Backend Helpers: 11 (0 analyzed)
- Backend Services: 5 (0 analyzed)
- Backend Config: 4 (3 analyzed)
- Backend Utils: 4 (1 analyzed)
- Backend Core: 4 (4 analyzed)
- Database Schemas: 44 (5 analyzed)
- Frontend JSX: 42+ (1 analyzed)
- Frontend JS: 9 (2 analyzed)
- Flutter App: ~20 (0 analyzed)
- Mobile App: ~10 (0 analyzed)
- Test Files: 13 (0 analyzed)

**Overall Analysis Coverage:** ~10% of source files analyzed

## Files Not Yet Analyzed (Priority Order)

### High Priority (Backend Core Functionality)
1. Remaining 28 backend controllers
2. All 40 route files
3. 11 helper files
4. 5 service files
5. Backend config (logging.js)
6. Backend utils (mpesa.js, errorHandler.js, emailService.js)

### Medium Priority (Database & Testing)
7. 39 remaining database schema files
8. 13 test files
9. Migration files

### Medium Priority (Frontend)
10. 41+ remaining frontend JSX files
11. 7 remaining frontend JS files
12. Frontend contexts and components

### Low Priority (Mobile)
13. Flutter mobile app (~20 files)
14. Mobile app directory (~10 files)

## Updated Analysis Plan

### Phase 1: Complete Backend Analysis (Critical)
- Analyze remaining 28 backend controllers
- Analyze all 40 route files
- Analyze 11 helper files
- Analyze 5 service files
- Analyze remaining config and utils files

### Phase 2: Database & Testing Analysis
- Analyze remaining 39 database schema files
- Analyze 13 test files
- Analyze migration files

### Phase 3: Frontend Analysis
- Analyze remaining 41+ frontend JSX files
- Analyze remaining 7 frontend JS files
- Analyze frontend contexts and components

### Phase 4: Mobile Analysis (Optional)
- Analyze Flutter mobile app
- Analyze mobile app directory

### Phase 5: Documentation & Configuration
- Analyze configuration files
- Analyze documentation files
- Analyze deployment scripts

**Estimated Total Analysis Time:** 2-3 hours for complete coverage (excluding mobile apps)
### Phase 3: Frontend Analysis
- Analyze remaining 41+ frontend JSX files
- Analyze remaining 7 frontend JS files
- Analyze frontend contexts and components

### Phase 4: Mobile Analysis (Skipped)
- Flutter mobile app directory does not exist
- Mobile app directory does not exist

### Phase 5: Documentation & Configuration
- Analyze configuration files
- Analyze documentation files
- Analyze deployment scripts

**Estimated Total Analysis Time:** 3-4 hours for complete coverage
### Phase 3: Frontend Analysis
- Analyze remaining 41+ frontend JSX files
- Analyze remaining 7 frontend JS files
- Analyze frontend contexts and components

### Phase 4: Mobile Analysis (Optional)
- Analyze Flutter mobile app
- Analyze mobile app directory

### Phase 5: Documentation & Configuration
- Analyze configuration files
- Analyze documentation files
- Analyze deployment scripts

**Estimated Total Analysis Time:** 3-4 hours for complete coverage
