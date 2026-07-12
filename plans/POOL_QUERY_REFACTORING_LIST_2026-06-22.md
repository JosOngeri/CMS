# Pool Query Refactoring List
**Date:** 2026-06-22  
**Total pool.query calls in controllers:** 647  
**Total pool.query calls in repositories:** 198 (acceptable - repositories should use pool.query)

## Summary by Controller

| Controller | pool.query calls | Status |
|------------|-----------------|---------|
| auth.controller.js | 30 | Needs refactoring |
| payment.controller.js | 18 | Needs refactoring |
| settings.controller.js | 21 | Needs refactoring |
| notifications.controller.js | 11 | Needs refactoring |
| documents.controller.js | 12 | Needs refactoring |
| content.controller.js | 43 | Needs refactoring |
| department.controller.js | 40 | Needs refactoring |
| treasury.controller.js | 31 | Needs refactoring |
| gallery.controller.js | 25 | Needs refactoring |
| sms.controller.js | 24 | Needs refactoring |
| departments.controller.js | 23 | Needs refactoring |
| palette.controller.js | 13 | Needs refactoring |
| telegram.controller.js | 17 | Needs refactoring |
| reports.controller.js | 12 | Needs refactoring |
| chartOfAccounts.controller.js | 12 | Needs refactoring |
| financialAlerts.controller.js | 13 | Needs refactoring |
| documentVersions.controller.js | 15 | Needs refactoring |
| payments.controller.js | 15 | Needs refactoring |
| treasuryDashboard.controller.js | 9 | Needs refactoring |
| galleryAlbums.controller.js | 8 | Needs refactoring |
| approvals.controller.js | 3 | Needs refactoring |
| users.controller.js | 1 | Needs refactoring |
| members.controller.js | 4 | Needs refactoring |
| announcements.controller.js | 8 | Needs refactoring |
| mobile.controller.js | 9 | Needs refactoring |
| analytics.controller.js | 2 | Needs refactoring |
| **TOTAL** | **647** | **Needs refactoring** |

## Detailed Breakdown by Controller

### 1. auth.controller.js (30 calls)
**Lines:** 133, 146, 160, 166, 194, 201, 296, 317, 337, 344, 369, 385, 391, 397, 417, 430, 436, 455, 479, 498, 518, 533, 539, 564, 587, 593, 615, 630, 636, 657

**Functions needing refactoring:**
- refreshToken (lines 75-112)
- logout (lines 127-157)
- updateProfile (lines 179-211)
- changePassword (lines 213-252)
- forgotPassword (lines 254-292)
- resetPassword (lines 294-326)
- verifyEmail (lines 328-357)
- getSessions (lines 359-407)
- revokeSession (lines 409-435)
- revokeAllSessions (lines 437-453)
- enableMFA (lines 455-498)
- verifyMFASetup (lines 500-548)
- disableMFA (lines 550-592)
- getAuditLog (lines 594-638)
- register (lines 640-672)

**Repository needed:** AuthRepository (or enhance UserRepository)

---

### 2. payment.controller.js (18 calls)
**Lines:** 145, 210, 351, 358, 426, 433, 524, 564, 590, 604, 644, 662, 679, 690, 729, 747, 758, 814

**Functions needing refactoring:**
- processPayment (lines 145, 210)
- getPayments (lines 351, 358)
- getPaymentAnalytics (lines 426, 433, 524)
- getPaymentById (line 564)
- processRefund (lines 590, 604, 644, 662, 679, 690, 729, 747, 758)
- getRefundAnalytics (line 814)

**Repository:** PaymentRepository exists - needs enhancement

---

### 3. settings.controller.js (21 calls)
**Lines:** 99, 130, 145, 189, 196, 213, 247, 262, 291, 328, 380, 419, 436, 488, 524, 549, 559, 583, 584, 618, 640

**Functions needing refactoring:**
- getSettings (lines 99, 130, 145)
- updateSettings (lines 189, 196, 213)
- deleteSetting (lines 247, 262)
- getSettingsByCategory (lines 291, 328)
- bulkUpdateSettings (lines 380, 419, 436)
- exportSettings (lines 488, 524)
- importSettings (lines 549, 559)
- getMaintenanceStatus (lines 583, 584)
- setMaintenanceMode (lines 618, 640)

**Repository:** SettingsRepository exists - needs enhancement

---

### 4. notifications.controller.js (11 calls)
**Lines:** 62, 90, 121, 147, 281, 311, 339, 365, 395, 428, 472

