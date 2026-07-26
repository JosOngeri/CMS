# CMS-SMS Integration and Snapshot Sync Implementation Plan

> **For agentic workers:** This plan is structured for 5-agent parallel execution. Each Part can be assigned to a different agent. REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for coordinated multi-agent execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the SMS web app and Android app with the CMS multi-tenancy system, implement a daily snapshot + 5-minute rolling update sync architecture, and enable username/email/phone login across all platforms.

**Architecture:** The CMS acts as the central authentication and database discovery service. Each church (organization) has its own database. The SMS apps connect to CMS for authentication, receive their database connection details, then sync data using a dual-layer snapshot system: daily full snapshots every 24 hours plus 5-minute rolling activity updates. All platforms use the CMS authentication API which already supports username/email/phone login via findByIdentifier.

**Tech Stack:**
- **CMS Backend:** Node.js, Express, PostgreSQL with multi-tenant database architecture
- **SMS Web App:** Next.js 16, React 19, TypeScript, Zustand state management
- **Android App:** Flutter, Riverpod state management, SQLite local storage
- **Sync Protocol:** REST API with JSON delta compression, PostgreSQL logical replication for snapshots
- **Authentication:** JWT tokens from CMS, shared across web and mobile

## Global Constraints

- Use existing CMS UserRepository.findByIdentifier for login (already supports username/email/phone)
- Maintain existing CMS ResponseHandler format for all API responses
- Follow existing CMS database schema conventions (snake_case columns, church_id foreign keys)
- Use existing CMS security helpers (hashPassword, comparePassword, generateAccessToken)
- Maintain SMS web app existing UI/UX patterns and component structure
- Android app must work offline with local SQLite database sync
- All API calls must include Bearer token authentication
- Snapshot files must be compressed JSON with incremental delta support
- Rolling updates must be append-only log structure for efficient sync
- Database connection details must never be exposed to client applications
- All sync operations must be idempotent and handle network failures gracefully

## Agent Assignment Structure

This plan is divided into 5 Parts for parallel agent execution:

- **Part 1:** CMS Authentication API Enhancement - SMS-specific auth endpoints and organization discovery
- **Part 2:** Snapshot and Rolling Update System - Database schema, generation services, and scheduled jobs
- **Part 3:** SMS Sync API Endpoints - Snapshot download and rolling update endpoints
- **Part 4:** SMS Web App Integration - CMS authentication and sync client for web platform
- **Part 5:** Android App Integration and Testing - CMS authentication, sync service, integration tests, and documentation

**Dependencies:** Parts must be executed in numerical order. Each Part includes verification tasks to ensure preceding Parts are complete before starting.

---

## Part 1: CMS Authentication API Enhancement

**Prerequisites:** None (starting point)

**Verification Step:** Verify CMS backend is running and existing authentication works

**Goal:** Implement SMS-specific authentication endpoints that support username/email/phone login and provide organization metadata for multi-tenant database discovery.

#### Subsection 1.1: SMS-Specific Authentication Endpoints

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\routes\smsAuth.routes.js`
- Modify: `D:\VIbeCode\KMainCMS\backend\controllers\auth.controller.js:27-126`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\api\sms-auth.test.js`

**Interfaces:**
- Consumes: Existing UserRepository.findByIdentifier, IdentityService, ResponseHandler
- Produces: SMS-specific login endpoint that returns organization database connection metadata, JWT token with SMS scope, and sync configuration

- [ ] **Step 1: Define the failing test cases**

Create tests for SMS login endpoint that verify:
- Login with username returns organization metadata and SMS-scoped token
- Login with email returns organization metadata and SMS-scoped token  
- Login with phone number returns organization metadata and SMS-scoped token
- Invalid credentials return 401 with standard error format
- Inactive user returns 401 with standard error format
- Locked account returns 429 with remaining time in minutes
- Response includes church_id, church_slug, database_connection_key (encrypted), sync_endpoint_url, snapshot_interval, rolling_update_interval
- Token includes SMS scope in JWT payload
- MFA-enabled admin users require MFA token for SMS access

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/api/sms-auth.test.js`

Expected: All tests fail with 404 for missing endpoint and authentication errors

- [ ] **Step 3: Implement the minimal behavior**

Add SMS login route that:
- Accepts identifier, password, mfaToken (optional) in request body
- Calls existing UserRepository.findByIdentifier with identifier
- Performs existing password validation and account lock checks
- Calls IdentityService.getIdentity to get user roles and MFA status
- Generates JWT token with SMS scope using existing generateAccessToken
- Creates encrypted database connection key using existing security helpers
- Returns ResponseHandler.success with organization metadata, token, and sync configuration
- Handles MFA requirement for admin users per existing logic
- Uses existing error handling patterns from base login method

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/api/sms-auth.test.js`

