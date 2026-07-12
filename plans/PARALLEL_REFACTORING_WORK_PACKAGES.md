# Pool Query Refactoring - Parallel Work Packages
**Date:** 2026-06-22  
**Total Controllers:** 39  
**Total pool.query calls:** 647  
**Documented:** 378/647 (58%)  
**Remaining to Document:** 269 queries

---

## Work Package Structure

### Phase 1: High-Priority Controllers (COMPLETED)
**Status:** ✅ All documented, ready for implementation
**Total Queries:** 236

#### Work Package 1A: Core Authentication & User Management
**Controllers:** auth.controller.js (30), users.controller.js (1)
**Total Queries:** 31
**Repository:** AuthRepository (new) + UserRepository (enhance)
**Priority:** CRITICAL - Security layer

**Tasks:**
1. Create AuthRepository with 17 new methods
2. Enhance UserRepository with 4 new methods
3. Refactor auth.controller.js (30 queries)
4. Refactor users.controller.js (1 query)
5. Test authentication flows

**Repository Methods Needed:**
- AuthRepository: findValidRefreshToken, invalidateRefreshToken, deleteRefreshToken, createRefreshToken, logLoginAttempt, createPasswordResetToken, findValidPasswordResetToken, invalidatePasswordResetToken, cleanupExpiredPasswordResetTokens, findValidEmailVerificationToken, invalidateEmailVerificationToken, getUserActiveSessions, getUserLoginHistory, revokeSession, revokeAllUserSessions, logAuthAudit, getUserAuthAuditLog
- UserRepository: getUserRoles, activateUser, enableMFA, disableMFA

---

#### Work Package 1B: Financial Core
**Controllers:** treasury.controller.js (31), payments.controller.js (15), payment.controller.js (18)
**Total Queries:** 64
**Repository:** TreasuryRepository (enhance) + PaymentsRepository (enhance) + PaymentRepository (enhance)
**Priority:** HIGH - Financial data integrity

**Tasks:**
1. Enhance TreasuryRepository with 12 new methods
2. Enhance PaymentsRepository with 6 new methods
3. Enhance PaymentRepository with 6 new methods
4. Refactor treasury.controller.js (31 queries)
5. Refactor payments.controller.js (15 queries)
6. Refactor payment.controller.js (18 queries)
7. Test financial operations

**Repository Methods Needed:**
- TreasuryRepository: createAccount, createTransaction, updateTransaction, createBudget, getBudgetItemsWithCategories, addBudgetItem, getBudgetVsActual, updateVendor, deleteVendor, getTransactionSummary, updateRecurringPayment, deleteRecurringPayment, getAllReceipts, getReceiptById, getAllProjects, createProject, updateProject, deleteProject, getAllPledges, createPledge, updatePledge, deletePledge, getAllPledgeCampaigns, createPledgeCampaign, getAccounts, getIncomeSummary, getExpenseSummary, getAssets, getLiabilities, getEquity
- PaymentsRepository: updatePaymentStatus, getPaymentCount, getPaymentsByDateRange, getPaymentMethodStats, findById, getRefundStats, createRefund, createApprovalWorkflow, updateRefundStatus
- PaymentRepository: processPayment, getPaymentAnalytics, getPaymentById, processRefund, approveRefund, rejectRefund

---

#### Work Package 1C: Content Management
**Controllers:** content.controller.js (43), documents.controller.js (12), announcements.controller.js (8)
**Total Queries:** 63
**Repository:** ContentRepository (enhance) + DocumentsRepository (enhance) + AnnouncementsRepository (enhance)
**Priority:** HIGH - Core content functionality

**Tasks:**
1. Enhance ContentRepository with 38 new methods
2. Enhance DocumentsRepository with 5 new methods
3. Enhance AnnouncementsRepository with 6 new methods
4. Refactor content.controller.js (43 queries)
5. Refactor documents.controller.js (12 queries)
6. Refactor announcements.controller.js (8 queries)
7. Test content operations

