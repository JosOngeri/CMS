# SMS App Integration Plan - JOSms ↔ KMainCMS

## Executive Summary

This document outlines the integration strategy between the JOSms Android application and the KMainCMS system. The integration follows an **offline-first approach** with lean resource usage for production environments.

## Current Architecture Analysis

### KMainCMS (Backend)
- **Tech Stack**: Node.js/Express, React frontend
- **SMS Module**: Full SMS management with providers, templates, campaigns, analytics
- **Mobile Support**: Existing mobile controller with optimized endpoints
- **Authentication**: JWT-based with role-based access control
- **Database**: Centralized SQL database

### JOSms (Android App)
- **Tech Stack**: Kotlin, Jetpack Compose, Hilt DI
- **Storage**: Room database for offline-first architecture
- **Features**: Contacts, templates, SMS logs, scheduling, analytics
- **Security**: Biometric authentication, encrypted storage
- **Current State**: Standalone app with local database only

## Integration Strategy

### 1. UI Navigation Integration

#### 1.1 Mobile App Navigation Structure

**Current JOSms Navigation:**
```
Dashboard
├── Send SMS
├── Contacts
├── Templates
├── SMS Logs
├── Scheduled Messages
└── Settings
```

**Proposed Integrated Navigation:**
```
Church Hub (New Home Screen)
├── Dashboard
│   ├── Quick Stats (synced from CMS)
│   ├── Recent Activity (synced from CMS)
│   └── Quick Actions
├── Communication
│   ├── Send SMS
│   ├── Templates (synced with CMS)
│   ├── Campaigns (new - from CMS)
│   └── SMS Logs (synced with CMS)
├── People
│   ├── Contacts (synced with CMS members)
│   ├── Groups (synced with CMS departments)
│   └── Import/Export
├── Church Tools
│   ├── Announcements (from CMS)
│   ├── Events (from CMS)
│   ├── Documents (from CMS)
│   └── Giving (from CMS treasury)
├── Analytics
│   ├── SMS Analytics (local + CMS)
│   ├── Engagement Metrics (from CMS)
│   └── Reports
└── Settings
    ├── Account (CMS auth)
    ├── Sync Settings
    ├── Notification Preferences
    └── App Settings
```

#### 1.2 Navigation Implementation Recommendations

**Use Jetpack Navigation Compose:**
- Implement nested navigation graphs for each major section
- Bottom navigation bar for top-level destinations
- Deep linking support for CMS notifications
- Back stack management for seamless navigation

**Navigation Components:**
```kotlin
@Composable
fun ChurchNavigation() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = { ChurchBottomNavigation(navController) }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "dashboard",
            modifier = Modifier.padding(padding)
        ) {
            // Navigation graphs for each section
            dashboardGraph(navController)
            communicationGraph(navController)
            peopleGraph(navController)
            churchToolsGraph(navController)
            analyticsGraph(navController)
            settingsGraph(navController)
        }
    }
}
```

#### 1.3 CMS Web Integration

**Add Mobile App Section to CMS Sidebar:**
```jsx
// In CMS Sidebar component
<SidebarMenuItem 
  icon={<SmartphoneIcon />}
  label="Mobile App"
  path="/admin/mobile-app"
  roles={['Super Admin', 'Pastor']}
>
  <SidebarMenuItem 
    icon={<UsersIcon />}
    label="Mobile Users"
    path="/admin/mobile-app/users"
  />
  <SidebarMenuItem 
    icon={<SyncIcon />}
    label="Sync Status"
    path="/admin/mobile-app/sync"
  />
  <SidebarMenuItem 
    icon={<SettingsIcon />}
    label="App Settings"
    path="/admin/mobile-app/settings"
  />
</SidebarMenuItem>
```

### 2. Functional Feature Integration

#### 2.1 Authentication Integration

**Shared Authentication System:**
- Implement OAuth 2.0 / OpenID Connect between CMS and mobile app
- Mobile app uses CMS credentials for login
- JWT tokens with refresh token mechanism
- Role-based permissions synced from CMS

**Implementation:**
```kotlin
// CMS Auth Service in Android
@Singleton
class CmsAuthService @Inject constructor(
    private val apiService: CmsApiService,
    private val secureStorage: SecureStorageHelper
) {
    suspend fun login(email: String, password: String): AuthResult {
        val response = apiService.login(email, password)
        secureStorage.storeTokens(response.accessToken, response.refreshToken)
        syncUserRoles(response.user.roles)
        return AuthResult.Success(response.user)
    }
    
    suspend fun refreshToken(): Boolean {
        val refreshToken = secureStorage.getRefreshToken() ?: return false
        val response = apiService.refreshToken(refreshToken)
        secureStorage.storeTokens(response.accessToken, response.refreshToken)
        return true
    }
}
```

#### 2.2 Contact Synchronization

