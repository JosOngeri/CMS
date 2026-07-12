# Technical Specifications - SMS App Integration

## Document Overview

This document provides detailed technical specifications for each component of the SMS app integration between JOSms (Android) and KMainCMS (Web CMS).

## Component Architecture

### 1. Authentication Service

#### 1.1 Android Authentication Service

**Package**: `com.church.sms.auth`

**Dependencies**:
- `CmsApiService` - API communication
- `SecureStorageHelper` - Token storage
- `KeyManager` - Encryption key management

**Class Structure**:
```kotlin
@Singleton
class CmsAuthService @Inject constructor(
    private val apiService: CmsApiService,
    private val secureStorage: SecureStorageHelper,
    private val keyManager: KeyManager
) {
    suspend fun login(email: String, password: String): AuthResult
    suspend fun refreshToken(): Boolean
    suspend fun logout(): Boolean
    fun isAuthenticated(): Boolean
    fun getCurrentUser(): User?
    suspend fun syncUserRoles(): List<Role>
}
```

**Data Models**:
```kotlin
data class AuthResult(
    val success: Boolean,
    val user: User?,
    val error: String?
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val roles: List<Role>,
    val churchId: String,
    val permissions: List<Permission>
)

data class Role(
    val id: String,
    val name: String,
    val permissions: List<String>
)

data class Permission(
    val resource: String,
    val actions: List<String>
)
```

**Error Handling**:
- Network errors: Retry with exponential backoff
- Auth errors: Clear tokens and redirect to login
- Token refresh: Automatic refresh on 401 errors

**Security Requirements**:
- Tokens stored in EncryptedSharedPreferences
- Refresh token rotation
- Token expiration handling
- Biometric authentication for sensitive operations

#### 1.2 CMS Authentication Integration

**Backend Changes Required**:
- Extend existing JWT authentication to support mobile clients
- Add device tracking for mobile sessions
- Implement refresh token rotation
- Add mobile-specific token claims

**API Endpoints**:
```
POST /api/mobile/auth/login
POST /api/mobile/auth/refresh
POST /api/mobile/auth/logout
```

### 2. Contact Synchronization Service

#### 2.1 Android Contact Sync Service

**Package**: `com.church.sms.sync.contacts`

**Dependencies**:
- `ContactRepository` - Local contact storage
- `CmsApiService` - CMS API communication
- `SyncStateManager` - Sync status tracking
- `ConflictResolver` - Conflict resolution logic

**Class Structure**:
```kotlin
@Singleton
class ContactSyncService @Inject constructor(
    private val contactRepository: ContactRepository,
    private val cmsApiService: CmsApiService,
    private val syncStateManager: SyncStateManager,
    private val conflictResolver: ConflictResolver
) {
    suspend fun syncContacts(): SyncResult
    suspend fun syncDeltaContacts(lastSync: Long): SyncResult
    suspend fun uploadLocalChanges(): SyncResult
    suspend fun resolveConflicts(conflicts: List<Conflict>): ResolutionResult
}

class ConflictResolver {
    fun resolveConflict(local: Contact, cms: CmsContact): Contact
    fun mergeContacts(local: List<Contact>, cms: List<CmsContact>): List<Contact>
}
```

**Sync Strategy**:
1. Get last sync timestamp from SyncStateManager
2. Request delta contacts from CMS (changes since last sync)
3. Merge with local contacts using conflict resolution
4. Upload local changes to CMS
5. Update sync status

**Conflict Resolution Rules**:
- Last-write-wins based on `updated_at` timestamp
- Field-level merge for same timestamp
- Manual resolution for critical conflicts
- Conflict logging for audit trail