Expected: All tests pass, endpoint returns proper SMS-scoped tokens and organization metadata

- [ ] **Step 5: Commit**

Stage: `backend/routes/smsAuth.routes.js`, `backend/controllers/auth.controller.js`, `backend/tests/api/sms-auth.test.js`

Commit message: "Add SMS-specific authentication endpoint with organization metadata and scoped tokens"

#### Subsection 1.2: SMS Organization Discovery Endpoint

**Files:**
- Modify: `D:\VIbeCode\KMainCMS\backend\routes\smsAuth.routes.js`
- Create: `D:\VIbeCode\KMainCMS\backend\controllers\smsOrganization.controller.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\api\sms-organization.test.js`

**Interfaces:**
- Consumes: SMS authentication token, ChurchRepository, existing ResponseHandler
- Produces: Organization metadata endpoint that validates SMS scope and returns church configuration

- [ ] **Step 1: Define the failing test cases**

Create tests for organization discovery that verify:
- Valid SMS token returns church configuration (id, slug, name, api_key, is_active)
- Invalid or expired token returns 401
- Non-SMS scoped token returns 403
- Inactive church returns 403 with appropriate error message
- Response includes SMS-specific configuration (sync_enabled, snapshot_schedule, rolling_update_interval)
- Missing church_id in token returns 400

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/api/sms-organization.test.js`

Expected: All tests fail with 404 for missing endpoint

- [ ] **Step 3: Implement the minimal behavior**

Create organization controller that:
- Validates JWT token and extracts church_id from token payload
- Verifies token has SMS scope using existing IdentityService helpers
- Fetches church details using existing ChurchRepository
- Checks church is_active status
- Returns SMS-specific configuration including sync settings
- Uses existing ResponseHandler format for all responses
- Follows existing error handling patterns from base controllers

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/api/sms-organization.test.js`

Expected: All tests pass, endpoint returns proper church configuration for SMS clients

- [ ] **Step 5: Commit**

Stage: `backend/routes/smsAuth.routes.js`, `backend/controllers/smsOrganization.controller.js`, `backend/tests/api/sms-organization.test.js`

Commit message: "Add SMS organization discovery endpoint with scope validation"

#### Part 1 Completion Verification

- [ ] **Verification Step:** Run `npm test -- tests/api/sms-auth.test.js tests/api/sms-organization.test.js`
- [ ] **Success Criteria:** All authentication and organization discovery tests pass, endpoints return proper SMS-scoped tokens and metadata

## Part 2: Snapshot and Rolling Update System

**Prerequisites:** Part 1 must be complete (SMS authentication endpoints working)

**Verification Step:** Run `npm test -- tests/api/sms-auth.test.js tests/api/sms-organization.test.js` to verify Part 1 completion

**Goal:** Implement the database schema, generation services, and scheduled jobs for the daily snapshot and 5-minute rolling update sync system.

#### Subsection 2.1: Snapshot Database Schema

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\migrations\003_add_snapshot_tables.sql`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\migrations\003_snapshot_tables.test.js`

**Interfaces:**
- Consumes: Existing database schema conventions, church_id foreign key pattern
- Produces: Database tables for daily snapshots and rolling updates with proper indexing

- [ ] **Step 1: Define the failing test cases**

Create migration tests that verify:
- sms_daily_snapshots table created with correct columns (id, church_id, snapshot_date, data_hash, compressed_data, created_at, file_size)
- sms_rolling_updates table created with correct columns (id, church_id, update_type, entity_type, entity_id, operation, data, created_at, sequence_number)
- Proper foreign key constraints on church_id
- Indexes on church_id, snapshot_date, created_at for query performance
- Unique constraint on (church_id, snapshot_date) for daily snapshots
- Unique constraint on (church_id, sequence_number) for rolling updates
- Tables inherit existing timestamp conventions

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/migrations/003_snapshot_tables.test.js`

Expected: Tests fail due to missing tables and constraints

- [ ] **Step 3: Implement the minimal behavior**

Create SQL migration that:
- Defines sms_daily_snapshots table with UUID primary key, church_id foreign key, snapshot_date (date), data_hash (varchar), compressed_data (bytea), created_at (timestamp), file_size (integer)
- Defines sms_rolling_updates table with UUID primary key, church_id foreign key, update_type (varchar), entity_type (varchar), entity_id (uuid), operation (varchar), data (jsonb), created_at (timestamp), sequence_number (bigint)
- Adds foreign key constraints to churches table on church_id
- Creates indexes on church_id, snapshot_date, created_at for snapshots
- Creates indexes on church_id, created_at, sequence_number for rolling updates
- Adds unique constraint on (church_id, snapshot_date) for daily snapshots
- Adds unique constraint on (church_id, sequence_number) for rolling updates
- Follows existing migration naming and structure conventions

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/migrations/003_snapshot_tables.test.js`