**Two-Way Sync Strategy:**
- CMS members database ↔ Android contacts database
- Conflict resolution: Last-write-wins with timestamps
- Batch sync for efficiency (100 records per batch)
- Delta sync using last_sync timestamp

**Sync Implementation:**
```kotlin
@Singleton
class ContactSyncService @Inject constructor(
    private val contactRepository: ContactRepository,
    private val cmsApiService: CmsApiService,
    private val syncStateManager: SyncStateManager
) {
    suspend fun syncContacts(): SyncResult {
        val lastSync = syncStateManager.getLastSync("contacts")
        val deltaContacts = cmsApiService.getDeltaContacts(lastSync)
        
        // Handle conflicts and merge
        val mergedContacts = mergeContacts(deltaContacts)
        
        // Batch insert for performance
        contactRepository.addAllContacts(mergedContacts)
        
        // Upload local changes to CMS
        val localChanges = contactRepository.getLocalChanges(lastSync)
        cmsApiService.uploadContactChanges(localChanges)
        
        syncStateManager.updateLastSync("contacts")
        return SyncResult.Success(mergedContacts.size)
    }
    
    private fun mergeContacts(
        cmsContacts: List<CmsContact>,
        localContacts: List<Contact>
    ): List<Contact> {
        // Conflict resolution logic
        return cmsContacts.map { cmsContact ->
            val localContact = localContacts.find { it.id == cmsContact.id }
            if (localContact != null && localContact.updatedAt > cmsContact.updatedAt) {
                localContact // Local version wins
            } else {
                cmsContact.toContact() // CMS version wins
            }
        }
    }
}
```

#### 2.3 Template Synchronization

**Template Management:**
- CMS templates as source of truth
- Mobile app can create personal templates (local only)
- Category-based template organization
- Template usage analytics synced back to CMS

**Template Sync Features:**
```kotlin
data class SyncTemplate(
    val id: String,
    val name: String,
    val content: String,
    val category: String,
    val isOfficial: Boolean, // From CMS or user-created
    val usageCount: Int,
    val lastUsed: Long?,
    val syncedAt: Long
)

class TemplateSyncService {
    suspend fun syncTemplates(): SyncResult {
        // Download official templates from CMS
        val officialTemplates = cmsApiService.getOfficialTemplates()
        
        // Merge with local personal templates
        val allTemplates = mergeTemplates(
            officialTemplates,
            templateRepository.getPersonalTemplates()
        )
        
        templateRepository.insertAll(allTemplates)
        
        // Upload usage analytics
        uploadTemplateAnalytics()
        
        return SyncResult.Success(allTemplates.size)
    }
}
```

#### 2.4 SMS Campaign Integration

**Mobile Campaign Management:**
- Create campaigns from mobile app
- Schedule campaigns (syncs with CMS)
- Campaign progress tracking
- Real-time delivery reports

**Campaign Features:**
```kotlin
@Composable
fun CampaignWizardScreen(
    onCampaignCreated: (Campaign) -> Unit
) {
    var step by remember { mutableStateOf(1) }
    var campaignData by remember { mutableStateOf(CampaignDraft()) }
    
    when (step) {
        1 -> AudienceSelectionStep(
            selectedAudience = campaignData.targetAudience,
            onAudienceSelected = { campaignData = campaignData.copy(targetAudience = it) },
            onNext = { step = 2 }
        )
        2 -> TemplateSelectionStep(
            templates = templates,
            selectedTemplate = campaignData.template,
            onTemplateSelected = { campaignData = campaignData.copy(template = it) },
            onNext = { step = 3 }
        )
        3 -> SchedulingStep(
            scheduleDate = campaignData.scheduleDate,
            onDateSelected = { campaignData = campaignData.copy(scheduleDate = it) },
            onSchedule = { 
                createCampaign(campaignData)
                onCampaignCreated(campaignData.toCampaign())
            }
        )
    }
}
```

#### 2.5 Analytics Integration

**Unified Analytics Dashboard:**
- Local SMS analytics (immediate, detailed)
- CMS analytics (aggregated, cross-platform)
- Engagement metrics from CMS
- Cost tracking and budget alerts

**Analytics Sync:**
```kotlin
class AnalyticsSyncService {
    suspend fun syncAnalytics(): AnalyticsResult {
        // Upload local SMS logs to CMS
        val unsentLogs = smsLogRepository.getUnsentLogs()
        cmsApiService.uploadSmsLogs(unsentLogs)
        
        // Download aggregated analytics from CMS
        val cmsAnalytics = cmsApiService.getAggregatedAnalytics()
        
        // Merge local and CMS analytics
        val unifiedAnalytics = mergeAnalytics(
            localAnalytics = calculateLocalAnalytics(),
            cmsAnalytics = cmsAnalytics
        )
        
        return AnalyticsResult(unifiedAnalytics)
    }
}
```

