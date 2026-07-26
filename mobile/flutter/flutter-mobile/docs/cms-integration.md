# Android CMS Integration Documentation

## Overview

This document describes the integration between the KMainCMS Android app (Msabato) and the CMS multi-tenancy system, including the efficient hybrid sync architecture with minimal data usage and VPS resource consumption.

## Architecture

### Efficient Hybrid Sync Architecture

The Android app uses a hybrid sync approach combining pull and push mechanisms for optimal performance and resource efficiency:

**Pull Mechanism:**
- 5-minute polling interval when online
- Delta-only downloads (only changed data)
- Gzip compression for all data transfers
- Background-aware (pauses when app in background)
- Exponential backoff for network errors (1s, 2s, 4s, 8s, max 30s)

**Push Mechanism:**
- WebSocket connection for real-time updates
- Immediate updates for department head changes
- Minimal data transfer (update IDs only)
- Automatic reconnection with exponential backoff
- Fallback to polling if WebSocket unavailable

### User-Scoped Multi-Tenant Database Architecture

Each user has completely isolated data in the local SQLite database:

**Database Schema:**
- `sync_metadata` - User sync progress and metadata
- `rolling_updates` - User-specific rolling updates with sequence numbers
- `user_contacts` - User's contacts with user_id isolation
- `user_groups` - User's groups with user_id isolation
- `user_messages` - User's messages with user_id isolation
- `user_templates` - User's templates with user_id isolation

**User Isolation:**
- All tables include user_id column for complete data separation
- All queries filter by user_id to prevent cross-user access
- Unique constraints on (user_id, sequence_number) prevent conflicts
- Clear data functions remove only current user's data

### Authentication Flow

**Username/Email/Phone Login:**
1. User enters identifier (username, email, or phone) and password
2. App calls CMS SMS auth endpoint: `/api/sms/auth/login`
3. CMS validates credentials using `UserRepository.findByIdentifier`
4. CMS returns SMS-scoped JWT token and organization metadata
5. App stores token in SharedPreferences
6. App stores organization metadata for API configuration
7. User is redirected to dashboard

**Token Handling:**
- JWT tokens stored with key `auth_token`
- Organization metadata stored with key `organization_metadata`
- Tokens include SMS scope for CMS API access
- User data stored with key `user_data`

## Sync Mechanisms

### Pull Sync (5-Minute Polling)

**Implementation:** `lib/services/pull_sync_service.dart`

**Features:**
- `checkForUpdates()` - Polls CMS endpoint for available updates
- `performFullSync()` - Downloads complete user-specific snapshots
- 5-minute polling interval using Timer.periodic
- Skips polling when offline to save battery
- Delta-only downloads to minimize bandwidth
- Gzip compression for all data transfers
- Exponential backoff for network errors
- Background/foreground-aware polling

**API Endpoints:**
- `/api/sms/sync/updates?since={timestamp}&user_id={id}` - Get delta updates
- `/api/sms/sync/snapshot?user_id={id}` - Get full snapshot

**Resource Optimization:**
- Connection pooling via Dio HTTP client
- Minimal data transfer (delta-only)
- Compression reduces bandwidth usage by ~70%
- Offline skip prevents unnecessary battery drain

### Push Sync (WebSocket)

**Implementation:** `lib/services/push_sync_service.dart`

**Features:**
- WebSocket connection for real-time updates
- Immediate updates for department head changes
- User-specific push routing based on roles and department membership
- Automatic reconnection with exponential backoff
- Minimal data transfer (update IDs only)
- Keep-alive mechanism (ping/pong)
- Fallback to polling if WebSocket unavailable

**WebSocket Connection:**
- URL: `wss://{cms_url}/api/sms/sync/push?token={token}&user_id={id}`
- Handles update, department_update, and ping message types
- Department head updates trigger immediate member notifications

**Resource Optimization:**
- Connection pooling for WebSocket
- Minimal data in push notifications
- Efficient memory usage for connection management
- Automatic cleanup on logout/app close

## Offline-First Architecture

### User Data Always Available

**Local Storage:**
- User-specific data stored in SQLite database
- Complete offline access to user's contacts, groups, messages, templates
- No network dependency for data access
- Sync happens in background when connection available

**Sync Strategy:**
- Initial full snapshot download on first login
- Delta updates applied as they arrive
- Rolling updates tracked with sequence numbers
- Conflict detection and resolution
- Data integrity validation with SHA-256 hashes