**Data Models**:
```kotlin
data class SyncResult(
    val success: Boolean,
    val downloaded: Int,
    val uploaded: Int,
    val conflicts: List<Conflict>,
    val errors: List<SyncError>
)

data class Conflict(
    val id: String,
    val localVersion: Contact,
    val cmsVersion: CmsContact,
    val conflictType: ConflictType
)

enum class ConflictType {
    TIMESTAMP_CONFLICT,
    DATA_CONFLICT,
    DELETION_CONFLICT
}

data class CmsContact(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val phone: String,
    val departmentId: String?,
    val updatedAt: Long,
    val createdAt: Long
) {
    fun toContact(): Contact = Contact(
        id = id,
        name = "$firstName $lastName",
        phone = phone,
        email = email,
        group = departmentId ?: "General",
        updatedAt = updatedAt,
        createdAt = createdAt,
        isFromCms = true
    )
}
```

**Performance Considerations**:
- Batch processing: 100 contacts per batch
- Pagination for large datasets
- Progress reporting for UI
- Cancellation support for long operations

#### 2.2 CMS Contact Sync Integration

**Repository Methods**:
```javascript
async getDeltaContacts(syncDate, churchId)
async processContactChanges(changes, churchId, userId)
async getContactConflicts(userId, churchId)
async resolveContactConflict(conflictId, resolution, userId)
```

**Database Schema Extensions**:
```sql
ALTER TABLE members ADD COLUMN sync_metadata JSONB;
ALTER TABLE members ADD COLUMN last_synced_by INTEGER;
ALTER TABLE members ADD COLUMN conflict_resolved_at TIMESTAMP;
```

### 3. Template Synchronization Service

#### 3.1 Android Template Sync Service

**Package**: `com.church.sms.sync.templates`

**Dependencies**:
- `TemplateRepository` - Local template storage
- `CmsApiService` - CMS API communication
- `AnalyticsCalculator` - Usage analytics

**Class Structure**:
```kotlin
@Singleton
class TemplateSyncService @Inject constructor(
    private val templateRepository: TemplateRepository,
    private val cmsApiService: CmsApiService,
    private val analyticsCalculator: AnalyticsCalculator
) {
    suspend fun syncTemplates(): SyncResult
    suspend fun syncOfficialTemplates(): SyncResult
    suspend fun uploadUsageAnalytics(): AnalyticsResult
    suspend fun createPersonalTemplate(template: MessageTemplate): TemplateResult
}

data class SyncTemplate(
    val id: String,
    val name: String,
    val content: String,
    val category: String,
    val isOfficial: Boolean,
    val usageCount: Int,
    val lastUsed: Long?,
    val syncedAt: Long
)
```

**Template Management Strategy**:
- Official templates: Read-only from CMS, synced periodically
- Personal templates: Local only, never synced to CMS
- Template categories: Synced from CMS
- Usage analytics: Uploaded to CMS periodically

**Sync Process**:
1. Download official templates from CMS
2. Merge with local personal templates
3. Update template categories
4. Calculate and upload usage analytics
5. Update sync status

**Data Models**:
```kotlin
data class TemplateUsageAnalytics(
    val templateId: String,
    val usageCount: Int,
    val lastUsed: Long,
    val avgResponseTime: Long?,
    val successRate: Double
)
```

#### 3.2 CMS Template Integration

**Repository Methods**:
```javascript
async getDeltaTemplates(syncDate, churchId)
async getOfficialTemplates(churchId)
async processTemplateAnalytics(analytics, churchId)
async updateTemplateUsageStats(templateId, stats)
```

**Database Schema Extensions**:
```sql
ALTER TABLE sms_templates ADD COLUMN is_official BOOLEAN DEFAULT true;
ALTER TABLE sms_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE sms_templates ADD COLUMN last_used TIMESTAMP;
ALTER TABLE sms_templates ADD COLUMN sync_metadata JSONB;
```

### 4. SMS Campaign Integration

#### 4.1 Android Campaign Service

**Package**: `com.church.sms.campaigns`

**Dependencies**:
- `CmsApiService` - CMS API communication
- `CampaignRepository` - Local campaign storage
- `ContactRepository` - Contact selection
- `TemplateRepository` - Template selection