Expected: All tests pass, tables created with proper structure and constraints

- [ ] **Step 5: Commit**

Stage: `backend/migrations/003_add_snapshot_tables.sql`, `backend/tests/migrations/003_snapshot_tables.test.js`

Commit message: "Add snapshot and rolling update database tables with proper indexing"

#### Subsection 2.2: Snapshot Generation Service

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\services\SnapshotService.js`
- Create: `D:\VIbeCode\KMainCMS\backend\repositories\SnapshotRepository.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\services\SnapshotService.test.js`

**Interfaces:**
- Consumes: Church database connection, existing data models (contacts, groups, messages), compression utilities
- Produces: Daily snapshot generation with compression, hash verification, and storage

- [ ] **Step 1: Define the failing test cases**

Create service tests that verify:
- generateDailySnapshot creates compressed JSON of all church data (contacts, groups, messages, templates)
- Snapshot includes metadata: timestamp, church_id, data_hash, record_counts
- Compressed data size is reduced by at least 70% from raw JSON
- Data hash is consistent for identical data sets
- Snapshot is stored in sms_daily_snapshots table with correct metadata
- Duplicate snapshot for same church/day returns existing snapshot
- Failed snapshot generation throws error with church_id and timestamp
- Snapshot includes all required entity types and relationships

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/services/SnapshotService.test.js`

Expected: All tests fail due to missing service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create SnapshotService that:
- Accepts church_id and database connection parameters
- Queries all contacts, groups, messages, templates for the church
- Structures data as JSON with proper entity relationships and metadata
- Generates SHA-256 hash of the data for integrity verification
- Compresses JSON data using gzip compression
- Stores compressed data in sms_daily_snapshots table
- Calculates and stores file_size, data_hash, snapshot_date
- Uses existing database connection patterns from other services
- Implements idempotent snapshot generation (check existing before creating)
- Throws descriptive errors for database connection or compression failures
- Follows existing service error handling and logging patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/services/SnapshotService.test.js`

Expected: All tests pass, snapshots generated correctly with compression and hash verification

- [ ] **Step 5: Commit**

Stage: `backend/services/SnapshotService.js`, `backend/repositories/SnapshotRepository.js`, `backend/tests/services/SnapshotService.test.js`

Commit message: "Implement daily snapshot generation service with compression and hash verification"

#### Subsection 2.3: Rolling Update Capture Service

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\services\RollingUpdateService.js`
- Modify: `D:\VIbeCode\KMainCMS\backend\repositories\SnapshotRepository.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\services\RollingUpdateService.test.js`

**Interfaces:**
- Consumes: Database change events, entity CRUD operations, sequence number management
- Produces: Rolling update log entries with operation type, entity data, and sequence numbers

- [ ] **Step 1: Define the failing test cases**

Create service tests that verify:
- captureUpdate logs contact creation with operation='create', entity_type='contact'
- captureUpdate logs contact update with operation='update', entity_type='contact' and delta data
- captureUpdate logs contact deletion with operation='delete', entity_type='contact'
- captureUpdate logs group operations with proper entity_type
- captureUpdate logs message operations with proper entity_type
- Sequence numbers increment monotonically per church
- Updates include complete entity data in JSON format
- Failed update capture throws error with entity details
- Concurrent updates receive unique sequence numbers
- Rolling updates are stored in sms_rolling_updates table with correct metadata

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/services/RollingUpdateService.test.js`

Expected: All tests fail due to missing service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create RollingUpdateService that:
- Accepts church_id, operation, entity_type, entity_id, and entity_data
- Generates monotonically increasing sequence_number per church using database sequence
- Stores update record in sms_rolling_updates table with timestamp
- Handles operations: create, update, delete for entities: contact, group, message, template
- Stores complete entity data as JSONB for update operations
- Stores minimal metadata for delete operations (entity_id, entity_type)
- Implements sequence number conflict resolution for concurrent updates
- Uses existing database transaction patterns for atomic sequence allocation
- Throws descriptive errors for invalid operations or missing required fields
- Follows existing service error handling and logging patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/services/RollingUpdateService.test.js`

Expected: All tests pass, rolling updates captured correctly with sequence numbers

- [ ] **Step 5: Commit**

Stage: `backend/services/RollingUpdateService.js`, `backend/repositories/SnapshotRepository.js`, `backend/tests/services/RollingUpdateService.test.js`

Commit message: "Implement rolling update capture service with sequence numbering"

