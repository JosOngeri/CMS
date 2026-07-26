# KMainCMS Android App CMS Integration Plan

> **For agentic workers:** This plan is structured for 3-agent parallel execution. Each Part can be assigned to a different agent. REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for coordinated multi-agent execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the KMainCMS Android app (Msabato) with the CMS multi-tenancy system to support username/email/phone login, user-specific data sync for offline access, and implement an efficient hybrid sync architecture with minimal data usage and VPS resource consumption.

**Architecture:** The CMS acts as the central authentication and database discovery service. Each church has its own database. The Android app connects to CMS for authentication, then syncs user-specific data using an efficient hybrid approach: (1) Pull mechanism - app polls every 5 minutes when online to check for updates and downloads only delta changes, (2) Push mechanism - server immediately pushes updates to relevant users when changes occur (e.g., department head updates → members get immediate push). Users always have their data available offline, with popup prompts for online-required features. System optimized for minimal data transfer and VPS resource usage through delta compression, efficient caching, and connection pooling.

**Tech Stack:**
- **CMS Backend:** Node.js, Express, PostgreSQL with multi-tenant database architecture
- **Android App:** Flutter, Riverpod state management, SQLite local storage
- **Sync Protocol:** Hybrid REST + WebSocket for efficient sync, JSON delta compression, minimal data transfer
- **Push Notifications:** WebSocket or FCM for immediate updates to relevant users
- **Authentication:** JWT tokens from CMS
- **Optimization:** Connection pooling, delta-only transfers, gzip compression, efficient caching

## Global Constraints

- Use existing CMS UserRepository.findByIdentifier for login (already supports username/email/phone)
- Maintain existing CMS ResponseHandler format for all API responses
- Follow existing CMS database schema conventions (snake_case columns, church_id foreign keys)
- Use existing CMS security helpers (hashPassword, comparePassword, generateAccessToken)
- Android app must work offline with user-specific data in local SQLite database
- All API calls must include Bearer token authentication
- Sync only user-specific data (contacts, groups, messages, templates) for offline access
- Implement hybrid sync: pull (5-min polling) + push (immediate updates to relevant users)
- Use delta-only transfers to minimize data usage
- All data transfers must use gzip compression
- Implement efficient connection pooling to minimize VPS resource usage
- Use WebSocket or FCM for immediate push notifications to relevant users
- Database connection details must never be exposed to client applications
- All sync operations must be idempotent and handle network failures gracefully
- Online-required features must show popup prompts asking user to go online
- User data is always available offline, server sync happens when connection available
- Minimize VPS resource usage through efficient caching, connection reuse, and optimized queries

## Agent Assignment Structure

This plan is divided into 4 Parts for parallel agent execution:

- **Part 1:** Android App Authentication Update - CMS authentication with username/email/phone support
- **Part 2:** Android SQLite Sync Storage - Local database for user-specific offline data and sync metadata
- **Part 3:** Efficient Hybrid Sync Service - Pull (5-min polling) + push (WebSocket/FCM) with delta compression
- **Part 4:** Online Detection, Testing, and Documentation - Network monitoring, integration tests, and documentation

**Dependencies:** Parts must be executed in numerical order. Each Part includes verification tasks to ensure preceding Parts are complete before starting.

---

## Part 1: Android App Authentication Update

**Prerequisites:** None (starting point)

**Verification Step:** Verify CMS backend is running and existing authentication works

**Goal:** Update the Android app authentication to use CMS API with username/email/phone login support and organization metadata storage.

#### Subsection 1.1: Update Login API Service

**Files:**
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\api_service.dart:194-228`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\api_service_test.dart`

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

Run: `flutter test test/unit/services/api_service_test.dart`

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

Run: `flutter test test/unit/services/api_service_test.dart`

Expected: All tests pass, authentication uses CMS API with proper metadata storage

- [ ] **Step 5: Commit**

Stage: `lib/services/api_service.dart`, `test/unit/services/api_service_test.dart`

Commit message: "Update Android app authentication to use CMS API with username/email/phone support"