**Repository Methods Needed:**
- ContentRepository: getBySlugPublished, getTagsByContentId, addTagToContent, createInitialRevision, findById, update, removeAllTagsFromContent, getNextRevisionNumber, createRevision, delete, publish, getRevisionsWithAuthor, findRevisionById, getCurrentRevisionNumber, rollbackContent, createRollbackRevision, getAllCategories, getAllTags, getAllWebsiteSettings, upsertWebsiteSetting, getCollaboratorsWithUsers, addCollaborator, removeCollaborator, getCommentsWithReplyCount, createComment, getActiveLock, lockContent, getLock, unlockContent, getActiveLocksWithUsers, scheduleContent, unpublish, getScheduledContent, quickUpdate, search, exportContent, importContent, getStatusStats, getTypeStats, getCategoryStats, getTimeStats
- DocumentsRepository: shareDocument, unshareDocument, getDocumentAccess, updateDocumentAccess, restoreVersion, createVersion, updateTimestamp
- AnnouncementsRepository: getByChurchId, getByChurchIdAndAudience, publish, notifyUsers, schedule

---

#### Work Package 1D: Department Management
**Controllers:** department.controller.js (40), departments.controller.js (23)
**Total Queries:** 63
**Repository:** DepartmentRepository (enhance) + DepartmentsRepository (enhance)
**Priority:** HIGH - Department operations

**Tasks:**
1. Enhance DepartmentRepository with 22 new methods
2. Enhance DepartmentsRepository with 13 new methods
3. Refactor department.controller.js (40 queries)
4. Refactor departments.controller.js (23 queries)
5. Test department operations

**Repository Methods Needed:**
- DepartmentRepository: getMemberStats, getDepartmentHead, getUserRole, getActiveMemberCount, getMeetingStats, getUpcomingMeetings, getPendingTasks, checkMembership, setMemberRole, deactivateMember, getActiveMembersWithRoles, updateInfo, updateHead, updateStatus, getPermissions, setPermission, getActivity, logActivity, getBranding, updateBranding, getBudget, getMemberCount, getMeetingCount, getSettings, upsertSetting
- DepartmentsRepository: create, update, delete, addMember, removeMember, getMeetings, createMeeting, getTasks, createTask, updateTask, getResourcesWithDetails, addResource, setPermission, getActivitiesWithUsers, logActivity, getDepartmentHead, updateInfo, updateSettings, getTaskStats, getResourceCount

---

#### Work Package 1E: Gallery & Media
**Controllers:** gallery.controller.js (25), galleryAlbums.controller.js (8)
**Total Queries:** 33
**Repository:** GalleryRepository (enhance) + GalleryAlbumsRepository (enhance)
**Priority:** HIGH - Media management

**Tasks:**
1. Enhance GalleryRepository with 20 new methods
2. Enhance GalleryAlbumsRepository with 5 new methods
3. Refactor gallery.controller.js (25 queries)
4. Refactor galleryAlbums.controller.js (8 queries)
5. Test gallery operations

**Repository Methods Needed:**
- GalleryRepository: getAlbumCategories, createAlbum, updateAlbum, deleteAlbum, uploadPhoto, updatePhoto, deletePhoto, addPhotoTag, removePhotoTag, getCommentsWithAuthor, addComment, searchPhotos, getPhotos, getAlbums, setCoverPhoto, toggleVisibility, getViewCount, getDownloadCount, getCommentCount, getShareCount, logDownload, logShare, getTotalPhotoCount, getPhotosByAlbum, getUploadTrends
- GalleryAlbumsRepository: createAlbum, updateAlbum, deleteAlbum, addPhoto, removePhoto, updatePhotoOrder, setCoverPhoto

---

#### Work Package 1F: SMS & Communications
**Controllers:** sms.controller.js (24)
**Total Queries:** 24
**Repository:** SMSRepository (enhance)
**Priority:** HIGH - Communication system

**Tasks:**
1. Enhance SMSRepository with 18 new methods
2. Refactor sms.controller.js (24 queries)
3. Test SMS operations

**Repository Methods Needed:**
- SMSRepository: createProvider, getRecentLogs, getProvidersWithStats, createCampaign, updateCampaignStatus, getAllActiveUserPhones, getUserPhonesByIds, createSMSLog, createTemplate, deactivateTemplate, pauseCampaign, getCampaignStats, getCampaignTrends, getTopRecipients, getRecentSentCount, getTemplateStats, getTemplateVersions, approveTemplate, createTemplateVersion, rejectTemplate, getABTests, getCampaignById, getTopContributors

---

### Phase 2: Medium-Priority Controllers (COMPLETED)
**Status:** ✅ All documented, ready for implementation
**Total Queries:** 142