#### Subsection 2.4: Scheduled Snapshot Jobs

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\jobs\SnapshotJob.js`
- Create: `D:\VIbeCode\KMainCMS\backend\jobs\RollingUpdateJob.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\jobs\SnapshotJob.test.js`

**Interfaces:**
- Consumes: SnapshotService, RollingUpdateService, ChurchRepository, existing job scheduler
- Produces: Scheduled jobs for daily snapshots and 5-minute rolling update syncs

- [ ] **Step 1: Define the failing test cases**

Create job tests that verify:
- Daily snapshot job runs at 00:00 UTC for each active church
- Snapshot job calls SnapshotService.generateDailySnapshot for each church
- Failed snapshot for one church doesn't stop processing other churches
- Rolling update job runs every 5 minutes
- Rolling update job processes pending updates from all active churches
- Jobs log success/failure for each church processed
- Jobs handle database connection errors gracefully
- Jobs respect church is_active flag

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/jobs/SnapshotJob.test.js`

Expected: All tests fail due to missing job implementations

- [ ] **Step 3: Implement the minimal behavior**

Create scheduled jobs that:
- Daily snapshot job queries all active churches from ChurchRepository
- Calls SnapshotService.generateDailySnapshot for each church at 00:00 UTC
- Rolls back snapshot on failure and logs error with church_id
- Continues processing other churches if one fails
- Rolling update job runs every 5 minutes using cron scheduler
- Queries and processes pending updates from sms_rolling_updates table
- Marks processed updates to prevent duplicate processing
- Uses existing job scheduler patterns from other scheduled jobs
- Implements error handling and logging per existing job patterns
- Follows existing database connection and transaction patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/jobs/SnapshotJob.test.js`

Expected: All tests pass, scheduled jobs run correctly for all active churches

- [ ] **Step 5: Commit**

Stage: `backend/jobs/SnapshotJob.js`, `backend/jobs/RollingUpdateJob.js`, `backend/tests/jobs/SnapshotJob.test.js`

Commit message: "Implement scheduled snapshot and rolling update jobs"

#### Part 2 Completion Verification

- [ ] **Verification Step:** Run `npm test -- tests/migrations/003_snapshot_tables.test.js tests/services/SnapshotService.test.js tests/services/RollingUpdateService.test.js tests/jobs/SnapshotJob.test.js`
- [ ] **Success Criteria:** All snapshot and rolling update tests pass, database schema created, services generate snapshots correctly, scheduled jobs run successfully

## Part 3: SMS Sync API Endpoints

**Prerequisites:** Part 1 and Part 2 must be complete (authentication and snapshot system working)

**Verification Step:** Run `npm test -- tests/api/sms-auth.test.js tests/services/SnapshotService.test.js` to verify Parts 1-2 completion

**Goal:** Implement the CMS API endpoints that SMS clients use to download snapshots and fetch rolling updates.

#### Subsection 3.1: Snapshot Download Endpoint

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\routes\smsSync.routes.js`
- Create: `D:\VIbeCode\KMainCMS\backend\controllers\smsSync.controller.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\api\sms-sync.test.js`

**Interfaces:**
- Consumes: SMS authentication token, SnapshotRepository, existing ResponseHandler
- Produces: Snapshot download endpoint with compression and delta support

- [ ] **Step 1: Define the failing test cases**

Create sync API tests that verify:
- Valid SMS token can download latest daily snapshot for their church
- Response includes compressed data, data_hash, snapshot_date, file_size
- Invalid token returns 401
- Requesting snapshot for different church returns 403
- Requesting non-existent snapshot returns 404
- Supports since_date parameter for delta snapshots
- Delta response includes only changes since specified date
- Response includes Content-Encoding: gzip header
- Response includes appropriate cache headers

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/api/sms-sync.test.js`

Expected: All tests fail with 404 for missing endpoint

- [ ] **Step 3: Implement the minimal behavior**

Create sync controller that:
- Validates JWT token and extracts church_id from token payload
- Verifies token has SMS scope
- Queries sms_daily_snapshots table for latest church snapshot
- Returns 404 if no snapshot exists for the church
- Supports optional since_date query parameter for delta requests
- For delta requests, queries rolling updates since specified date
- Returns compressed data with appropriate headers (Content-Encoding, Content-Type)
- Includes metadata: data_hash, snapshot_date, file_size, record_counts
- Uses existing ResponseHandler format for success/error responses
- Implements cache headers for efficient client caching
- Follows existing error handling patterns from base controllers

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/api/sms-sync.test.js`

Expected: All tests pass, endpoint returns proper snapshot data with compression

- [ ] **Step 5: Commit**

Stage: `backend/routes/smsSync.routes.js`, `backend/controllers/smsSync.controller.js`, `backend/tests/api/sms-sync.test.js`

Commit message: "Add SMS snapshot download endpoint with delta support"