#### Subsection 1.2: Update Login Screen UI

**Files:**
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\login_screen.dart:243-260`

**Interfaces:**
- Consumes: Updated API service with identifier parameter
- Produces: Updated login UI that accepts username/email/phone

- [ ] **Step 1: Define the failing test cases**

Create UI tests that verify:
- Login form label changed from "Email Address" to "Username, Email, or Phone"
- Form accepts username, email, or phone number input
- Form validation accepts all three identifier types
- Error messages handle all identifier types appropriately

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/screens/login_screen_test.dart`

Expected: Tests fail due to incorrect form labels and validation

- [ ] **Step 3: Implement the minimal behavior**

Update login screen that:
- Changes email field label to "Username, Email, or Phone"
- Updates field validation to accept username, email, or phone formats
- Updates form helper text to indicate all three identifier types are accepted
- Maintains existing UI/UX patterns and styling
- Uses existing form validation patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/screens/login_screen_test.dart`

Expected: All tests pass, login form accepts all identifier types

- [ ] **Step 5: Commit**

Stage: `lib/screens/login_screen.dart`

Commit message: "Update login screen to accept username, email, or phone as identifier"

#### Part 1 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/unit/services/api_service_test.dart test/screens/login_screen_test.dart`
- [ ] **Success Criteria:** All authentication tests pass, login accepts username/email/phone, CMS integration works

---

## Part 2: Android SQLite Sync Storage

**Prerequisites:** Part 1 must be complete (CMS authentication working)

**Verification Step:** Run `flutter test test/unit/services/api_service_test.dart` to verify Part 1 completion

**Goal:** Implement local SQLite database storage for user-specific snapshot data and rolling updates with compression support.

#### Subsection 2.1: Create Sync Storage Service

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\sync_storage_service.dart`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\models\sync_models.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\sync_storage_service_test.dart`

**Interfaces:**
- Consumes: SQLite database, existing sqflite package
- Produces: Local storage service for snapshot data and rolling updates

- [ ] **Step 1: Define the failing test cases**

Create sync storage tests that verify:
- Database initialization creates required tables (user_contacts, user_groups, user_messages, user_templates, sync_metadata)
- User-specific snapshot data can be stored and retrieved with compression
- Rolling updates can be stored with sequence numbers and user_id
- Last sync sequence number is tracked per user
- Data integrity checks validate stored user data
- Database handles concurrent access correctly
- Database upgrade migrations work correctly
- Clear data function removes only current user's local data
- User isolation is maintained (no cross-user data leakage)

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/unit/services/sync_storage_service_test.dart`

Expected: All tests fail due to missing sync storage implementation

- [ ] **Step 3: Implement the minimal behavior**

Create sync storage service that:
- Initializes SQLite database with required user-scoped tables
- Creates tables for user_contacts, user_groups, user_messages, user_templates, sync_metadata
- Implements storeSnapshot that decompresses and stores user-specific snapshot data
- Implements getSnapshot that retrieves and validates user-specific snapshot data
- Implements storeRollingUpdate that stores updates with sequence numbers and user_id
- Implements getRollingUpdatesSince that retrieves user updates after sequence
- Implements getLastSyncSequence that tracks sync progress per user
- Implements clearData that removes only current user's local data
- Ensures user isolation (all queries include user_id filter)
- Uses existing sqflite package patterns from other database operations
- Implements data integrity validation (hash checks)
- Handles database version migrations
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/unit/services/sync_storage_service_test.dart`

Expected: All tests pass, sync storage stores and retrieves data correctly

- [ ] **Step 5: Commit**

Stage: `lib/services/sync_storage_service.dart`, `lib/models/sync_models.dart`, `test/unit/services/sync_storage_service_test.dart`

Commit message: "Implement Android SQLite sync storage service with compression support"

#### Part 2 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/unit/services/sync_storage_service_test.dart`
- [ ] **Success Criteria:** All sync storage tests pass, database schema created correctly, compression works

---

## Part 3: Android Sync Service and Testing

**Prerequisites:** Parts 1-2 must be complete (authentication and sync storage working)