#### Work Package 2A: Settings & Configuration
**Controllers:** settings.controller.js (21), palette.controller.js (13)
**Total Queries:** 34
**Repository:** SettingsRepository (enhance) + PaletteRepository (enhance)
**Priority:** MEDIUM - Configuration management

**Tasks:**
1. Enhance SettingsRepository with 10 new methods
2. Enhance PaletteRepository with 8 new methods
3. Refactor settings.controller.js (21 queries)
4. Refactor palette.controller.js (13 queries)
5. Test configuration operations

**Repository Methods Needed:**
- SettingsRepository: getByChurchId, getByKeyAndChurch, upsertSetting, getByKeyAndChurch, getByCategoryAndChurch, getByCategoryAndChurchOrdered, bulkUpdateSettings, getByChurchIdOrdered, exportSettings, getMaintenanceStatus
- PaletteRepository: findByName, createPalette, addColor, findById, updatePalette, removeAllColors, resetAllDefaults, setDefault, setUserPreference

---

#### Work Package 2B: Notifications & Approvals
**Controllers:** notifications.controller.js (11), approvals.controller.js (3)
**Total Queries:** 14
**Repository:** NotificationsRepository (enhance) + ApprovalsRepository (enhance)
**Priority:** MEDIUM - Notification system

**Tasks:**
1. Enhance NotificationsRepository with 6 new methods
2. Enhance ApprovalsRepository with 5 new methods
3. Refactor notifications.controller.js (11 queries)
4. Refactor approvals.controller.js (3 queries)
5. Test notification operations

**Repository Methods Needed:**
- NotificationsRepository: createNotification, markAsRead, markAllAsRead, delete, createTemplate, createBulkNotifications
- ApprovalsRepository: createApprovalWorkflow, getActiveWorkflows, updateApprovalStatus, getById, getWithDetails

---

#### Work Package 2C: Treasury & Financial Reporting
**Controllers:** treasuryDashboard.controller.js (9), reports.controller.js (12)
**Total Queries:** 21
**Repository:** TreasuryDashboardRepository (enhance) + ReportsRepository (enhance)
**Priority:** MEDIUM - Financial reporting

**Tasks:**
1. Enhance TreasuryDashboardRepository with 4 new methods
2. Enhance ReportsRepository with 5 new methods
3. Refactor treasuryDashboard.controller.js (9 queries)
4. Refactor reports.controller.js (12 queries)
5. Test reporting operations

**Repository Methods Needed:**
- TreasuryDashboardRepository: getTotalIncome, getTotalExpenses, getTotalFundBalance, getPendingApprovalsCount, getActiveProjectsCount, getPendingPledgesStats, getBudgetPerformance, getIncomeVsExpense, getTopExpenseCategories
- ReportsRepository: getSavedReports, getReportById, generateReport, exportReport, saveReport, executeReport, scheduleReport, getScheduledReportsWithCreator, getReportExecutions

---

#### Work Package 2D: Chart of Accounts & Financial Alerts
**Controllers:** chartOfAccounts.controller.js (12), financialAlerts.controller.js (13)
**Total Queries:** 25
**Repository:** ChartOfAccountsRepository (enhance) + FinancialAlertsRepository (enhance)
**Priority:** MEDIUM - Financial structure

**Tasks:**
1. Enhance ChartOfAccountsRepository with 5 new methods
2. Enhance FinancialAlertsRepository with 11 new methods
3. Refactor chartOfAccounts.controller.js (12 queries)
4. Refactor financialAlerts.controller.js (13 queries)
5. Test financial structure operations

**Repository Methods Needed:**
- ChartOfAccountsRepository: findByCode, findById, create, update, delete, getChildAccountCount, getJournalEntryCount, getByType, getAccountBalance
- FinancialAlertsRepository: getAllWithUser, create, update, delete, getBudgetsWithVariance, checkExistingAlert, getFundsWithLowBalance, checkBudgetAlerts, checkFundAlerts, checkPaymentAlerts, getOverduePayments

---

#### Work Package 2E: Document Management
**Controllers:** documentVersions.controller.js (15), payments.controller.js (15)
**Total Queries:** 30
**Repository:** DocumentVersionsRepository (enhance) + PaymentsRepository (enhance)
**Priority:** MEDIUM - Document management