### Online Requirement Detection

**Implementation:** `lib/services/network_service.dart`

**Features:**
- Real-time connectivity monitoring using connectivity_plus
- `isOnline` property for current status
- `onOnlineStatusChange` stream for status changes
- `requireOnline()` function for online-required features
- Popup dialog with "Go Online" and "Cancel" options

**Online-Required Features:**
- Sending messages
- Real-time updates
- Department head operations
- Any feature requiring server communication

## Minimal Data Usage Strategies

### Delta-Only Transfers
- Only changed data is transferred, not full datasets
- Rolling updates contain only modified fields
- Initial full snapshot only on first login or major updates

### Compression
- Gzip compression for all data transfers
- Compression reduces bandwidth usage by ~70%
- SHA-256 hash validation for data integrity
- Compressed snapshots stored locally

### Efficient Caching
- Last sync timestamp prevents duplicate downloads
- Sequence number tracking avoids redundant updates
- Local SQLite database acts as cache
- HTTP connection pooling reduces connection overhead

## Minimal VPS Resource Usage Strategies

### Connection Pooling
- Dio HTTP client uses connection pooling
- WebSocket connection reuse
- Minimal connection overhead
- Efficient connection lifecycle management

### Efficient Queries
- User-scoped queries reduce database load
- Indexed queries on user_id and sequence_number
- Batch operations for multiple updates
- Optimized database schema with proper indexes

### Resource Monitoring
- Background/foreground-aware operations
- Offline skip prevents unnecessary server load
- Exponential backoff reduces retry spam
- Connection timeout prevents hanging connections

## API Endpoint Specifications

### Authentication Endpoints

**POST /api/sms/auth/login**
- Request: `{ identifier, password, mfaToken? }`
- Response: `{ success, data: { token, user, church_id, church_slug, sync_endpoint_url, snapshot_interval, rolling_update_interval } }`
- Supports: username, email, or phone as identifier

### Sync Endpoints

**GET /api/sms/sync/updates**
- Query: `?since={timestamp}&user_id={id}`
- Response: `{ success, data: [ { sequence_number, table_name, operation, data, timestamp } ] }`
- Returns: Delta updates since specified timestamp

**GET /api/sms/sync/snapshot**
- Query: `?user_id={id}`
- Response: `{ success, data: { contacts: [], groups: [], messages: [], templates: [] } }`
- Returns: Complete user-specific snapshot

**WebSocket: /api/sms/sync/push**
- Query: `?token={token}&user_id={id}`
- Messages: `{ type: 'update'|'department_update'|'ping', ... }`
- Real-time push notifications for user-specific changes

## Android App Integration Guide

### Configuration