**Verification Step:** Run `flutter test test/unit/services/sync_storage_service_test.dart` to verify Parts 1-2 completion

**Goal:** Implement the efficient hybrid sync service with pull (5-min polling) + push (WebSocket/FCM) mechanisms, delta compression, and minimal resource usage.

#### Subsection 3.1: Implement Pull Sync Service (5-Minute Polling)

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\pull_sync_service.dart`
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\dashboard_screen.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\pull_sync_service_test.dart`

**Interfaces:**
- Consumes: CMS sync API endpoints, sync storage service, existing API service
- Produces: Pull sync service that polls every 5 minutes for delta updates

- [ ] **Step 1: Define the failing test cases**

Create pull sync service tests that verify:
- checkForUpdates polls CMS endpoint for available updates
- Downloads only delta changes (not full data) when updates available
- Uses gzip compression for all data transfers
- Implements 5-minute polling interval when online
- Skips polling when offline to save resources
- Applies delta updates to local user data
- Tracks last sync timestamp to avoid duplicate downloads
- Handles network errors with exponential backoff
- Cancels polling when app goes to background
- Resumes polling when app comes to foreground

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/unit/services/pull_sync_service_test.dart`

Expected: All tests fail due to missing pull sync service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create pull sync service that:
- Implements checkForUpdates that calls CMS updates endpoint with last_sync_timestamp
- Downloads only delta changes (not full data) when updates available
- Uses gzip compression for all data transfers to minimize bandwidth
- Implements 5-minute polling interval using Timer when online
- Skips polling when offline to save battery and resources
- Applies delta updates to local user data using sync storage service
- Tracks last sync timestamp in SharedPreferences
- Implements exponential backoff for network errors (1s, 2s, 4s, 8s, max 30s)
- Cancels polling when app goes to background using AppLifecycleListener
- Resumes polling when app comes to foreground
- Uses efficient HTTP connection pooling
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/unit/services/pull_sync_service_test.dart`

Expected: All tests pass, pull sync works efficiently with delta transfers

- [ ] **Step 5: Commit**

Stage: `lib/services/pull_sync_service.dart`, `lib/screens/dashboard_screen.dart`, `test/unit/services/pull_sync_service_test.dart`

Commit message: "Implement efficient pull sync service with 5-minute polling and delta compression"

#### Subsection 3.2: Implement Push Sync Service (WebSocket/FCM)

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\push_sync_service.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\push_sync_service_test.dart`

**Interfaces:**
- Consumes: WebSocket/FCM connections, sync storage service
- Produces: Push sync service that receives immediate updates from server

- [ ] **Step 1: Define the failing test cases**

Create push sync service tests that verify:
- WebSocket connection establishes when user is online
- Receives immediate push updates when server sends changes
- Handles department head updates → member push notifications
- Applies pushed delta updates to local user data
- Reconnects automatically on connection loss
- Uses minimal data for push notifications (update IDs only)
- Falls back to polling if WebSocket unavailable
- Handles user-specific push routing (only relevant updates)
- Maintains connection with minimal resource usage
- Properly cleans up connections when user logs out

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/unit/services/push_sync_service_test.dart`

Expected: All tests fail due to missing push sync service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create push sync service that:
- Establishes WebSocket connection when user is online
- Receives immediate push updates when server sends changes for user
- Handles department head updates → immediate member push notifications
- Applies pushed delta updates to local user data using sync storage service
- Implements automatic reconnection with exponential backoff on connection loss
- Uses minimal data for push notifications (only update IDs, not full data)
- Falls back to pull sync if WebSocket unavailable
- Handles user-specific push routing based on user roles and department membership
- Maintains connection with minimal resource usage (keep-alive, connection pooling)
- Properly cleans up connections when user logs out or app closes
- Uses web_socket_channel package for WebSocket connections
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/unit/services/push_sync_service_test.dart`

Expected: All tests pass, push sync receives immediate updates correctly

- [ ] **Step 5: Commit**

Stage: `lib/services/push_sync_service.dart`, `test/unit/services/push_sync_service_test.dart`

Commit message: "Implement push sync service with WebSocket for immediate updates"

#### Part 3 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/unit/services/pull_sync_service_test.dart test/unit/services/push_sync_service_test.dart`
- [ ] **Success Criteria:** All sync service tests pass, hybrid pull+push sync works efficiently with minimal data usage