### 3. Offline-First Architecture

#### 3.1 Data Storage Strategy

**Local Database (Room):**
```kotlin
@Database(
    entities = [
        Contact::class,
        MessageTemplate::class,
        SmsLog::class,
        ScheduledMessage::class,
        CmsMember::class,
        CmsAnnouncement::class,
        SyncStatus::class
    ],
    version = 11,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class ChurchSmsDatabase : RoomDatabase() {
    abstract fun contactDao(): ContactDao
    abstract fun templateDao(): MessageTemplateDao
    abstract fun smsLogDao(): SmsLogDao
    abstract fun cmsDataDao(): CmsDataDao
    abstract fun syncStatusDao(): SyncStatusDao
}
```

#### 3.2 Sync Strategy

**Three-Tier Sync Approach:**
1. **Real-time Sync**: Critical data (auth, urgent notifications)
2. **Periodic Sync**: Every 15 minutes (contacts, templates)
3. **Manual Sync**: User-initiated (large datasets, analytics)

**Sync Manager:**
```kotlin
@Singleton
class SyncManager @Inject constructor(
    private val workManager: WorkManager,
    private val networkMonitor: NetworkMonitor
) {
    fun startPeriodicSync() {
        // Contacts sync every 15 minutes
        val contactsSyncWork = PeriodicWorkRequestBuilder<ContactSyncWorker>(
            15, TimeUnit.MINUTES
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
        ).build()
        
        workManager.enqueue(contactsSyncWork)
        
        // Templates sync every hour
        val templatesSyncWork = PeriodicWorkRequestBuilder<TemplateSyncWorker>(
            1, TimeUnit.HOURS
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        ).build()
        
        workManager.enqueue(templatesSyncWork)
    }
    
    suspend fun triggerImmediateSync(): SyncResult {
        if (!networkMonitor.isOnline()) {
            return SyncResult.Offline
        }
        
        return coroutineScope {
            val results = listOf(
                async { syncContacts() },
                async { syncTemplates() },
                async { syncAnnouncements() },
                async { uploadPendingData() }
            ).awaitAll()
            
            SyncResult.Success(results)
        }
    }
}
```

#### 3.3 Conflict Resolution

**Optimistic Offline Locks:**
```kotlin
class ConflictResolver {
    fun resolveConflict(
        localVersion: DataModel,
        cmsVersion: DataModel
    ): DataModel {
        return when {
            localVersion.updatedAt > cmsVersion.updatedAt -> localVersion
            cmsVersion.updatedAt > localVersion.updatedAt -> cmsVersion
            else -> {
                // Same timestamp - use field-level merge
                mergeFields(localVersion, cmsVersion)
            }
        }
    }
    
    private fun mergeFields(local: DataModel, cms: DataModel): DataModel {
        return DataModel(
            id = local.id,
            name = if (local.nameChanged) local.name else cms.name,
            phone = if (local.phoneChanged) local.phone else cms.phone,
            // ... other fields
            updatedAt = maxOf(local.updatedAt, cms.updatedAt)
        )
    }
}
```

### 4. Resource Optimization

#### 4.1 Memory Management

**Lean Production Implementation:**
```kotlin
// Use lazy loading for large lists
@Composable
fun ContactListScreen() {
    val contacts by contactRepository.getAllContacts()
        .collectAsLazyPagingItems()
    
    LazyColumn {
        items(contacts) { contact ->
            ContactItem(contact)
        }
    }
}

// Image optimization
class ImageCache {
    private val memoryCache = LruCache<String, Bitmap>(20 * 1024 * 1024) // 20MB
    
    fun loadProfileImage(url: String): Flow<Bitmap?> = flow {
        emit(memoryCache.get(url))
        if (memoryCache.get(url) == null) {
            val bitmap = downloadAndOptimizeImage(url)
            memoryCache.put(url, bitmap)
            emit(bitmap)
        }
    }
}
```

#### 4.2 Network Optimization

**Request Batching and Compression:**
```kotlin
class CmsApiService {
    suspend fun getDeltaContacts(lastSync: Long): List<CmsContact> {
        return withContext(Dispatchers.IO) {
            // Use gzip compression
            val response = apiClient.get(
                "/api/mobile/contacts/sync",
                mapOf("last_sync" to lastSync),
                headers = mapOf("Accept-Encoding" to "gzip")
            )
            
            response.body()?.let { parseContacts(it) } ?: emptyList()
        }
    }
    
    suspend fun uploadBatchData(data: List<Any>): Boolean {
        // Batch upload in chunks of 50
        data.chunked(50).forEach { batch ->
            apiClient.post("/api/mobile/batch-upload", batch)
        }
        return true
    }
}
```

#### 4.3 Battery Optimization

