# Unmapped Queries Analysis
**Date:** 2026-06-22
**Purpose:** Track the unmapped pool.query calls

## Summary
- **Total pool.query in controllers:** 681
- **Total controller files with pool.query:** 62 files
- **Documented in POOL_QUERY_REFACTORING_LIST_2026-06-22.md:** 647 (outdated)
- **Missing from old list:** 34 queries
- **manualPayment.controller.js:** Not in old list (12 queries)
- **auth.controller.js:** Was refactored, old documentation has wrong line numbers

## Controller Files with pool.query (61 files)

1. manualPayment.controller.js (12 queries)
2. gallery.controller.js (26 queries)
3. church.controller.js (16 queries)
4. ai.controller.js (6 queries)
5. auth.controller.js (30 queries)
6. payment.controller.js (18 queries)
7. approvals.controller.js (3 queries)
8. users.controller.js (1 query)
9. settings.controller.js (21 queries)
10. notifications.controller.js (11 queries)
11. members.controller.js (4 queries)
12. documents.controller.js (12 queries)
13. announcements.controller.js (8 queries)
14. analytics.controller.js (2 queries)
15. mobile.controller.js (9 queries)
16. palette.controller.js (13 queries)
17. telegram.controller.js (17 queries)
18. reports.controller.js (12 queries)
19. treasuryDashboard.controller.js (9 queries)
20. financialAlerts.controller.js (13 queries)
21. chartOfAccounts.controller.js (12 queries)
22. galleryAlbums.controller.js (8 queries)
23. documentVersions.controller.js (15 queries)
24. payments.controller.js (15 queries)
25. departments.controller.js (23 queries)
26. sms.controller.js (24 queries)
27. treasury.controller.js (31 queries)
28. content.controller.js (43 queries)
29. department.controller.js (40 queries)
30. reconciliation.controller.js (4 queries)
31. sync.controller.js (1 query)
32. departmentFeatures.controller.js (3 queries)
33. chat.controller.js (3 queries)
34. gateway.controller.js (2 queries)
35. fixedAssets.controller.js (10 queries)
36. accountingExport.controller.js (9 queries)
37. financialForecasting.controller.js (5 queries)
38. taxStatement.controller.js (5 queries)
39. memberGiving.controller.js (6 queries)
40. customReport.controller.js (7 queries)
41. budgets.controller.js (8 queries)
42. recurringPayments.controller.js (8 queries)
43. pledges.controller.js (7 queries)
44. projects.controller.js (5 queries)
45. vendors.controller.js (6 queries)
46. journalEntry.controller.js (6 queries)
47. smsAutomation.controller.js (9 queries)
48. security.controller.js (11 queries)
49. accessibility.controller.js (2 queries)
50. comments.controller.js (7 queries)
51. documentation.controller.js (5 queries)
52. performance.controller.js (1 query)
53. seo.controller.js (2 queries)
54. testing.controller.js (2 queries)
55. activityFeed.controller.js (5 queries)
56. search.controller.js (15 queries)
57. monitoring.controller.js (1 query)
58. socialAuth.controller.js (10 queries)
59. telegramAuth.controller.js (10 queries)
60. userSettings.controller.js (8 queries)
61. collection.controller.js (15 queries)

**Total:** 681 queries across 61 files

## Discrepancies Found

### manualPayment.controller.js
**Actual count:** 12 pool.query calls
**Not in POOL_QUERY_REFACTORING_LIST_2026-06-22.md:** 12 queries
**Lines:** 43, 87, 139, 156, 189, 249, 264, 295, 309, 329, 344, 382

### auth.controller.js
The auth.controller.js has been refactored to use IdentityService and UserRepository. The old documentation has wrong line numbers and function names.

**Actual pool.query calls (30):**
Lines: 133, 146, 160, 166, 194, 201, 296, 317, 337, 344, 369, 385, 391, 397, 417, 430, 436, 455, 479, 498, 518, 533, 539, 564, 587, 593, 615, 630, 636, 657

## Next Steps
1. Update POOL_QUERY_REFACTORING_LIST_2026-06-22.md to include manualPayment.controller.js (12 queries)
2. Update auth.controller.js documentation to match current implementation
3. Find the remaining 22 unmapped queries from other controllers
4. Add all unmapped queries to documentation