---

## Part 4: Online Detection, Testing, and Documentation

**Prerequisites:** Parts 1-3 must be complete (authentication, sync storage, and hybrid sync working)

**Verification Step:** Run `flutter test test/unit/services/pull_sync_service_test.dart test/unit/services/push_sync_service_test.dart` to verify Parts 1-3 completion

**Goal:** Implement online requirement detection with popup prompts, create comprehensive integration tests, and document the efficient hybrid sync architecture.

#### Subsection 4.1: Online Requirement Detection and Popup Prompts

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\network_service.dart`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\widgets\online_requirement_dialog.dart`
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\messages_screen.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\network_service_test.dart`

**Interfaces:**
- Consumes: Connectivity monitoring, existing UI components
- Produces: Network detection service and popup dialogs for online-required features

- [ ] **Step 1: Define the failing test cases**

Create network service tests that verify:
- isOnline correctly detects network connectivity status
- onOnlineStatusChange emits connectivity status changes
- requireOnline shows popup when offline
- requireOnline allows action when online
- Popup dialog shows appropriate message
- Popup dialog provides "Go Online" action
- Popup dialog can be dismissed
- Online-required features are marked appropriately

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/unit/services/network_service_test.dart`

Expected: All tests fail due to missing network service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create network service and dialog that:
- Implements connectivity monitoring using connectivity_plus package
- Provides isOnline boolean property
- Provides onOnlineStatusChange stream for connectivity changes
- Implements requireOnline function that shows popup when offline
- Creates online requirement dialog with user-friendly message
- Dialog provides "Go Online" button that opens network settings
- Dialog can be dismissed with "Cancel" button
- Integrates with existing message sending and real-time features
- Marks online-required features in UI (send message, live updates, etc.)
- Uses existing UI patterns and styling
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/unit/services/network_service_test.dart`

Expected: All tests pass, network detection works correctly, popups show appropriately

- [ ] **Step 5: Commit**

Stage: `lib/services/network_service.dart`, `lib/widgets/online_requirement_dialog.dart`, `lib/screens/messages_screen.dart`, `test/unit/services/network_service_test.dart`

Commit message: "Implement online requirement detection with popup prompts for online-required features"

#### Subsection 4.2: Create Integration Tests

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\integration_test\sync_test.dart`

**Interfaces:**
- Consumes: All implemented services and endpoints
- Produces: End-to-end tests verifying complete hybrid sync workflow

- [ ] **Step 1: Define the failing test cases**

Create integration tests that verify:
- User can login with username/email/phone on Android app
- Android app downloads and applies user-specific initial snapshot
- Pull sync works with 5-minute polling and delta compression
- Push sync receives immediate updates via WebSocket
- Department head updates trigger immediate member push notifications
- User-specific rolling updates are synced via hybrid approach
- Conflict resolution works correctly for user data
- Offline mode works with user data available locally
- Online requirement popups show when offline for online features
- Sync works after CMS database changes for user data
- User isolation is maintained (no cross-user data leakage)
- Multiple users don't interfere with each other's data
- System uses minimal data transfer (delta-only, compression)
- VPS resource usage is minimal (connection pooling, efficient queries)

- [ ] **Step 2: Run the focused test command and confirm failure**

Run integration test command

Expected: All tests fail due to incomplete integration

- [ ] **Step 3: Implement the minimal behavior**

Create integration tests that:
- Test complete authentication flow on Android with username/email/phone
- Test user-specific initial snapshot download and application
- Test pull sync with 5-minute polling and delta compression
- Test push sync with WebSocket immediate updates
- Test department head updates → member push notification flow
- Test user-specific rolling update sync via hybrid approach
- Test conflict detection and resolution for user data
- Test offline functionality with user data available
- Test online requirement popups for online features
- Test user isolation between different users
- Test sync after CMS database changes for user data
- Test minimal data transfer (verify delta-only, compression)
- Test efficient VPS resource usage (connection pooling, caching)
- Use existing test patterns from Flutter
- Set up test data and cleanup procedures
- Mock external dependencies where appropriate