#### Subsection 3.2: Rolling Updates Endpoint

**Files:**
- Modify: `D:\VIbeCode\KMainCMS\backend\routes\smsSync.routes.js`
- Modify: `D:\VIbeCode\KMainCMS\backend\controllers\smsSync.controller.js`
- Test: `D:\VIbeCode\KMainCMS\backend\tests\api\sms-sync.test.js`

**Interfaces:**
- Consumes: SMS authentication token, SnapshotRepository, existing ResponseHandler
- Produces: Rolling updates endpoint with sequence number-based pagination

- [ ] **Step 1: Define the failing test cases**

Add rolling update tests that verify:
- Valid SMS token can fetch rolling updates for their church
- Supports since_sequence parameter for incremental sync
- Response includes array of updates with sequence numbers
- Updates are ordered by sequence_number ascending
- Response includes last_sequence_number for pagination
- Empty result returns empty array with last_sequence_number
- Invalid token returns 401
- Requesting updates for different church returns 403
- Supports limit parameter for batch size control

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- tests/api/sms-sync.test.js`

Expected: New tests fail for missing rolling updates endpoint

- [ ] **Step 3: Implement the minimal behavior**

Add rolling updates endpoint that:
- Validates JWT token and extracts church_id from token payload
- Verifies token has SMS scope
- Queries sms_rolling_updates table for church updates
- Supports optional since_sequence parameter for incremental sync
- Supports optional limit parameter (default 100, max 1000)
- Orders results by sequence_number ascending
- Returns array of updates with full entity data
- Includes last_sequence_number for client pagination
- Returns empty array if no updates available
- Uses existing ResponseHandler format for responses
- Follows existing error handling patterns from base controllers

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- tests/api/sms-sync.test.js`

Expected: All tests pass, endpoint returns proper rolling updates with pagination

- [ ] **Step 5: Commit**

Stage: `backend/routes/smsSync.routes.js`, `backend/controllers/smsSync.controller.js`, `backend/tests/api/sms-sync.test.js`

Commit message: "Add SMS rolling updates endpoint with sequence-based pagination"

#### Part 3 Completion Verification

- [ ] **Verification Step:** Run `npm test -- tests/api/sms-sync.test.js`
- [ ] **Success Criteria:** All sync API tests pass, snapshot download and rolling update endpoints work correctly with proper authentication

## Part 4: SMS Web App Integration

**Prerequisites:** Parts 1-3 must be complete (authentication, snapshot system, and sync API endpoints working)

**Verification Step:** Run `npm test -- tests/api/sms-sync.test.js` to verify Parts 1-3 completion

**Goal:** Integrate the SMS web app with CMS authentication and implement the sync client for downloading snapshots and applying rolling updates.

#### Subsection 4.1: SMS Web App Authentication Update

**Files:**
- Modify: `D:\VIbeCode\SMS APP\1 JOSms WebApp\lib\api.ts:20-25`
- Modify: `D:\VIbeCode\SMS APP\1 JOSms WebApp\app\login\page.tsx`
- Test: `D:\VIbeCode\SMS APP\1 JOSms WebApp\__tests__\lib\api.test.ts`

**Interfaces:**
- Consumes: CMS SMS authentication endpoint, existing login UI components
- Produces: Updated authentication that uses CMS API and stores organization metadata

- [ ] **Step 1: Define the failing test cases**

Update API tests to verify:
- login function calls CMS SMS auth endpoint instead of local endpoint
- login accepts identifier (username/email/phone) instead of just email
- Response includes organization metadata and SMS-scoped token
- Token is stored in existing auth state management
- Organization metadata is stored for API calls
- Invalid credentials error is handled properly
- Login form accepts username, email, or phone in identifier field

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- __tests__/lib/api.test.ts`

Expected: Tests fail due to API endpoint mismatch and missing fields

- [ ] **Step 3: Implement the minimal behavior**

Update SMS web app authentication that:
- Changes login API endpoint to CMS SMS auth endpoint
- Updates login function parameter from email to identifier
- Updates login form label from "Email" to "Username, Email, or Phone"
- Stores returned organization metadata in existing state management
- Stores SMS-scoped JWT token for API calls
- Updates API base URL to use CMS endpoint from organization metadata
- Handles CMS ResponseHandler format for errors
- Maintains existing UI/UX patterns and error handling
- Uses existing auth state management (Zustand store)

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- __tests__/lib/api.test.ts`

Expected: All tests pass, authentication uses CMS API with proper metadata storage

- [ ] **Step 5: Commit**

Stage: `lib/api.ts`, `app/login/page.tsx`, `__tests__/lib/api.test.ts`

Commit message: "Update SMS web app authentication to use CMS API with username/email/phone support"