**Functions needing refactoring:**
- createNotification (line 62)
- markAsRead (line 90)
- markAllAsRead (line 121)
- deleteNotification (line 147)
- createTemplate (line 281)
- updateTemplate (lines 311, 339)
- getTemplates (line 365)
- getTemplateById (line 395)
- deleteTemplate (line 428)
- sendBulkNotifications (line 472)

**Repository:** NotificationsRepository exists - needs enhancement

---

### 5. documents.controller.js (12 calls)
**Lines:** 67, 158, 187, 267, 346, 372, 403, 431, 460, 492, 504, 513

**Functions needing refactoring:**
- uploadDocument (line 67)
- updateDocument (line 158)
- deleteDocument (line 187)
- searchDocuments (line 267)
- shareDocument (line 346)
- unshareDocument (line 372)
- getDocumentAccess (line 403)
- updateDocumentAccess (line 431)
- getDocumentVersions (line 460)
- restoreVersion (lines 492, 504, 513)

**Repository:** DocumentsRepository exists - needs enhancement

---

### 6. content.controller.js (43 calls)
**Lines:** 57, 71, 116, 128, 136, 170, 183, 205, 207, 216, 221, 243, 269, 306, 341, 353, 359, 367, 391, 413, 433, 469, 501, 533, 562, 586, 620, 651, 673, 705, 720, 744, 784, 817, 870, 894, 934, 985, 1025, 1082, 1087, 1092, 1117

**Functions needing refactoring:**
- Multiple content management functions (all functions)

**Repository:** ContentRepository exists - needs major enhancement

---

### 7. department.controller.js (40 calls)
**Lines:** 93, 134, 162, 185, 190, 209, 248, 271, 334, 346, 380, 412, 424, 432, 459, 484, 522, 534, 568, 580, 613, 626, 639, 671, 684, 710, 783, 817, 844, 869, 886, 906, 924, 941, 963, 985, 1001, 1006, 1028, 1051

**Functions needing refactoring:**
- Multiple department management functions (all functions)

**Repository:** DepartmentRepository exists - needs major enhancement

---

### 8. treasury.controller.js (31 calls)
**Lines:** 51, 122, 154, 249, 276, 306, 342, 403, 431, 452, 472, 501, 522, 538, 557, 576, 600, 624, 645, 661, 685, 709, 730, 746, 769, 823, 901, 922, 991, 1020, 1049

**Functions needing refactoring:**
- Multiple treasury management functions (all functions)

**Repository:** TreasuryRepository exists - needs major enhancement

---

### 9. gallery.controller.js (25 calls)
**Lines:** 45, 105, 140, 178, 216, 257, 295, 338, 366, 393, 426, 484, 548, 599, 627, 667, 701, 707, 713, 719, 753, 784, 811, 814, 839

**Functions needing refactoring:**
- Multiple gallery management functions (all functions)

**Repository:** GalleryRepository exists - needs major enhancement

---

### 10. sms.controller.js (24 calls)
**Lines:** 47, 69, 116, 147, 169, 199, 202, 208, 215, 273, 300, 344, 368, 379, 392, 437, 494, 526, 555, 560, 585, 608, 637, 732

**Functions needing refactoring:**
- Multiple SMS management functions (all functions)

**Repository:** SMSRepository exists - needs major enhancement

---

### 11. departments.controller.js (23 calls)
**Lines:** 55, 62, 96, 134, 175, 203, 238, 284, 313, 371, 400, 433, 470, 509, 565, 596, 631, 657, 701, 763, 772, 804, 837

**Functions needing refactoring:**
- Multiple departments management functions (all functions)

**Repository:** DepartmentsRepository exists - needs major enhancement

---

### 12. palette.controller.js (13 calls)
**Lines:** 106, 116, 127, 159, 176, 188, 195, 223, 240, 246, 271, 276, 325

**Functions needing refactoring:**
- Multiple palette management functions (all functions)

**Repository:** PaletteRepository exists - needs major enhancement

---

### 13. telegram.controller.js (17 calls)
**Lines:** 62, 94, 135, 165, 185, 247, 266, 300, 337, 618, 634, 654, 867, 918, 938, 958, 989

**Functions needing refactoring:**
- Multiple telegram management functions (all functions)

**Repository:** TelegramRepository exists - needs major enhancement

---

### 14. reports.controller.js (12 calls)
**Lines:** 44, 95, 166, 218, 303, 330, 353, 377, 471, 512, 539, 567

**Functions needing refactoring:**
- Multiple reports management functions (all functions)

**Repository:** ReportsRepository exists - needs major enhancement

---

### 15. chartOfAccounts.controller.js (12 calls)
**Lines:** 62, 117, 128, 146, 169, 191, 209, 236, 249, 261, 301, 307