**Environment Variables:**
- `API_URL` - CMS backend URL (e.g., https://cms.josongeri.co.ke/api)
- `ENABLE_LOGGING` - Enable debug logging (development only)

**Dependencies:**
- `dio: ^5.4.0` - HTTP client with connection pooling
- `sqflite: ^2.3.0` - SQLite database
- `shared_preferences: ^2.2.0` - Local storage
- `connectivity_plus: ^5.0.0` - Network monitoring
- `web_socket_channel: ^2.4.0` - WebSocket support
- `crypto: ^3.0.3` - Compression and hashing

### Integration Steps

1. **Authentication Integration:**
   - Update login method to use identifier parameter
   - Call CMS SMS auth endpoint
   - Store SMS-scoped token and organization metadata
   - Update login UI to accept username/email/phone

2. **Sync Storage Setup:**
   - Initialize SyncStorageService singleton
   - Database automatically creates user-scoped tables
   - Use `storeSnapshot` for initial data load
   - Use `getRollingUpdatesSince` for incremental sync

3. **Pull Sync Setup:**
   - Initialize PullSyncService singleton
   - Call `startPolling()` in dashboard or main screen
   - Service automatically polls every 5 minutes
   - Call `pausePolling()` when app goes to background
   - Call `resumePolling()` when app comes to foreground

4. **Push Sync Setup:**
   - Initialize PushSyncService singleton
   - Call `connect()` after successful login
   - Service automatically handles WebSocket lifecycle
   - Call `disconnect()` on logout

5. **Online Detection Setup:**
   - Initialize NetworkService singleton
   - Call `requireOnline()` before online-required features
   - Show OnlineRequirementDialog when offline
   - Handle user response (go online or cancel)

### Code Examples

**Authentication:**
```dart
final apiService = await ApiService.getInstance();
final result = await apiService.login(
  'username_or_email_or_phone', // identifier
  'password',
);
```

**Pull Sync:**
```dart
final pullSyncService = PullSyncService();
pullSyncService.startPolling(); // Start 5-minute polling
await pullSyncService.performFullSync(); // Manual full sync
```

**Push Sync:**
```dart
final pushSyncService = PushSyncService();
await pushSyncService.connect(); // Establish WebSocket
```

**Online Detection:**
```dart
final networkService = NetworkService();
final isOnline = await networkService.requireOnline(context, featureName: 'send message');
if (isOnline) {
  // Proceed with online feature
}
```

## Deployment Procedures

### Build Configuration

**Development:**
```bash
flutter run
```

**Production APK:**
```bash
flutter build apk --release
```

**Production Bundle:**
```bash
flutter build appbundle --release
```

### Environment Setup

**Development:**
- Use development CMS backend
- Enable debug logging
- Use development API URL

**Production:**
- Use production CMS backend
- Disable debug logging
- Use production API URL
- Ensure SSL certificates are valid

### CMS Backend Requirements

**Required Endpoints:**
- `/api/sms/auth/login` - SMS authentication
- `/api/sms/sync/updates` - Delta updates
- `/api/sms/sync/snapshot` - Full snapshot
- `/api/sms/sync/push` - WebSocket push

**Database Schema:**
- User authentication tables
- SMS sync tables (snapshots, rolling updates)
- Multi-tenant church databases
- User role and department membership tables

## Troubleshooting Common Issues

### Authentication Issues

**Problem:** Login fails with "Invalid credentials"
- **Solution:** Verify CMS backend is running, check identifier format, verify user exists in CMS

**Problem:** Token expires frequently
- **Solution:** Check token expiration time, implement token refresh logic

### Sync Issues

**Problem:** Sync not working when online
- **Solution:** Check network connectivity, verify API URL, check token validity

**Problem:** Data not updating
- **Solution:** Check sync service is running, verify WebSocket connection, check user_id in requests

**Problem:** High data usage
- **Solution:** Verify delta transfers are working, check compression is enabled, monitor sync frequency

### Performance Issues

**Problem:** App feels slow
- **Solution:** Check polling frequency, verify database queries are optimized, check for memory leaks

**Problem:** Battery drain
- **Solution:** Verify polling pauses in background, check WebSocket keep-alive frequency, optimize database operations

## Security Considerations

### User Data Isolation

- All database operations include user_id filter
- No cross-user data access possible
- Unique constraints prevent conflicts
- Clear data functions are user-scoped

### Data Security

- JWT tokens stored securely in SharedPreferences
- Sensitive data encrypted in transit (HTTPS/WSS)
- Database connection details never exposed to client
- User credentials never stored locally

### API Security

- All API calls use Bearer token authentication
- Tokens have SMS scope for limited access
- Organization metadata stored separately
- Invalid tokens handled gracefully

## Performance Optimization Tips

### Database Optimization

- Use indexes on user_id and sequence_number columns
- Batch database operations when possible
- Use transactions for multiple related operations
- Clean up old rolling updates periodically

### Network Optimization

- Enable HTTP connection pooling
- Use appropriate timeout values
- Implement proper retry logic
- Monitor and optimize data transfer sizes

### Memory Optimization

- Dispose of controllers and subscriptions properly
- Use lazy loading for large datasets
- Implement proper memory management for WebSocket
- Clean up resources on logout

### Sync Optimization

- Adjust polling interval based on usage patterns
- Use delta transfers exclusively
- Compress all data transfers
- Implement conflict detection early
- Prioritize critical updates

## Monitoring and Logging

### Debug Logging

The app includes comprehensive debug logging for all sync operations:
- Sync service status and operations
- Network connectivity changes
- API request/response details
- Database operation logs
- Error details and stack traces

### Performance Metrics

Monitor these metrics for optimal performance:
- Sync frequency and duration
- Data transfer sizes
- API response times
- Database query times
- Memory usage patterns
- Battery impact

## Support

For issues or questions about the Android CMS integration, contact the development team with:
- App version
- Android version
- Device model
- Error logs
- Steps to reproduce the issue