#### Subsection 4.2: SMS Web App Sync Client Implementation

**Files:**
- Create: `D:\VIbeCode\SMS APP\1 JOSms WebApp\lib\sync.ts`
- Modify: `D:\VIbeCode\SMS APP\1 JOSms WebApp\lib\store.ts`
- Create: `D:\VIbeCode\SMS APP\1 JOSms WebApp\app\sync\page.tsx`
- Test: `D:\VIbeCode\SMS APP\1 JOSms WebApp\__tests__\lib\sync.test.ts`

**Interfaces:**
- Consumes: CMS sync API endpoints, existing state management, local storage
- Produces: Sync client that downloads snapshots and applies rolling updates

- [ ] **Step 1: Define the failing test cases**

Create sync client tests that verify:
- fetchLatestSnapshot downloads and decompresses snapshot data
- Snapshot data is applied to local state management
- fetchRollingUpdates gets incremental updates since last sync
- Rolling updates are applied in sequence number order
- Sync handles network errors with retry logic
- Sync progress is tracked and reported
- Conflicts are detected and reported to user
- Local storage tracks last sync sequence number
- Manual sync trigger works correctly
- Auto-sync runs on configurable interval

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `npm test -- __tests__/lib/sync.test.ts`

Expected: All tests fail due to missing sync implementation

- [ ] **Step 3: Implement the minimal behavior**

Create sync client that:
- Implements fetchLatestSnapshot that calls CMS snapshot endpoint
- Decompresses gzip data and validates data hash
- Applies snapshot data to existing Zustand store for contacts, groups, messages
- Implements fetchRollingUpdates with since_sequence parameter
- Applies rolling updates in sequence number order to local state
- Tracks last sync sequence number in localStorage
- Implements retry logic for network failures (3 retries with exponential backoff)
- Detects conflicts when local data differs from server data
- Reports sync progress with percentage complete
- Provides manual sync trigger function
- Implements auto-sync on configurable interval (default 5 minutes)
- Uses existing API fetch patterns from lib/api.ts
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `npm test -- __tests__/lib/sync.test.ts`

Expected: All tests pass, sync client downloads and applies data correctly

- [ ] **Step 5: Commit**

Stage: `lib/sync.ts`, `lib/store.ts`, `app/sync/page.tsx`, `__tests__/lib/sync.test.ts`

Commit message: "Implement SMS web app sync client with snapshot and rolling update support"

#### Part 4 Completion Verification

- [ ] **Verification Step:** Run `npm test -- __tests__/lib/api.test.ts __tests__/lib/sync.test.ts`
- [ ] **Success Criteria:** All web app authentication and sync tests pass, CMS integration works correctly



## Part 5: Android App Integration and Testing

**Prerequisites:** Parts 1-4 must be complete (CMS backend, web app integration working)

**Verification Step:** Run `npm test -- __tests__/lib/sync.test.ts` to verify Parts 1-4 completion

**Goal:** Integrate the Android app with CMS authentication, implement the sync service with SQLite storage, and create comprehensive integration tests and documentation.

#### Subsection 5.1: Android App Authentication Update

**Files:**
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\api_service.dart:194-228`
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\login_screen.dart:243-260`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\services\api_service_test.dart`

**Interfaces:**
- Consumes: CMS SMS authentication endpoint, existing login UI
- Produces: Updated authentication that uses CMS API and stores organization metadata

- [ ] **Step 1: Define the failing test cases**

Create Android API service tests that verify:
- login method calls CMS SMS auth endpoint instead of direct backend
- login accepts identifier (username/email/phone) parameter
- Response includes organization metadata and SMS-scoped token
- Token is stored in existing SharedPreferences
- Organization metadata is stored for API configuration
- Invalid credentials error is handled properly
- Login form accepts username, email, or phone in identifier field

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/services/api_service_test.dart`

Expected: Tests fail due to API endpoint mismatch and missing fields

- [ ] **Step 3: Implement the minimal behavior**