**Tasks:**
1. Enhance DocumentVersionsRepository with 8 new methods
2. Enhance PaymentsRepository with 6 new methods (duplicate from 1B)
3. Refactor documentVersions.controller.js (15 queries)
4. Refactor payments.controller.js (15 queries)
5. Test document operations

**Repository Methods Needed:**
- DocumentVersionsRepository: getDocumentTitle, getCurrentDocumentPath, getPermissionsWithDetails, grantPermission, revokePermission, getAccessLogsWithUsers, findVersionByDocument, rollbackFromId
- PaymentsRepository: (duplicate from 1B)

---

#### Work Package 2F: Telegram Integration
**Controllers:** telegram.controller.js (17)
**Total Queries:** 17
**Repository:** TelegramRepository (enhance)
**Priority:** MEDIUM - External integration

**Tasks:**
1. Enhance TelegramRepository with 13 new methods
2. Refactor telegram.controller.js (17 queries)
3. Test telegram operations

**Repository Methods Needed:**
- TelegramRepository: createChannel, updateChannel, deleteChannel, findById, cachePhoto, getSettings, updateSettings, configureMTProto, updateAuthStatus, testMTProtoConnection, getMTProtoChannels, syncChannelPosts, upsertPost, updateLastSync

---

### Phase 3: Low-Priority Controllers (IN PROGRESS)
**Status:** ⏳ Being documented
**Total Queries:** 269

#### Work Package 3A: Budgets & Projects
**Controllers:** budgets.controller.js (8), projects.controller.js (5), pledges.controller.js (7)
**Total Queries:** 20
**Repository:** BudgetsRepository (new) + ProjectsRepository (new) + PledgesRepository (new)
**Priority:** LOW - Financial planning

**Tasks:**
1. Create BudgetsRepository with 8 methods
2. Create ProjectsRepository with 5 methods
3. Create PledgesRepository with 7 methods
4. Refactor budgets.controller.js (8 queries)
5. Refactor projects.controller.js (5 queries)
6. Refactor pledges.controller.js (7 queries)
7. Test planning operations

**Repository Methods Needed:**
- BudgetsRepository: getBudgets, getBudgetWithTotal, getBudgetLineItems, update, delete, approve, getBudgetVariance
- ProjectsRepository: getProjects, getWithDetails, create, update, delete
- PledgesRepository: getPledges, getWithDetails, create, update, delete, findById, updateAmountPaid

---

#### Work Package 3B: Collections & Giving
**Controllers:** collection.controller.js (15), memberGiving.controller.js (6)
**Total Queries:** 21
**Repository:** CollectionRepository (new) + MemberGivingRepository (new)
**Priority:** LOW - Donation management

**Tasks:**
1. Create CollectionRepository with 15 methods
2. Create MemberGivingRepository with 6 methods
3. Refactor collection.controller.js (15 queries)
4. Refactor memberGiving.controller.js (6 queries)
5. Test donation operations

**Repository Methods Needed:**
- CollectionRepository: getPersonalCollections, createPersonal, exportPersonal, checkEventCollection, createEvent, updateEventHasCollection, getEventCollections, getContributionCount, findById, updateEvent, findById, createContribution, updateCurrentAmount, getAmounts, markCompleted
- MemberGivingRepository: getGivingHistory, getGivingStats, getPledges, getTithing, getYearOverYear, getAnnualReport

---

#### Work Package 3C: Chat & Reconciliation
**Controllers:** chat.controller.js (3), reconciliation.controller.js (4)
**Total Queries:** 7
**Repository:** ChatRepository (new) + ReconciliationRepository (new)
**Priority:** LOW - Communication features

**Tasks:**
1. Create ChatRepository with 3 methods
2. Create ReconciliationRepository with 4 methods
3. Refactor chat.controller.js (3 queries)
4. Refactor reconciliation.controller.js (4 queries)
5. Test chat and reconciliation operations

**Repository Methods Needed:**
- ChatRepository: getChatRooms, getMessagesWithUsers, createMessage
- ReconciliationRepository: addToQueue, getPending, findById, updateStatus

---

#### Work Package 3D: Recurring Payments
**Controllers:** recurringPayments.controller.js (8)
**Total Queries:** 8
**Repository:** RecurringPaymentsRepository (new)
**Priority:** LOW - Automated payments