**Smart Sync Scheduling:**
```kotlin
class SmartSyncScheduler {
    fun scheduleSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .setRequiresCharging(false) // Allow on battery
            .build()
        
        val syncWork = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                30, TimeUnit.SECONDS
            )
            .build()
        
        WorkManager.getInstance(context).enqueue(syncWork)
    }
}
```

### 5. API Integration Points

#### 5.1 New Mobile Endpoints for CMS

```javascript
// backend/routes/mobile.routes.js ( additions)
const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobile.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Contact sync endpoints
router.get('/contacts/sync', mobileController.syncContacts);
router.post('/contacts/upload', mobileController.uploadContactChanges);

// Template sync endpoints
router.get('/templates/sync', mobileController.syncTemplates);
router.post('/templates/analytics', mobileController.uploadTemplateAnalytics);

// SMS log sync
router.post('/sms/logs/upload', mobileController.uploadSmsLogs);
router.get('/sms/logs/sync', mobileController.syncSmsLogs);

// Campaign management
router.post('/campaigns/mobile', mobileController.createMobileCampaign);
router.get('/campaigns/:id/progress', mobileController.getCampaignProgress);

// Unified analytics
router.get('/analytics/unified', mobileController.getUnifiedAnalytics);

// Church data
router.get('/announcements/mobile', mobileController.getMobileAnnouncements);
router.get('/events/mobile', mobileController.getMobileEvents);

module.exports = router;
```

#### 5.2 Android API Service

```kotlin
@Singleton
class CmsApiService @Inject constructor(
    private val httpClient: OkHttpClient,
    private val authManager: AuthManager
) {
    private val baseUrl = "https://cms.kiserianchurch.org/api/mobile"
    
    suspend fun syncContacts(lastSync: Long): List<CmsContact> {
        val request = Request.Builder()
            .url("$baseUrl/contacts/sync?last_sync=$lastSync")
            .addHeader("Authorization", "Bearer ${authManager.getAccessToken()}")
            .build()
        
        val response = httpClient.newCall(request).execute()
        return parseContactsResponse(response.body?.string())
    }
    
    suspend fun uploadSmsLogs(logs: List<SmsLog>): Boolean {
        val request = Request.Builder()
            .url("$baseUrl/sms/logs/upload")
            .addHeader("Authorization", "Bearer ${authManager.getAccessToken()}")
            .post(
                logs.toJson().toRequestBody("application/json".toMediaType())
            )
            .build()
        
        val response = httpClient.newCall(request).execute()
        return response.isSuccessful
    }
}
```

### 6. Security Considerations

#### 6.1 Data Encryption

**Encrypted Storage:**
```kotlin
class SecureStorageHelper @Inject constructor(
    private val keyManager: KeyManager
) {
    fun storeSensitiveData(key: String, data: String) {
        val encryptedData = keyManager.encrypt(data)
        encryptedSharedPreferences.edit()
            .putString(key, encryptedData)
            .apply()
    }
    
    fun getSensitiveData(key: String): String? {
        val encryptedData = encryptedSharedPreferences.getString(key, null)
        return encryptedData?.let { keyManager.decrypt(it) }
    }
}
```

#### 6.2 Certificate Pinning

**Network Security:**
```kotlin
class CertificatePinning {
    fun createSecureClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .certificatePinner(
                CertificatePinner.Builder()
                    .add("cms.kiserianchurch.org", "sha256/AAAAAAAAAA...")
                    .build()
            )
            .build()
    }
}
```

### 7. Implementation Phases

#### Phase 1: Foundation (Week 1-2)
- Set up CMS mobile API endpoints
- Implement authentication integration
- Create base sync infrastructure
- Set up Room database extensions

#### Phase 2: Core Sync (Week 3-4)
- Implement contact synchronization
- Implement template synchronization
- Add conflict resolution
- Create sync status UI

#### Phase 3: Advanced Features (Week 5-6)
- SMS campaign integration
- Analytics sync
- Church data integration (announcements, events)
- Offline queue management

#### Phase 4: Optimization (Week 7-8)
- Performance optimization
- Battery optimization
- Memory management
- Network optimization

#### Phase 5: Testing & Deployment (Week 9-10)
- Integration testing
- User acceptance testing
- Performance testing
- Production deployment

### 8. Success Metrics

**Technical Metrics:**
- Sync success rate > 99%
- API response time < 500ms
- Offline functionality coverage > 90%
- Battery impact < 5% per day
- Memory usage < 150MB

**User Experience Metrics:**
- Login success rate > 95%
- Data sync transparency
- Offline mode usability
- Conflict resolution satisfaction

### 9. Next Steps

1. **Review and approve this integration plan**
2. **Set up development environment for mobile API**
3. **Create detailed technical specifications for each component**
4. **Begin Phase 1 implementation**

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Ready for Review