**Functions needing refactoring:**
- Multiple chart of accounts functions (all functions)

**Repository:** ChartOfAccountsRepository exists - needs major enhancement

---

### 16. financialAlerts.controller.js (13 calls)
**Lines:** 39, 63, 82, 108, 128, 144, 150, 190, 206, 212, 252, 266, 272

**Functions needing refactoring:**
- Multiple financial alerts functions (all functions)

**Repository:** FinancialAlertsRepository exists - needs major enhancement

---

### 17. documentVersions.controller.js (15 calls)
**Lines:** 70, 80, 88, 108, 120, 128, 151, 168, 191, 203, 221, 237, 273, 302, 322

**Functions needing refactoring:**
- Multiple document version functions (all functions)

**Repository:** DocumentVersionsRepository exists - needs major enhancement

---

### 18. payments.controller.js (15 calls)
**Lines:** 24, 107, 135, 168, 237, 262, 296, 335, 362, 407, 429, 502, 507, 535, 565

**Functions needing refactoring:**
- Multiple payments functions (all functions)

**Repository:** PaymentsRepository exists - needs major enhancement

---

### 19. treasuryDashboard.controller.js (9 calls)
**Lines:** 29, 39, 50, 56, 64, 72, 154, 183, 207

**Functions needing refactoring:**
- Multiple treasury dashboard functions (all functions)

**Repository:** TreasuryDashboardRepository exists - needs major enhancement

---

### 20. galleryAlbums.controller.js (8 calls)
**Lines:** 68, 90, 123, 135, 166, 196, 221, 242

**Functions needing refactoring:**
- Multiple gallery albums functions (all functions)

**Repository:** GalleryAlbumsRepository exists - needs major enhancement

---

### 21. approvals.controller.js (3 calls)
**Lines:** 228, 249, 265

**Functions needing refactoring:**
- createApproval (line 228)
- getWorkflows (line 249)
- updateApprovalStatus (line 265)

**Repository:** ApprovalsRepository exists - needs enhancement

---

### 22. users.controller.js (1 call)
**Lines:** 190

**Functions needing refactoring:**
- deleteUser (line 190)

**Repository:** UsersRepository exists - needs enhancement (add delete method)

---

### 23. members.controller.js (4 calls)
**Lines:** 118, 145, 189, 249

**Functions needing refactoring:**
- createMember (line 118)
- updateMember (line 145)
- getMemberStats (line 189)
- deleteMember (line 249)

**Repository:** MembersRepository exists - needs enhancement

---

### 24. announcements.controller.js (8 calls)
**Lines:** 118, 175, 198, 237, 252, 296, 297, 340

**Functions needing refactoring:**
- Multiple announcements functions (all functions)

**Repository:** AnnouncementsRepository exists - needs major enhancement

---

### 25. mobile.controller.js (9 calls)
**Lines:** 70, 99, 123, 151, 176, 200, 201, 202, 203

**Functions needing refactoring:**
- Multiple mobile functions (all functions)

**Repository:** MobileRepository exists - needs major enhancement

---

### 26. analytics.controller.js (2 calls)
**Lines:** 119, 152

**Functions needing refactoring:**
- getAnalytics (line 119)
- getCustomReport (line 152)

**Repository:** AnalyticsRepository exists - needs enhancement

---

## Refactoring Strategy

### Priority 1: High-Usage Controllers (100+ calls)
- content.controller.js (43)
- department.controller.js (40)
- treasury.controller.js (31)
- gallery.controller.js (25)
- sms.controller.js (24)
- departments.controller.js (23)

### Priority 2: Medium-Usage Controllers (10-20 calls)
- settings.controller.js (21)
- payment.controller.js (18)
- auth.controller.js (30)
- palette.controller.js (13)
- telegram.controller.js (17)
- reports.controller.js (12)
- chartOfAccounts.controller.js (12)
- financialAlerts.controller.js (13)
- documentVersions.controller.js (15)
- payments.controller.js (15)
- notifications.controller.js (11)
- documents.controller.js (12)

### Priority 3: Low-Usage Controllers (<10 calls)
- treasuryDashboard.controller.js (9)
- galleryAlbums.controller.js (8)
- announcements.controller.js (8)
- mobile.controller.js (9)
- approvals.controller.js (3)
- members.controller.js (4)
- analytics.controller.js (2)
- users.controller.js (1)

## Next Steps

1. Start with Priority 1 controllers (highest impact)
2. For each controller:
   - Add missing methods to corresponding repository
   - Replace pool.query calls with repository method calls
   - Test each refactored function
3. Move to Priority 2, then Priority 3
4. Verify all 647 calls have been replaced
5. Update session log with progress