Update Android app authentication that:
- Changes login API endpoint to CMS SMS auth endpoint
- Updates login method parameter from email to identifier
- Updates login form label from "Email Address" to "Username, Email, or Phone"
- Stores returned organization metadata in SharedPreferences
- Stores SMS-scoped JWT token for API calls
- Updates API base URL to use CMS endpoint from organization metadata
- Handles CMS ResponseHandler format for errors
- Maintains existing UI/UX patterns and error handling
- Uses existing auth state management (Riverpod providers)

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/services/api_service_test.dart`

Expected: All tests pass, authentication uses CMS API with proper metadata storage

- [ ] **Step 5: Commit**

Stage: `lib/services/api_service.dart`, `lib/screens/login_screen.dart`, `test/services/api_service_test.dart`

Commit message: "Update Android app authentication to use CMS API with username/email/phone support"

#### Subsection 5.2: Android SQLite Sync Storage Implementation

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\sync_storage_service.dart`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\models\sync_models.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\services\sync_storage_service_test.dart`

**Interfaces:**
- Consumes: SQLite database, existing sqflite package
- Produces: Local storage service for snapshot data and rolling updates

- [ ] **Step 1: Define the failing test cases**

Create sync storage tests that verify:
- Database initialization creates required tables (contacts, groups, messages, sync_metadata)
- Snapshot data can be stored and retrieved with compression
- Rolling updates can be stored with sequence numbers
- Last sync sequence number is tracked
- Data integrity checks validate stored data
- Database handles concurrent access correctly
- Database upgrade migrations work correctly
- Clear data function removes all local data

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/services/sync_storage_service_test.dart`

Expected: All tests fail due to missing sync storage implementation

- [ ] **Step 3: Implement the minimal behavior**

Create sync storage service that:
- Initializes SQLite database with required tables
- Creates tables for contacts, groups, messages, sync_metadata
- Implements storeSnapshot that decompresses and stores snapshot data
- Implements getSnapshot that retrieves and validates snapshot data
- Implements storeRollingUpdate that stores updates with sequence numbers
- Implements getRollingUpdatesSince that retrieves updates after sequence
- Implements getLastSyncSequence that tracks sync progress
- Implements clearData that removes all local data
- Uses existing sqflite package patterns from other database operations
- Implements data integrity validation (hash checks)
- Handles database version migrations
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/services/sync_storage_service_test.dart`

Expected: All tests pass, sync storage stores and retrieves data correctly

- [ ] **Step 5: Commit**

Stage: `lib/services/sync_storage_service.dart`, `lib/models/sync_models.dart`, `test/services/sync_storage_service_test.dart`

Commit message: "Implement Android SQLite sync storage service with compression support"

#### Subsection 5.3: Android Sync Service Implementation

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\sync_service.dart`
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\dashboard_screen.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\services\sync_service_test.dart`

**Interfaces:**
- Consumes: CMS sync API endpoints, sync storage service, existing API service
- Produces: Sync service that downloads snapshots and applies rolling updates

- [ ] **Step 1: Define the failing test cases**

Create sync service tests that verify:
- performFullSync downloads and applies latest snapshot
- performIncrementalSync fetches and applies rolling updates
- Sync handles network errors with retry logic
- Sync progress is reported via stream
- Conflicts are detected and reported
- Offline mode allows local data access
- Background sync works correctly
- Sync can be cancelled
- Sync status is tracked and queryable

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/services/sync_service_test.dart`

Expected: All tests fail due to missing sync service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create sync service that:
- Implements performFullSync that calls CMS snapshot endpoint
- Decompresses gzip data and validates data hash
- Stores snapshot data using sync storage service
- Implements performIncrementalSync with since_sequence parameter
- Applies rolling updates in sequence number order
- Tracks last sync sequence number in sync storage
- Implements retry logic for network failures (3 retries with exponential backoff)
- Detects conflicts when local data differs from server data
- Reports sync progress via Stream (percentage complete, current operation)
- Provides cancelSync function for long-running operations
- Implements background sync using work manager or similar
- Allows offline data access from local SQLite
- Uses existing API service patterns for HTTP calls
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/services/sync_service_test.dart`

Expected: All tests pass, sync service downloads and applies data correctly

- [ ] **Step 5: Commit**

Stage: `lib/services/sync_service.dart`, `lib/screens/dashboard_screen.dart`, `test/services/sync_service_test.dart`

Commit message: "Implement Android sync service with snapshot and rolling update support"

#### Subsection 5.4: End-to-End Integration Testing

**Files:**
- Create: `D:\VIbeCode\KMainCMS\backend\tests\e2e\sms-sync-integration.test.js`
- Create: `D:\VIbeCode\SMS APP\1 JOSms WebApp\e2e\sync.spec.ts`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\integration_test\sync_test.dart`

**Interfaces:**
- Consumes: All implemented services and endpoints
- Produces: End-to-end tests verifying complete sync workflow

- [ ] **Step 1: Define the failing test cases**

Create integration tests that verify:
- User can login with username/email/phone on web app
- User can login with username/email/phone on Android app
- Web app downloads and applies initial snapshot
- Android app downloads and applies initial snapshot
- Rolling updates are synced to web app
- Rolling updates are synced to Android app
- Conflict resolution works correctly
- Offline mode works on Android app
- Sync works after CMS database changes
- Multiple churches don't interfere with each other

- [ ] **Step 2: Run the focused test command and confirm failure**

Run integration test commands for each platform