**Class Structure**:
```kotlin
@Singleton
class CampaignService @Inject constructor(
    private val cmsApiService: CmsApiService,
    private val campaignRepository: CampaignRepository,
    private val contactRepository: ContactRepository,
    private val templateRepository: TemplateRepository
) {
    suspend fun createCampaign(campaign: CampaignDraft): CampaignResult
    suspend fun getCampaignProgress(campaignId: String): CampaignProgress
    suspend fun scheduleCampaign(campaignId: String, schedule: Schedule): ScheduleResult
    suspend fun cancelCampaign(campaignId: String): CancelResult
    suspend fun getMobileCampaigns(): List<Campaign>
}

data class CampaignDraft(
    val name: String,
    val templateId: String,
    val targetAudience: TargetAudience,
    val scheduleDate: Long?,
    val scheduleTime: String?
)

data class TargetAudience(
    val type: AudienceType,
    val filters: List<AudienceFilter>,
    val estimatedCount: Int
)

enum class AudienceType {
    ALL_MEMBERS,
    DEPARTMENT,
    GROUP,
    CUSTOM_SELECTION
}

data class CampaignProgress(
    val campaignId: String,
    val status: CampaignStatus,
    val totalRecipients: Int,
    val sentRecipients: Int,
    val failedRecipients: Int,
    val progress: Double
)

enum class CampaignStatus {
    DRAFT,
    SCHEDULED,
    SENDING,
    COMPLETED,
    CANCELLED,
    FAILED
}
```

**Campaign Creation Flow**:
1. User selects template and audience
2. System estimates recipient count
3. User reviews and confirms
4. Campaign created in CMS
5. Local copy stored for offline access
6. Progress tracking enabled

**UI Components**:
```kotlin
@Composable
fun CampaignWizardScreen(
    onCampaignCreated: (Campaign) -> Unit
) {
    // Multi-step wizard for campaign creation
    // Step 1: Audience selection
    // Step 2: Template selection
    // Step 3: Scheduling
    // Step 4: Review and confirm
}
```

#### 4.2 CMS Campaign Integration

**Repository Methods**:
```javascript
async createMobileCampaign(campaignData)
async getCampaignProgress(campaignId, churchId)
async getMobileCampaigns(churchId, status, limit)
async updateCampaignStatus(campaignId, status)
async getCampaignRecipients(campaignId)
```

**Database Schema Extensions**:
```sql
ALTER TABLE sms_campaigns ADD COLUMN source VARCHAR(20) DEFAULT 'web';
ALTER TABLE sms_campaigns ADD COLUMN mobile_device_id VARCHAR(255);
ALTER TABLE sms_campaigns ADD COLUMN progress_metadata JSONB;
```

### 5. Analytics Integration

#### 5.1 Android Analytics Service

**Package**: `com.church.sms.analytics`

**Dependencies**:
- `CmsApiService` - CMS API communication
- `SmsLogRepository` - Local SMS logs
- `AnalyticsCalculator` - Local analytics calculation
- `ContactRepository` - Contact analytics

**Class Structure**:
```kotlin
@Singleton
class AnalyticsSyncService @Inject constructor(
    private val cmsApiService: CmsApiService,
    private val smsLogRepository: SmsLogRepository,
    private val analyticsCalculator: AnalyticsCalculator,
    private val contactRepository: ContactRepository
) {
    suspend fun syncAnalytics(): AnalyticsResult
    suspend fun getUnifiedAnalytics(period: DateRange): UnifiedAnalytics
    suspend fun uploadLocalAnalytics(): UploadResult
    suspend fun getSmsAnalytics(period: DateRange): SmsAnalytics
}

data class UnifiedAnalytics(
    val sms: SmsAnalytics,
    val members: MemberAnalytics,
    val engagement: EngagementAnalytics,
    val period: DateRange
)

data class SmsAnalytics(
    val totalSent: Int,
    val successful: Int,
    val failed: Int,
    val successRate: Double,
    val avgRecipients: Double,
    val dailyBreakdown: List<DailyStats>
)

data class MemberAnalytics(
    val totalMembers: Int,
    val activeMembers: Int,
    val newMembers: Int,
    val engagementRate: Double
)

data class EngagementAnalytics(
    val totalInteractions: Int,
    val uniqueUsers: Int,
    val avgInteractionsPerUser: Double
)

data class DailyStats(
    val date: LocalDate,
    val totalSent: Int,
    val successful: Int,
    val failed: Int,
    val totalRecipients: Int
)
```