**Tasks:**
1. Create RecurringPaymentsRepository with 8 methods
2. Refactor recurringPayments.controller.js (8 queries)
3. Test recurring payment operations

**Repository Methods Needed:**
- RecurringPaymentsRepository: getRecurringPayments, getWithDetails, create, getScheduleInfo, update, delete, pause, resume

---

#### Work Package 3E: Comments & AI
**Controllers:** comments.controller.js (7), ai.controller.js (6)
**Total Queries:** 13
**Repository:** CommentsRepository (new) + AIRepository (new)
**Priority:** LOW - Interactive features

**Tasks:**
1. Create CommentsRepository with 7 methods
2. Create AIRepository with 6 methods
3. Refactor comments.controller.js (7 queries)
4. Refactor ai.controller.js (6 queries)
5. Test comments and AI operations

**Repository Methods Needed:**
- CommentsRepository: getCommentsWithUsers, create, getWithUser, getUserId, update, delete
- AIRepository: checkRateLimit, logUsage, getChurchSettings, logUsage, logUsage, getUsageStats

---

#### Work Package 3F: Accounting & Activity
**Controllers:** accountingExport.controller.js (9), activityFeed.controller.js (5)
**Total Queries:** 14
**Repository:** AccountingExportRepository (new) + ActivityFeedRepository (new)
**Priority:** LOW - Accounting features

**Tasks:**
1. Create AccountingExportRepository with 9 methods
2. Create ActivityFeedRepository with 5 methods
3. Refactor accountingExport.controller.js (9 queries)
4. Refactor activityFeed.controller.js (5 queries)
5. Test accounting and activity operations

**Repository Methods Needed:**
- AccountingExportRepository: getJournalEntries, getWithCreator, exportJournalEntry, getJournalEntryLines, createExportRecord, getChartOfAccounts, getExportHistory, getExportHistory
- ActivityFeedRepository: checkDepartmentAccess, getActivities, getActivityCount, getActivities, getActivitySummary

---

#### Work Package 3G: Custom Reports & Documentation
**Controllers:** customReport.controller.js (7), documentation.controller.js (5)
**Total Queries:** 12
**Repository:** CustomReportRepository (new) + DocumentationRepository (new)
**Priority:** LOW - Reporting features

**Tasks:**
1. Create CustomReportRepository with 7 methods
2. Create DocumentationRepository with 5 methods
3. Refactor customReport.controller.js (7 queries)
4. Refactor documentation.controller.js (5 queries)
5. Test custom report and documentation operations

**Repository Methods Needed:**
- CustomReportRepository: getCustomReports, getWithCreator, getColumns, getFilters, delete, getWithCreator, executeQuery
- DocumentationRepository: getAll, findById, create, update, delete

---

#### Work Package 3H: Financial Forecasting & Fixed Assets
**Controllers:** financialForecasting.controller.js (5), fixedAssets.controller.js (10)
**Total Queries:** 15
**Repository:** FinancialForecastingRepository (new) + FixedAssetsRepository (new)
**Priority:** LOW - Financial planning

**Tasks:**
1. Create FinancialForecastingRepository with 5 methods
2. Create FixedAssetsRepository with 10 methods
3. Refactor financialForecasting.controller.js (5 queries)
4. Refactor fixedAssets.controller.js (10 queries)
5. Test forecasting and asset operations

**Repository Methods Needed:**
- FinancialForecastingRepository: getHistoricalRevenue, getHistoricalExpenses, findById, getHistoricalBudget, getHistoricalCashFlow
- FixedAssetsRepository: getFixedAssets, getWithDetails, create, update, delete, findById, updateDepreciation, dispose, findById, dispose, findById

---

#### Work Package 3I: Gateway & Journal Entry
**Controllers:** gateway.controller.js (2), journalEntry.controller.js (6)
**Total Queries:** 8
**Repository:** GatewayRepository (new) + JournalEntryRepository (new)
**Priority:** LOW - Infrastructure

**Tasks:**
1. Create GatewayRepository with 2 methods
2. Create JournalEntryRepository with 6 methods
3. Refactor gateway.controller.js (2 queries)
4. Refactor journalEntry.controller.js (6 queries)
5. Test gateway and journal entry operations

**Repository Methods Needed:**
- GatewayRepository: registerGateway, getByChurchId
- JournalEntryRepository: getJournalEntries, getWithCreator, getLinesWithAccounts, updateStatus, getStatus, delete

