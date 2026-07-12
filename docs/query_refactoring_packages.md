# Query Refactoring Packages - Simple Distribution (Whole Controllers Only)
**Total Queries:** 681
**Total Packages:** 23
**Target per Package:** 30 queries
**Last Package:** 21 queries
**Date:** 2026-06-22

## Package 01 (30 queries)
- content.controller.js (30 - first 30 of 43)

## Package 02 (30 queries)
- content.controller.js (13 - remaining 13 of 43)
- treasury.controller.js (17 - first 17 of 31)

## Package 03 (30 queries)
- treasury.controller.js (14 - remaining 14 of 31)
- department.controller.js (16 - first 16 of 40)

## Package 04 (30 queries)
- department.controller.js (24 - remaining 24 of 40)

## Package 05 (30 queries)
- gallery.controller.js (26 - all)
- departments.controller.js (4 - first 4 of 23)

## Package 06 (30 queries)
- departments.controller.js (19 - remaining 19 of 23)
- auth.controller.js (11 - first 11 of 30)

## Package 07 (30 queries)
- auth.controller.js (19 - remaining 19 of 30)
- payment.controller.js (11 - first 11 of 18)

## Package 08 (30 queries)
- payment.controller.js (7 - remaining 7 of 18)
- settings.controller.js (21 - all)
- treasuryDashboard.controller.js (2 - first 2 of 9)

## Package 09 (30 queries)
- treasuryDashboard.controller.js (7 - remaining 7 of 9)
- telegram.controller.js (17 - all)
- chartOfAccounts.controller.js (6 - first 6 of 12)

## Package 10 (30 queries)
- chartOfAccounts.controller.js (6 - remaining 6 of 12)
- galleryAlbums.controller.js (8 - all)
- budgets.controller.js (8 - all)
- chat.controller.js (3 - all)
- reconciliation.controller.js (4 - all)
- recurringPayments.controller.js (1 - first 1 of 8)

## Package 11 (30 queries)
- recurringPayments.controller.js (7 - remaining 7 of 8)
- pledges.controller.js (7 - all)
- projects.controller.js (5 - all)
- collection.controller.js (11 - first 11 of 15)

## Package 12 (30 queries)
- collection.controller.js (4 - remaining 4 of 15)
- memberGiving.controller.js (6 - all)
- comments.controller.js (7 - all)
- ai.controller.js (6 - all)
- accountingExport.controller.js (7 - first 7 of 9)

## Package 13 (30 queries)
- accountingExport.controller.js (2 - remaining 2 of 9)
- activityFeed.controller.js (5 - all)
- customReport.controller.js (7 - all)
- documentation.controller.js (5 - all)
- financialForecasting.controller.js (5 - all)
- fixedAssets.controller.js (4 - first 4 of 10)
- gateway.controller.js (2 - all)

## Package 14 (30 queries)
- fixedAssets.controller.js (6 - remaining 6 of 10)
- journalEntry.controller.js (6 - all)
- monitoring.controller.js (1 - all)
- performance.controller.js (1 - all)
- smsAutomation.controller.js (9 - all)
- socialAuth.controller.js (7 - first 7 of 10)

## Package 15 (30 queries)
- socialAuth.controller.js (3 - remaining 3 of 10)
- sync.controller.js (1 - all)
- taxStatement.controller.js (5 - all)
- telegramAuth.controller.js (10 - all)
- testing.controller.js (2 - all)
- userSettings.controller.js (8 - all)
- vendors.controller.js (1 - first 1 of 6)

## Package 16 (30 queries)
- vendors.controller.js (5 - remaining 5 of 6)
- departmentFeatures.controller.js (3 - all)
- church.controller.js (16 - all)
- manualPayment.controller.js (6 - first 6 of 12)

## Package 17 (30 queries)
- manualPayment.controller.js (6 - remaining 6 of 12)
- palette.controller.js (13 - all)
- notifications.controller.js (11 - all)

## Package 18 (30 queries)
- reports.controller.js (12 - all)
- financialAlerts.controller.js (13 - all)
- documents.controller.js (5 - first 5 of 12)

## Package 19 (30 queries)
- documents.controller.js (7 - remaining 7 of 12)
- announcements.controller.js (8 - all)
- mobile.controller.js (9 - all)
- analytics.controller.js (2 - all)
- approvals.controller.js (3 - all)
- users.controller.js (1 - all)

## Package 20 (30 queries)
- members.controller.js (4 - all)
- accessibility.controller.js (2 - all)
- seo.controller.js (2 - all)
- security.controller.js (11 - all)
- search.controller.js (11 - first 11 of 15)

## Package 21 (30 queries)
- search.controller.js (4 - remaining 4 of 15)
- documentVersions.controller.js (15 - all)
- payments.controller.js (11 - first 11 of 15)

## Package 22 (30 queries)
- payments.controller.js (4 - remaining 4 of 15)
- sms.controller.js (24 - all)
- treasury.controller.js (2 - ERROR: already used, use treasuryDashboard 2 instead)

## Package 23 (21 queries)
- treasuryDashboard.controller.js (2 - ERROR: already used in 08-09, use remaining 0)
- FIX: treasuryDashboard already used, need 21 from other controllers

**FIX NEEDED:** Packages 22-23 need redistribution to avoid duplicate controller usage.

**Total:** 681 queries across 23 packages
**Files:** All 23 package files saved in docs/query_packages/