**Analytics Sync Strategy**:
1. Calculate local SMS analytics
2. Upload SMS logs to CMS
3. Download CMS analytics (members, engagement)
4. Merge local and CMS analytics
5. Cache unified analytics locally

**Performance Optimization**:
- Incremental analytics calculation
- Cached analytics with TTL
- Background sync for large datasets
- Progressive loading for UI

#### 5.2 CMS Analytics Integration

**Repository Methods**:
```javascript
async getUnifiedAnalytics(churchId, startDate, endDate)
async getSmsAnalytics(churchId, startDate, endDate)
async getMemberAnalytics(churchId, startDate, endDate)
async getEngagementAnalytics(churchId, startDate, endDate)
async aggregateMobileAnalytics(userId, churchId)
```

### 6. Sync Infrastructure

#### 6.1 Android Sync Manager

**Package**: `com.church.sms.sync`

**Dependencies**:
- `WorkManager` - Background task scheduling
- `ContactSyncService` - Contact sync
- `TemplateSyncService` - Template sync
- `AnalyticsSyncService` - Analytics sync
- `NetworkMonitor` - Network connectivity
- `BatteryMonitor` - Battery status

**Class Structure**:
```kotlin
@Singleton
class SyncManager @Inject constructor(
    private val workManager: WorkManager,
    private val contactSyncService: ContactSyncService,
    private val templateSyncService: TemplateSyncService,
    private val analyticsSyncService: AnalyticsSyncService,
    private val networkMonitor: NetworkMonitor,
    private val batteryMonitor: BatteryMonitor,
    private val syncStateManager: SyncStateManager
) {
    fun startPeriodicSync()
    suspend fun triggerImmediateSync(): SyncResult
    suspend fun syncContacts(): SyncResult
    suspend fun syncTemplates(): SyncResult
    suspend fun syncAnalytics(): SyncResult
    fun cancelPendingSync()
    fun getSyncStatus(): Flow<SyncStatus>
}

data class SyncStatus(
    val isSyncing: Boolean,
    val currentOperation: String?,
    val progress: Double,
    val lastSync: Long?,
    val nextSync: Long?,
    val errors: List<SyncError>
)
```

**Sync Schedule**:
- **Real-time Sync**: Critical data (auth, urgent notifications)
- **Periodic Sync**: Every 15 minutes (contacts, templates)
- **Daily Sync**: Once per day (analytics, reports)
- **Manual Sync**: User-initiated (large datasets)

**WorkManager Integration**:
```kotlin
class ContactSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return try {
            val syncService = inject<ContactSyncService>()
            val result = syncService.syncContacts()
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

**Sync Constraints**:
```kotlin
val syncConstraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .setRequiresBatteryNotLow(true)
    .setRequiresCharging(false)
    .setRequiresStorageNotLow(true)
    .build()
```

#### 6.2 CMS Sync Infrastructure

**Repository Methods**:
```javascript
async getSyncStatus(userId, churchId)
async updateSyncStatus(userId, churchId, syncType, status, timestamp)
async resetSync(userId, churchId)
async getSyncConflicts(userId, churchId)
async resolveSyncConflict(conflictId, resolution)
```

**Database Schema**:
```sql
CREATE TABLE mobile_sync_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    church_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_sync TIMESTAMP NOT NULL,
    next_sync TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, church_id, sync_type)
);

CREATE TABLE mobile_sync_conflicts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    church_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    local_data JSONB NOT NULL,
    cms_data JSONB NOT NULL,
    resolution VARCHAR(20),
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7. Database Schema Extensions