---

#### Work Package 3J: Monitoring & Performance
**Controllers:** monitoring.controller.js (1), performance.controller.js (1)
**Total Queries:** 2
**Repository:** MonitoringRepository (new) + PerformanceRepository (new)
**Priority:** LOW - System monitoring

**Tasks:**
1. Create MonitoringRepository with 1 method
2. Create PerformanceRepository with 1 method
3. Refactor monitoring.controller.js (1 query)
4. Refactor performance.controller.js (1 query)
5. Test monitoring and performance operations

**Repository Methods Needed:**
- MonitoringRepository: getRecentLogs
- PerformanceRepository: getCacheStats

---

#### Work Package 3K: Remaining Controllers (DOCUMENTED)
**Controllers:** accessibility.controller.js (2), search.controller.js (10), security.controller.js (10), seo.controller.js (2), smsAutomation.controller.js (9), socialAuth.controller.js (10), sync.controller.js (1), taxStatement.controller.js (5), telegramAuth.controller.js (10), testing.controller.js (2), userSettings.controller.js (8), vendors.controller.js (6), departmentFeatures.controller.js (3), church.controller.js (15), manualPayment.controller.js (10)
**Total Queries:** 103
**Priority:** LOW - Various features

**Status:** ✅ ALL DOCUMENTED

**Tasks:**
1. ✅ Document remaining controllers
2. Create repositories as needed
3. Refactor controllers
4. Test operations

**Repository Methods Needed:**
- AccessibilityRepository: getSettings, updateSettings
- SearchRepository: searchMembers, searchContent, searchDepartments, searchDocuments, searchUsers, searchMembersAdvanced, searchDocumentsAdvanced, searchEventsAdvanced, searchAnnouncementsAdvanced, getMemberSuggestions
- SecurityRepository: getRecentLogs, getRecentFailedLogins, getAllBlockedIPs, blockIP, unblockIP, getActiveSessions, revokeAllSessions, getSettings, updateSettings, getSecurityAudit
- SEORepository: getSettings, updateSettings
- SmsAutomationRepository: getAutomationRules, getWithCreator, create, update, delete, findById, getTemplate, getActiveRulesByTrigger
- SocialAuthRepository: findByGoogleId, findByEmail, linkGoogleAccount, createGoogleUser, getDefaultRole, assignRole, logAuthAudit, getUserRoles, createRefreshToken, logAuthAudit
- SyncRepository: getTableUpdates
- TaxStatementRepository: getTaxStatements, getWithMember, getLineItems, update, delete
- TelegramAuthRepository: getAll, resetAllDefaults, create, update, delete, resetAllDefaults, setDefault, findById, findById
- TestingRepository: getRecentResults, recordResult
- UserSettingsRepository: getPreferences, createDefaultPreferences, updatePreferences, insertPreference, getPasswordHash, updatePassword, getActivityFeed, getActivityCount
- VendorsRepository: getVendors, findById, create, update, getTransactionCount, delete
- DepartmentFeaturesRepository: getFeaturesWithAllocation, findBySlug, enableFeature
- ChurchRepository: getAll, findById, findBySlug, findBySlug, create, findById, checkSlugAvailability, update, findById, getUserCount, delete, getUserCount, getMemberCount, getPaymentCount, getDepartmentCount
- ManualPaymentRepository: createManualPayment, getTodayPaymentCount, getManualPayments, getWithCreator, getMemberHistory, findById, update, findById, delete, getMembers

---

## Parallel Execution Strategy

### Recommended Agent Assignment

**Agent 1:** Work Packages 1A + 1B (Security & Financial Core)
**Agent 2:** Work Packages 1C + 1D (Content & Departments)
**Agent 3:** Work Packages 1E + 1F (Gallery & SMS)
**Agent 4:** Work Packages 2A + 2B (Settings & Notifications)
**Agent 5:** Work Packages 2C + 2D (Treasury Reports & Financial Structure)
**Agent 6:** Work Packages 2E + 2F (Documents & Telegram)
**Agent 7:** Work Packages 3A + 3B (Budgets & Collections)
**Agent 8:** Work Packages 3C + 3D (Chat & Recurring Payments)
**Agent 9:** Work Packages 3E + 3F (Comments & AI)
**Agent 10:** Work Packages 3G + 3H (Custom Reports & Financial Forecasting)

