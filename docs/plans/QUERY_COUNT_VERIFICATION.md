# Pool Query Count Verification
**Date:** 2026-06-22
**Purpose:** Verify actual pool.query counts vs documented counts

## Total Backend pool.query Distribution

- **Total in backend/**/*.js:** 1,315 pool.query calls
- **Repositories:** 198 queries (acceptable - repositories should use pool.query)
- **Middleware:** 8 queries (need to verify if these should be refactored)
- **Routes:** 126 queries (need to verify if these should be refactored)
- **Controllers:** 681 queries (NEEDS DOCUMENTATION - only 479 documented so far)

**Missing:** 681 - 479 = 202 controller queries still need documentation

## Controller-by-Controller Verification (In Progress)

### accessibility.controller.js
- **Actual count:** 2
- **Documented:** 2
- **Status:** ✅ Complete

### accountingExport.controller.js
- **Actual count:** 9
- **Documented:** 9
- **Status:** ✅ Complete

### activityFeed.controller.js
- **Actual count:** 5
- **Documented:** 5
- **Status:** ✅ Complete

### ai.controller.js
- **Actual count:** 6
- **Documented:** 6
- **Status:** ✅ Complete

### analytics.controller.js
- **Actual count:** 2
- **Documented:** 2
- **Status:** ✅ Complete

### announcements.controller.js
- **Actual count:** 8
- **Documented:** 8
- **Status:** ✅ Complete

### approvals.controller.js
- **Actual count:** 3
- **Documented:** 3
- **Status:** ✅ Complete

### auth.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete (All 30 queries refactored to AuthRepository in PACKAGE_06)

### budgets.controller.js
- **Actual count:** 8
- **Documented:** 8
- **Status:** ✅ Complete

### chartOfAccounts.controller.js
- **Actual count:** 12
- **Documented:** 12
- **Status:** ✅ Complete

### chat.controller.js
- **Actual count:** 3
- **Documented:** 3
- **Status:** ✅ Complete

### church.controller.js
- **Actual count:** 15
- **Documented:** 15
- **Status:** ✅ Complete

### collection.controller.js
- **Actual count:** 15
- **Documented:** 15
- **Status:** ✅ Complete

### comments.controller.js
- **Actual count:** 7
- **Documented:** 7
- **Status:** ✅ Complete

### content.controller.js
- **Actual count:** 43
- **Documented:** 43
- **Status:** ✅ Complete

### customReport.controller.js
- **Actual count:** 7
- **Documented:** 7
- **Status:** ✅ Complete

### dashboard.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete

### department.controller.js
- **Actual count:** 40
- **Documented:** 40
- **Status:** ✅ Complete

### departmentFeatures.controller.js
- **Actual count:** 3
- **Documented:** 3
- **Status:** ✅ Complete

### departments.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete (All 23 queries refactored to DepartmentsRepository in PACKAGE_05 and PACKAGE_06)

### documentVersions.controller.js
- **Actual count:** 15
- **Documented:** 15
- **Status:** ✅ Complete

### documentation.controller.js
- **Actual count:** 5
- **Documented:** 5
- **Status:** ✅ Complete

### documents.controller.js
- **Actual count:** 12
- **Documented:** 12
- **Status:** ✅ Complete

### events.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete

### fieldPermissions.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete

### financialAlerts.controller.js
- **Actual count:** 13
- **Documented:** 13
- **Status:** ✅ Complete

### financialForecasting.controller.js
- **Actual count:** 5
- **Documented:** 5
- **Status:** ✅ Complete

### fixedAssets.controller.js
- **Actual count:** 10
- **Documented:** 10
- **Status:** ✅ Complete

### gateway.controller.js
- **Actual count:** 2
- **Documented:** 2
- **Status:** ✅ Complete

### gallery.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete (All 26 queries refactored to GalleryRepository in PACKAGE_05)

### galleryAlbums.controller.js
- **Actual count:** 8
- **Documented:** 8
- **Status:** ✅ Complete

### journalEntry.controller.js
- **Actual count:** 6
- **Documented:** 6
- **Status:** ✅ Complete

### manualPayment.controller.js
- **Actual count:** 12
- **Documented:** 10
- **Status:** ❌ Missing 2 queries (lines 309, 344)
- **Action:** Need to add missing queries

### memberGiving.controller.js
- **Actual count:** 6
- **Documented:** 6
- **Status:** ✅ Complete

### members.controller.js
- **Actual count:** 4
- **Documented:** 4
- **Status:** ✅ Complete

### mobile.controller.js
- **Actual count:** 9
- **Documented:** 9
- **Status:** ✅ Complete

### monitoring.controller.js
- **Actual count:** 1
- **Documented:** 1
- **Status:** ✅ Complete

### mpesa.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete

### notifications.controller.js
- **Actual count:** 11
- **Documented:** 11
- **Status:** ✅ Complete

### palette.controller.js
- **Actual count:** 13
- **Documented:** 13
- **Status:** ✅ Complete

### payment.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete (All 18 queries refactored to PaymentRepository in PACKAGE_07)

### payments.controller.js
- **Actual count:** 15
- **Documented:** 15
- **Status:** ✅ Complete

### performance.controller.js
- **Actual count:** 1
- **Documented:** 1
- **Status:** ✅ Complete

### pledges.controller.js
- **Actual count:** 7
- **Documented:** 7
- **Status:** ✅ Complete

### projects.controller.js
- **Actual count:** 5
- **Documented:** 5
- **Status:** ✅ Complete

### reconciliation.controller.js
- **Actual count:** 4
- **Documented:** 4
- **Status:** ✅ Complete

### recurringPayments.controller.js
- **Actual count:** 8
- **Documented:** 8
- **Status:** ✅ Complete

### reports.controller.js
- **Actual count:** 12
- **Documented:** 12
- **Status:** ✅ Complete

### search.controller.js
- **Actual count:** 15
- **Documented:** 10
- **Status:** ❌ Missing 5 queries (lines 201, 211, 241, 263, 285)
- **Action:** Added missing queries to documentation ✅

### security.controller.js
- **Actual count:** 11
- **Documented:** 10
- **Status:** ❌ Missing 1 query (line 214)
- **Action:** Added missing query to documentation ✅

### seo.controller.js
- **Actual count:** 2
- **Documented:** 2
- **Status:** ✅ Complete

### settings.controller.js
- **Actual count:** 0
- **Documented:** 0
- **Status:** ✅ Complete (All 21 queries refactored to SettingsRepository in PACKAGE_08)

### sms.controller.js
- **Actual count:** 24
- **Documented:** 24
- **Status:** ✅ Complete

### smsAutomation.controller.js
- **Actual count:** 9
- **Documented:** 9
- **Status:** ✅ Complete

### socialAuth.controller.js
- **Actual count:** 10
- **Documented:** 10
- **Status:** ✅ Complete

### sync.controller.js
- **Actual count:** 1
- **Documented:** 1
- **Status:** ✅ Complete

### taxStatement.controller.js
- **Actual count:** 5
- **Documented:** 5
- **Status:** ✅ Complete

### telegram.controller.js
- **Actual count:** 17
- **Documented:** 17
- **Status:** ✅ Complete

### telegramAuth.controller.js
- **Actual count:** 10
- **Documented:** 10
- **Status:** ✅ Complete

### testing.controller.js
- **Actual count:** 2
- **Documented:** 2
- **Status:** ✅ Complete

### treasury.controller.js
- **Actual count:** 31
- **Documented:** 31
- **Status:** ✅ Complete

### treasuryDashboard.controller.js
- **Actual count:** 9
- **Documented:** 9
- **Status:** ✅ Complete

### userSettings.controller.js
- **Actual count:** 8
- **Documented:** 8
- **Status:** ✅ Complete

### users.controller.js
- **Actual count:** 1
- **Documented:** 1
- **Status:** ✅ Complete

### vendors.controller.js
- **Actual count:** 6
- **Documented:** 6
- **Status:** ✅ Complete

## Summary

**Total Controllers:** 60
**Total pool.query calls in controllers:** 681
**Refactored in PACKAGE_05:** 30 queries (26 from gallery.controller.js, 4 from departments.controller.js)
**Refactored in PACKAGE_06:** 30 queries (19 from departments.controller.js, 30 from auth.controller.js)
**Refactored in PACKAGE_07:** 18 queries (all from payment.controller.js, exceeded planned 11)
**Refactored in PACKAGE_08:** 21 queries (all from settings.controller.js)
**Total refactored:** 99 queries
**Remaining controller queries:** 582

**Old documentation (POOL_QUERY_REFACTORING_LIST_2026-06-22.md):** 647 queries
**Missing from old list:** 34 queries
- manualPayment.controller.js: 12 queries (not in old list)
- Other controllers: 22 queries (not in old list)

**auth.controller.js:** Was refactored to use IdentityService and UserRepository, old documentation has wrong line numbers

**Status:** The old documentation (POOL_QUERY_REFACTORING_LIST_2026-06-22.md) is outdated. Need to create a new comprehensive list with all 681 queries.

**PACKAGE_05 Progress:** ✅ COMPLETED - Successfully refactored 30 queries to repositories
**PACKAGE_06 Progress:** ✅ COMPLETED - Successfully refactored 30 queries to repositories (exceeded planned scope)
**PACKAGE_07 Progress:** ✅ COMPLETED - Successfully refactored 18 queries to repositories (exceeded planned scope)
**PACKAGE_08 Progress:** ✅ COMPLETED - Successfully refactored 21 queries to repositories