- [ ] **Step 4: Run focused verification and confirm success**

Run integration test command

Expected: All integration tests pass, complete efficient hybrid workflow verified

- [ ] **Step 5: Commit**

Stage integration test file

Commit message: "Add end-to-end integration tests for efficient hybrid sync workflow"

#### Subsection 4.3: Create Documentation

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\docs\cms-integration.md`

**Interfaces:**
- Consumes: All implemented features and configurations
- Produces: Comprehensive documentation for developers and operators

- [ ] **Step 1: Define the documentation requirements**

Create documentation that covers:
- Architecture overview of efficient hybrid sync (pull + push)
- User-scoped multi-tenant database architecture
- Authentication flow with username/email/phone support
- Pull sync mechanism (5-minute polling, delta compression)
- Push sync mechanism (WebSocket, immediate updates)
- Offline-first architecture with user data always available
- Online requirement detection and popup prompts
- Minimal data usage strategies (delta-only, compression)
- Minimal VPS resource usage (connection pooling, caching, efficient queries)
- API endpoint specifications for user-scoped data
- Android app integration guide
- Deployment procedures
- Troubleshooting common issues
- Security considerations for user data isolation
- Performance optimization tips for efficient sync

- [ ] **Step 2: Create architecture documentation**

Write Android integration document that:
- Explains efficient hybrid sync architecture (pull + push)
- Explains user-scoped multi-tenant database architecture
- Describes user-specific snapshot and rolling update system
- Details pull sync (5-minute polling, delta compression, minimal bandwidth)
- Details push sync (WebSocket, immediate updates, department head → member flow)
- Details authentication flow and token handling
- Includes diagrams of efficient user data flow
- Explains offline-first architecture with user data always available
- Explains online requirement detection and popup prompts
- Explains conflict resolution strategy for user data
- Documents minimal data usage strategies
- Documents minimal VPS resource usage strategies
- Documents security measures for user data isolation

- [ ] **Step 3: Create integration guide**

Write Android app integration guide that:
- Details user-scoped CMS integration steps
- Provide code examples for user-specific operations
- Document configuration options for efficient hybrid sync
- Include troubleshooting sections for user sync issues
- Document offline functionality with user data availability
- Explain pull sync scheduling and background sync
- Explain push sync WebSocket integration
- Document online requirement detection implementation
- Provide examples of marking online-required features
- Document performance optimization for minimal data usage
- Document VPS resource optimization strategies

- [ ] **Step 4: Create deployment documentation**

Write deployment guide that:
- Details CMS configuration requirements for efficient sync
- Explains WebSocket server setup for push notifications
- Explains environment variable setup
- Documents build and release process
- Includes monitoring and logging setup
- Documents backup and recovery procedures
- Documents VPS resource monitoring and optimization

- [ ] **Step 5: Commit**

Stage documentation file

Commit message: "Add comprehensive documentation for efficient hybrid sync CMS integration"

#### Part 4 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/unit/services/network_service_test.dart` and integration test command
- [ ] **Success Criteria:** All Android app tests pass, integration tests verify complete efficient hybrid workflow, documentation is complete

#### Subsection 3.2: Online Requirement Detection and Popup Prompts

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\network_service.dart`
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\widgets\online_requirement_dialog.dart`
- Modify: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\messages_screen.dart`
- Test: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\test\unit\services\network_service_test.dart`

**Interfaces:**
- Consumes: Connectivity monitoring, existing UI components
- Produces: Network detection service and popup dialogs for online-required features

- [ ] **Step 1: Define the failing test cases**

Create network service tests that verify:
- isOnline correctly detects network connectivity status
- onOnlineStatusChange emits connectivity status changes
- requireOnline shows popup when offline
- requireOnline allows action when online
- Popup dialog shows appropriate message
- Popup dialog provides "Go Online" action
- Popup dialog can be dismissed
- Online-required features are marked appropriately