### Execution Order

1. **Phase 1 (High Priority):** Work Packages 1A-1F (6 agents in parallel)
2. **Phase 2 (Medium Priority):** Work Packages 2A-2F (6 agents in parallel)
3. **Phase 3 (Low Priority):** Work Packages 3A-3K (sequential or as needed)

### Dependencies

**No Cross-Package Dependencies:** Each work package is independent and can be executed in parallel within phases.

**Within Package Dependencies:**
- Repository methods must be created before controller refactoring
- Testing should happen after refactoring is complete

### Verification

Each work package should:
1. ✅ Create all required repository methods
2. ✅ Refactor all controller pool.query calls
3. ✅ Test the refactored functionality
4. ✅ Update this document with completion status

---

## Progress Tracking

### Phase 1: High Priority (236 queries)
- ✅ **Work Package 1A:** Auth + Users (31 queries) - DOCUMENTED
- ✅ **Work Package 1B:** Treasury + Payments (64 queries) - DOCUMENTED
- ✅ **Work Package 1C:** Content + Documents + Announcements (63 queries) - DOCUMENTED
- ✅ **Work Package 1D:** Department + Departments (63 queries) - DOCUMENTED
- ✅ **Work Package 1E:** Gallery + GalleryAlbums (33 queries) - DOCUMENTED
- ✅ **Work Package 1F:** SMS (24 queries) - DOCUMENTED

### Phase 2: Medium Priority (142 queries)
- ✅ **Work Package 2A:** Settings + Palette (34 queries) - DOCUMENTED
- ✅ **Work Package 2B:** Notifications + Approvals (14 queries) - DOCUMENTED
- ✅ **Work Package 2C:** TreasuryDashboard + Reports (21 queries) - DOCUMENTED
- ✅ **Work Package 2D:** ChartOfAccounts + FinancialAlerts (25 queries) - DOCUMENTED
- ✅ **Work Package 2E:** DocumentVersions + Payments (30 queries) - DOCUMENTED
- ✅ **Work Package 2F:** Telegram (17 queries) - DOCUMENTED

### Phase 3: Low Priority (269 queries)
- ✅ **Work Package 3A:** Budgets + Projects + Pledges (20 queries) - DOCUMENTED
- ✅ **Work Package 3B:** Collection + MemberGiving (21 queries) - DOCUMENTED
- ✅ **Work Package 3C:** Chat + Reconciliation (7 queries) - DOCUMENTED
- ✅ **Work Package 3D:** RecurringPayments (8 queries) - DOCUMENTED
- ✅ **Work Package 3E:** Comments + AI (13 queries) - DOCUMENTED
- ✅ **Work Package 3F:** AccountingExport + ActivityFeed (14 queries) - DOCUMENTED
- ✅ **Work Package 3G:** CustomReport + Documentation (12 queries) - DOCUMENTED
- ✅ **Work Package 3H:** FinancialForecasting + FixedAssets (15 queries) - DOCUMENTED
- ✅ **Work Package 3I:** Gateway + JournalEntry (8 queries) - DOCUMENTED
- ✅ **Work Package 3J:** Monitoring + Performance (2 queries) - DOCUMENTED
- ✅ **Work Package 3K:** Remaining Controllers (103 queries) - DOCUMENTED

**Total Documented:** 479/681 queries (70%)
**Total Remaining:** 202 queries (need to verify final count and document remaining)

---

## Instructions for Agents

### Before Starting a Work Package:

1. **Read this document** to understand your assigned work package
2. **Read the detailed query list** in `COMPLETE_QUERY_REPLACEMENT_LIST.md`
3. **Check if repository exists** in `backend/repositories/`
4. **Check controller file** in `backend/controllers/`

### During Implementation:

1. **Create repository methods** following the documented SQL and parameters
2. **Update controller** to use repository methods instead of pool.query
3. **Test the refactored functionality**
4. **Mark work package as complete** in this document

### After Completion:

1. **Update this document** with completion status
2. **Report any issues** or blockers encountered
3. **Move to next work package** if assigned

---

## Completion Checklist

For each work package, verify:
- [ ] All repository methods created
- [ ] All pool.query calls replaced in controller
- [ ] Controller imports repository correctly
- [ ] No syntax errors
- [ ] Functionality tested
- [ This document updated with completion status