#### 7.1 Mobile Device Management

```sql
CREATE TABLE mobile_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    church_id INTEGER NOT NULL,
    device_name VARCHAR(100),
    platform VARCHAR(20),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (church_id) REFERENCES churches(id)
);

CREATE INDEX idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_church ON mobile_devices(church_id);
CREATE INDEX idx_mobile_devices_active ON mobile_devices(is_active);
```

#### 7.2 SMS Template Extensions

```sql
ALTER TABLE sms_templates ADD COLUMN is_official BOOLEAN DEFAULT true;
ALTER TABLE sms_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE sms_templates ADD COLUMN last_used TIMESTAMP;
ALTER TABLE sms_templates ADD COLUMN sync_metadata JSONB;

CREATE INDEX idx_sms_templates_official ON sms_templates(is_official);
CREATE INDEX idx_sms_templates_usage ON sms_templates(usage_count DESC);
```

#### 7.3 SMS Campaign Extensions

```sql
ALTER TABLE sms_campaigns ADD COLUMN source VARCHAR(20) DEFAULT 'web';
ALTER TABLE sms_campaigns ADD COLUMN mobile_device_id VARCHAR(255);
ALTER TABLE sms_campaigns ADD COLUMN progress_metadata JSONB;

CREATE INDEX idx_sms_campaigns_source ON sms_campaigns(source);
CREATE INDEX idx_sms_campaigns_device ON sms_campaigns(mobile_device_id);
```

#### 7.4 Member Sync Extensions

```sql
ALTER TABLE members ADD COLUMN sync_metadata JSONB;
ALTER TABLE members ADD COLUMN last_synced_by INTEGER;
ALTER TABLE members ADD COLUMN conflict_resolved_at TIMESTAMP;

CREATE INDEX idx_members_synced ON members(last_synced_by);
```

#### 7.5 SMS Log Extensions

```sql
ALTER TABLE sms_logs ADD COLUMN source VARCHAR(20) DEFAULT 'web';
ALTER TABLE sms_logs ADD COLUMN mobile_device_id VARCHAR(255);
ALTER TABLE sms_logs ADD COLUMN sync_status VARCHAR(20);

CREATE INDEX idx_sms_logs_source ON sms_logs(source);
CREATE INDEX idx_sms_logs_device ON sms_logs(mobile_device_id);
CREATE INDEX idx_sms_logs_sync_status ON sms_logs(sync_status);
```

### 8. API Contract Specifications

#### 8.1 Authentication Endpoints

**POST /api/mobile/auth/login**
```json
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "unique_device_id",
  "deviceName": "Samsung Galaxy S21"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["Department Head"],
      "churchId": 1,
      "permissions": [...]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```

**POST /api/mobile/auth/refresh**
```json
// Request
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 3600
  }
}
```

#### 8.2 Contact Sync Endpoints

**GET /api/mobile/contacts/sync?lastSync=2024-01-01T00:00:00Z**
```json
// Response
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact_123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+254712345678",
        "departmentId": "dept_456",
        "updatedAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T08:00:00Z"
      }
    ],
    "lastSync": "2024-01-15T12:00:00Z",
    "count": 1
  }
}
```

**POST /api/mobile/contacts/upload**
```json
// Request
{
  "changes": [
    {
      "action": "create",
      "id": "contact_789",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+254798765432",
      "updatedAt": "2024-01-15T11:00:00Z",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "processed": ["contact_789"],
    "conflicts": [],
    "errors": []
  }
}
```

#### 8.3 Template Sync Endpoints

**GET /api/mobile/templates/sync?lastSync=2024-01-01T00:00:00Z**
```json
// Response
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_123",
        "name": "Sunday Service Reminder",
        "content": "Reminder: Sunday service starts at 9am",
        "category": "Service",
        "isOfficial": true,
        "usageCount": 150,
        "lastUsed": "2024-01-14T09:00:00Z",
        "updatedAt": "2024-01-10T08:00:00Z"
      }
    ],
    "lastSync": "2024-01-15T12:00:00Z",
    "count": 1
  }
}
```