- [ ] **Step 2: Run the focused test command and confirm failure**

Run: `flutter test test/unit/services/network_service_test.dart`

Expected: All tests fail due to missing network service implementation

- [ ] **Step 3: Implement the minimal behavior**

Create network service and dialog that:
- Implements connectivity monitoring using connectivity_plus package
- Provides isOnline boolean property
- Provides onOnlineStatusChange stream for connectivity changes
- Implements requireOnline function that shows popup when offline
- Creates online requirement dialog with user-friendly message
- Dialog provides "Go Online" button that opens network settings
- Dialog can be dismissed with "Cancel" button
- Integrates with existing message sending and real-time features
- Marks online-required features in UI (send message, live updates, etc.)
- Uses existing UI patterns and styling
- Follows existing error handling patterns

- [ ] **Step 4: Run focused verification and confirm success**

Run: `flutter test test/unit/services/network_service_test.dart`

Expected: All tests pass, network detection works correctly, popups show appropriately

- [ ] **Step 5: Commit**

Stage: `lib/services/network_service.dart`, `lib/widgets/online_requirement_dialog.dart`, `lib/screens/messages_screen.dart`, `test/unit/services/network_service_test.dart`

Commit message: "Implement online requirement detection with popup prompts for online-required features"

#### Subsection 3.2: Create Integration Tests

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\integration_test\sync_test.dart`

**Interfaces:**
- Consumes: All implemented services and endpoints
- Produces: End-to-end tests verifying complete sync workflow

- [ ] **Step 1: Define the failing test cases**

Create integration tests that verify:
- User can login with username/email/phone on Android app
- Android app downloads and applies user-specific initial snapshot
- User-specific rolling updates are synced to Android app
- Conflict resolution works correctly for user data
- Offline mode works with user data available locally
- Online requirement popups show when offline for online features
- Sync works after CMS database changes for user data
- User isolation is maintained (no cross-user data leakage)
- Multiple users don't interfere with each other's data

- [ ] **Step 2: Run the focused test command and confirm failure**

Run integration test command

Expected: All tests fail due to incomplete integration

- [ ] **Step 3: Implement the minimal behavior**

Create integration tests that:
- Test complete authentication flow on Android with username/email/phone
- Test user-specific initial snapshot download and application
- Test user-specific rolling update sync
- Test conflict detection and resolution for user data
- Test offline functionality with user data available
- Test online requirement popups for online features
- Test user isolation between different users
- Test sync after CMS database changes for user data
- Use existing test patterns from Flutter
- Set up test data and cleanup procedures
- Mock external dependencies where appropriate

- [ ] **Step 4: Run focused verification and confirm success**

Run integration test command

Expected: All integration tests pass, complete workflow verified

- [ ] **Step 5: Commit**

Stage integration test file

Commit message: "Add end-to-end integration tests for Android sync workflow"

#### Subsection 3.3: Create Documentation

**Files:**
- Create: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\docs\cms-integration.md`

**Interfaces:**
- Consumes: All implemented features and configurations
- Produces: Comprehensive documentation for developers and operators

- [ ] **Step 1: Define the documentation requirements**

Create documentation that covers:
- Architecture overview of user-scoped CMS-Android integration
- Authentication flow with username/email/phone support
- User-specific snapshot generation and storage process
- User-specific rolling update capture and sync process
- Offline-first architecture with user data always available
- Online requirement detection and popup prompts
- API endpoint specifications for user-scoped data
- Android app integration guide
- Deployment procedures
- Troubleshooting common issues
- Security considerations for user data isolation
- Performance optimization tips for user-scoped sync

- [ ] **Step 2: Create architecture documentation**

Write Android integration document that:
- Explains user-scoped multi-tenant database architecture
- Describes user-specific snapshot and rolling update system
- Details authentication flow and token handling
- Includes diagrams of user data flow
- Explains offline-first architecture with user data always available
- Explains online requirement detection and popup prompts
- Explains conflict resolution strategy for user data
- Documents security measures for user data isolation