Expected: All tests fail due to incomplete integration

- [ ] **Step 3: Implement the minimal behavior**

Create integration tests that:
- Test complete authentication flow on web and mobile
- Test initial snapshot download and application
- Test rolling update sync across platforms
- Test conflict detection and resolution
- Test offline functionality on Android
- Test multi-tenant isolation between churches
- Use existing test patterns from each platform
- Set up test data and cleanup procedures
- Mock external dependencies where appropriate

- [ ] **Step 4: Run focused verification and confirm success**

Run integration test commands for each platform

Expected: All integration tests pass, complete workflow verified

- [ ] **Step 5: Commit**

Stage all integration test files

Commit message: "Add end-to-end integration tests for SMS sync workflow"

#### Subsection 5.5: Documentation and Deployment Guides

**Files:**
- Create: `D:\VIbeCode\KMainCMS\docs\sms-sync-architecture.md`
- Create: `D:\VIbeCode\KMainCMS\docs\sms-sync-deployment.md`
- Create: `D:\VIbeCode\SMS APP\1 JOSms WebApp\docs\cms-integration.md`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\docs\cms-integration.md`

**Interfaces:**
- Consumes: All implemented features and configurations
- Produces: Comprehensive documentation for developers and operators

- [ ] **Step 1: Define the documentation requirements**

Create documentation that covers:
- Architecture overview of CMS-SMS integration
- Authentication flow with username/email/phone support
- Snapshot generation and storage process
- Rolling update capture and sync process
- API endpoint specifications
- Web app integration guide
- Android app integration guide
- Deployment procedures
- Troubleshooting common issues
- Security considerations
- Performance optimization tips

- [ ] **Step 2: Create architecture documentation**

Write SMS sync architecture document that:
- Explains multi-tenant database architecture
- Describes snapshot and rolling update system
- Details authentication flow and token handling
- Includes diagrams of data flow
- Explains conflict resolution strategy
- Documents security measures

- [ ] **Step 3: Create deployment documentation**

Write deployment guide that:
- Details CMS configuration requirements
- Explains database migration process
- Documents scheduled job setup
- Provides environment variable reference
- Includes monitoring and logging setup
- Documents backup and recovery procedures

- [ ] **Step 4: Create integration guides**

Write platform-specific integration guides that:
- Detail web app CMS integration steps
- Detail Android app CMS integration steps
- Provide code examples for common operations
- Document configuration options
- Include troubleshooting sections

- [ ] **Step 5: Commit**

Stage all documentation files

Commit message: "Add comprehensive documentation for CMS-SMS integration and sync system"

#### Part 5 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/services/sync_service_test.dart` and integration test commands
- [ ] **Success Criteria:** All Android app tests pass, integration tests verify complete workflow, documentation is complete

## Self-Review

**1. Spec coverage:**
- ✅ Multi-tenancy CMS connection: Part 1 implements CMS authentication endpoints
- ✅ Username/email/phone login: Part 1, Part 4, Part 5 implement across all platforms  
- ✅ Daily snapshot system: Part 2 implements snapshot generation and scheduling
- ✅ 5-minute rolling updates: Part 2 implements rolling update capture and sync
- ✅ Web app integration: Part 4 implements CMS authentication and sync client
- ✅ Android app integration: Part 5 implements CMS authentication and sync service
- ✅ Testing and documentation: Part 5 implements integration tests and documentation

**2. Placeholder scan:**
- No placeholders found - all tasks include specific implementation details, file paths, and verification criteria

**3. Type consistency:**
- All API responses follow CMS ResponseHandler format consistently
- Database schema follows existing CMS conventions (snake_case, church_id FK)
- Authentication tokens use existing JWT patterns
- Sync data structures are consistent across web and mobile platforms

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-01-27-cms-sms-integration.md`. This plan is structured for 5-agent parallel execution with Part-level dependencies. Three execution options:**

**1. Multi-Agent Parallel (recommended for large plans)** - Dispatch 5 agents simultaneously, each takes one Part, coordinated via prerequisite verification

**2. Single-Agent Sequential** - One agent executes Parts 1-5 in order, using executing-plans skill

**3. Subagent-Driven Per-Task** - Dispatch fresh subagent per subsection, review between steps (most granular control)

**Which approach?**

**If Multi-Agent Parallel chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development with multi-agent coordination
- Dispatch 5 agents simultaneously, each assigned to a different Part
- Each agent verifies prerequisites before starting their Part
- Coordinate completion and handle any cross-Part dependencies

**If Single-Agent Sequential chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Execute Parts 1-5 in order with Part-level verification checkpoints
- Single agent maintains context across entire implementation

**If Subagent-Driven Per-Task chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per subsection + two-stage review
- Most granular control but slower overall execution