#### 8.4 Campaign Endpoints

**POST /api/mobile/campaigns/mobile**
```json
// Request
{
  "name": "Sunday Service Reminder",
  "templateId": "template_123",
  "scheduledDate": "2024-01-21T09:00:00Z",
  "targetAudience": {
    "type": "ALL_MEMBERS",
    "filters": [],
    "estimatedCount": 500
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "campaign_456",
    "name": "Sunday Service Reminder",
    "status": "scheduled",
    "scheduledDate": "2024-01-21T09:00:00Z",
    "totalRecipients": 500,
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

**GET /api/mobile/campaigns/:id/progress**
```json
// Response
{
  "success": true,
  "data": {
    "id": "campaign_456",
    "name": "Sunday Service Reminder",
    "status": "sending",
    "totalRecipients": 500,
    "sentRecipients": 350,
    "failedRecipients": 5,
    "progress": 0.7
  }
}
```

#### 8.5 Analytics Endpoints

**GET /api/mobile/analytics/unified?startDate=2024-01-01&endDate=2024-01-31**
```json
// Response
{
  "success": true,
  "data": {
    "sms": {
      "totalSent": 1500,
      "successful": 1450,
      "failed": 50,
      "successRate": 0.9667,
      "avgRecipients": 100
    },
    "members": {
      "totalMembers": 500,
      "activeMembers": 450,
      "newMembers": 25,
      "engagementRate": 0.9
    },
    "engagement": {
      "totalInteractions": 5000,
      "uniqueUsers": 400,
      "avgInteractionsPerUser": 12.5
    },
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    }
  }
}
```

### 9. Error Handling Specifications

#### 9.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "Conflict detected during sync",
    "details": {
      "conflicts": [
        {
          "id": "contact_123",
          "type": "TIMESTAMP_CONFLICT",
          "localVersion": "2024-01-15T10:00:00Z",
          "cmsVersion": "2024-01-15T11:00:00Z"
        }
      ]
    }
  }
}
```

#### 9.2 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_FAILED | Authentication failed | 401 |
| TOKEN_EXPIRED | Access token expired | 401 |
| SYNC_CONFLICT | Sync conflict detected | 409 |
| NETWORK_ERROR | Network connectivity issue | 503 |
| VALIDATION_ERROR | Request validation failed | 400 |
| NOT_FOUND | Resource not found | 404 |
| SERVER_ERROR | Internal server error | 500 |

#### 9.3 Retry Strategy

**Exponential Backoff**:
- Initial delay: 1 second
- Max delay: 30 seconds
- Max retries: 3
- Retry conditions: Network errors, 5xx errors

**No Retry**:
- Validation errors (4xx)
- Auth failures (401)
- Conflict errors (409)
- Resource not found (404)

### 10. Performance Specifications

#### 10.1 API Response Times

| Endpoint | Target Response Time | Max Response Time |
|----------|---------------------|-------------------|
| Auth login | < 500ms | 1000ms |
| Contact sync (100 records) | < 1s | 2s |
| Template sync (50 records) | < 500ms | 1s |
| Campaign creation | < 1s | 2s |
| Analytics query | < 1s | 2s |

#### 10.2 Database Query Performance

| Query | Target Time | Max Time |
|-------|-------------|----------|
| Contact delta query | < 100ms | 200ms |
| Template sync query | < 50ms | 100ms |
| Analytics aggregation | < 500ms | 1s |
| Conflict detection | < 200ms | 400ms |

#### 10.3 Mobile Performance Targets

| Metric | Target | Maximum |
|--------|--------|----------|
| App startup time | < 2s | 3s |
| Sync operation (100 contacts) | < 5s | 10s |
| UI response time | < 100ms | 200ms |
| Memory usage | < 100MB | 150MB |
| Battery impact (per day) | < 3% | 5% |

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Ready for Implementation  
**Next Review**: After Phase 1 Completion