- [ ] **Step 3: Create integration guide**

Write Android app integration guide that:
- Details user-scoped CMS integration steps
- Provide code examples for user-specific operations
- Document configuration options for user data sync
- Include troubleshooting sections for user sync issues
- Document offline functionality with user data availability
- Explain sync scheduling and background sync for user data
- Document online requirement detection implementation
- Provide examples of marking online-required features

- [ ] **Step 4: Create deployment documentation**

Write deployment guide that:
- Details CMS configuration requirements
- Explains environment variable setup
- Documents build and release process
- Includes monitoring and logging setup
- Documents backup and recovery procedures

- [ ] **Step 5: Commit**

Stage documentation file

Commit message: "Add comprehensive documentation for Android CMS integration and sync system"

#### Part 3 Completion Verification

- [ ] **Verification Step:** Run `flutter test test/unit/services/sync_service_test.dart` and integration test command
- [ ] **Success Criteria:** All Android app tests pass, integration tests verify complete workflow, documentation is complete

---

## Self-Review

**1. Spec coverage:**
- ✅ Multi-tenancy CMS connection: Part 1 implements CMS authentication
- ✅ Username/email/phone login: Part 1 implements across Android app
- ✅ User-specific daily snapshot system: Part 2 implements local storage for user-scoped snapshots
- ✅ Efficient hybrid sync (pull + push): Part 3 implements pull (5-min polling) + push (WebSocket) sync
- ✅ Minimal data usage: Part 3 implements delta-only transfers, gzip compression, efficient caching
- ✅ Minimal VPS resource usage: Part 3 implements connection pooling, efficient queries, optimized sync
- ✅ Offline-first with user data always available: Parts 2-3 implement user data isolation and offline access
- ✅ Online requirement detection: Part 4 implements network monitoring and popup prompts
- ✅ Android app integration: Parts 1-4 implement complete efficient user-scoped CMS integration
- ✅ Testing and documentation: Part 4 implements integration tests and documentation

**2. Placeholder scan:**
- No placeholders found - all tasks include specific implementation details, file paths, and verification criteria

**3. Type consistency:**
- All API responses follow CMS ResponseHandler format consistently
- Database schema follows existing CMS conventions (snake_case, church_id FK)
- Authentication tokens use existing JWT patterns
- Sync data structures are consistent with CMS backend

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-01-27-android-cms-integration.md`. This plan is structured for 4-agent parallel execution with Part-level dependencies. Three execution options:**

**1. Multi-Agent Parallel (recommended for large plans)** - Dispatch 4 agents simultaneously, each takes one Part, coordinated via prerequisite verification

**2. Single-Agent Sequential** - One agent executes Parts 1-4 in order, using executing-plans skill

**3. Subagent-Driven Per-Task** - Dispatch fresh subagent per subsection, review between steps (most granular control)

**Which approach?**

**If Multi-Agent Parallel chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development with multi-agent coordination
- Dispatch 4 agents simultaneously, each assigned to a different Part
- Each agent verifies prerequisites before starting their Part
- Coordinate completion and handle any cross-Part dependencies

**If Single-Agent Sequential chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Execute Parts 1-4 in order with Part-level verification checkpoints
- Single agent maintains context across entire implementation

**If Subagent-Driven Per-Task chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per subsection + two-stage review
- Most granular control but slower overall execution

**Key Architecture Features:**
- **Efficient Hybrid Sync**: Pull (5-min polling) + Push (WebSocket) for optimal performance
- **Minimal Data Usage**: Delta-only transfers, gzip compression, efficient caching
- **Minimal VPS Resources**: Connection pooling, optimized queries, efficient sync algorithms
- **User-Scoped Data**: Only sync user's contacts, groups, messages, templates
- **Offline-First**: User data always available locally, immediate push updates when online
- **Smart Routing**: Department head updates trigger immediate member push notifications
- **Online Detection**: Popup prompts for online-required features
- **User Isolation**: Complete data separation between users