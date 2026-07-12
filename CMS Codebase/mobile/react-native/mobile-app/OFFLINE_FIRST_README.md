# Offline-First Android App Implementation

This document explains the offline-first architecture implemented for the KMainCMS mobile app.

## Overview

The app now works offline-first, meaning:
- Data is stored locally on the device using SQLite
- The app tries to fetch data from local storage first
- If online, it syncs with the remote server
- Actions performed while offline are queued and synced when connection is restored

## Architecture

### 1. Local Database (`src/services/localDatabase.js`)
- Uses SQLite (expo-sqlite) for local data storage
- Stores: announcements, events, members, payments
- Tracks sync status for each item
- Includes offline queue for actions performed while offline

### 2. Network Service (`src/services/networkService.js`)
- Monitors network connectivity using @react-native-community/netinfo
- Notifies subscribers when connection changes
- Provides methods to check online/offline status

### 3. Sync Service (`src/services/syncService.js`)
- Handles synchronization between local and remote data
- Automatically syncs when connection is restored
- Processes offline queue (actions performed while offline)
- Syncs: announcements, events, members, payments

### 4. Offline Queue Service (`src/services/offlineQueueService.js`)
- Queues API actions (POST, PUT, DELETE) when offline
- Retries failed actions when connection is restored
- Tracks retry count and errors

### 5. Updated API Service (`src/services/api.js`)
- Tries local database first
- Falls back to remote API if online
- Caches remote data locally
- Queues write operations if offline

### 6. Offline Indicator (`src/components/OfflineIndicator.js`)
- Shows "Offline" badge when no internet
- Shows "Syncing..." badge during sync
- Shows queued items count

## How It Works

### Reading Data (GET requests)
1. App tries to read from local SQLite database
2. If data exists locally, return it immediately
3. If online, also fetch from remote and update local cache
4. If offline and no local data, return empty/error

### Writing Data (POST/PUT/DELETE requests)
1. If online, try to execute immediately
2. If successful, cache result locally
3. If offline or request fails, queue the action
4. When connection is restored, process the queue
5. Retry failed actions up to 3 times

### Automatic Sync
1. When connection is restored, sync service is triggered
2. Processes offline queue first
3. Syncs each data type (announcements, events, members, payments)
4. Updates local cache with latest remote data
5. Syncs pending local changes to remote

## Installation

The new dependencies have been added to `package.json`:
- `expo-sqlite` - Local database
- `@react-native-community/netinfo` - Network monitoring

Install them:
```bash
cd mobile/react-native/mobile-app
npm install
```

## Usage

### Initialize Services
Services are automatically initialized in `App.js`:
```javascript
useEffect(() => {
  const initializeServices = async () => {
    await initDatabase();
    await networkService.init();
    await syncService.init();
    await offlineQueueService.init();
    
    if (networkService.isOnline()) {
      await syncService.syncAll();
    }
  };
  
  initializeServices();
}, []);
```

### Check Network Status
```javascript
import networkService from './src/services/networkService';

if (networkService.isOnline()) {
  // App is online
} else {
  // App is offline
}
```

### Force Sync
```javascript
import syncService from './src/services/syncService';

await syncService.forceSync();
```

### Get Sync Status
```javascript
const status = syncService.getSyncStatus();
console.log(status.isSyncing); // boolean
console.log(status.lastSyncTime); // ISO string or null
console.log(status.isOnline); // boolean
```

### Subscribe to Sync Status Changes
```javascript
const unsubscribe = syncService.subscribe((status) => {
  console.log('Sync status:', status);
});

// Later
unsubscribe();
```

## Testing

Run the test suite:
```bash
npm test
```

The test file is at: `src/services/__tests__/offlineService.test.js`

## Manual Testing Steps

### Test Offline Mode
1. Open the app
2. Turn off internet connection
3. Navigate to different screens (Announcements, Events, etc.)
4. You should see cached data or empty states
5. An "Offline" badge should appear in the top-right

### Test Sync on Reconnect
1. Turn off internet
2. Make some changes (if write operations are available)
3. Turn on internet
4. Watch for "Syncing..." badge
5. Data should sync automatically

### Test Queue
1. Turn off internet
2. Try to perform a write action (e.g., make a payment)
3. Action should be queued
4. A "X Queued" badge should appear
5. Turn on internet
6. Queued actions should execute automatically

## Data Flow Diagram

```
User Action
    ↓
Check Network Status
    ↓
┌─────────────┬─────────────┐
│   Online    │   Offline   │
└─────────────┴─────────────┘
    ↓             ↓
Try Remote    Queue Action
    ↓             ↓
Cache Local   Wait for Connection
    ↓             ↓
Return Data   On Reconnect:
               Process Queue
               Sync Data
```

## Important Notes

- The app initializes with a loading screen while services set up
- All data is stored locally in SQLite
- Sync happens automatically when connection is restored
- Write operations are queued if offline
- The offline indicator shows current status
- Failed sync actions are retried up to 3 times

## Troubleshooting

### App shows loading screen forever
- Check console for initialization errors
- Ensure SQLite is properly installed
- Check network service initialization

### Data not syncing
- Check network connection
- Manually trigger sync: `await syncService.forceSync()`
- Check sync status: `syncService.getSyncStatus()`

### Queue items not processing
- Check network connection
- Items may have exceeded retry limit (3 attempts)
- Check console for error messages

## Next Steps

To further enhance the offline-first experience:

1. Add conflict resolution for concurrent edits
2. Implement delta sync (only sync changed data)
3. Add background sync using React Native background tasks
4. Implement data compression for large datasets
5. Add user notification for sync status
6. Implement selective sync (sync only important data first)
7. Add data expiration and cleanup
8. Implement offline analytics

## Files Created/Modified

### New Files:
- `src/services/localDatabase.js` - SQLite database service
- `src/services/networkService.js` - Network monitoring
- `src/services/syncService.js` - Data synchronization
- `src/services/offlineQueueService.js` - Offline action queue
- `src/components/OfflineIndicator.js` - UI indicator
- `src/services/__tests__/offlineService.test.js` - Test suite
- `OFFLINE_FIRST_README.md` - This documentation

### Modified Files:
- `package.json` - Added offline-first dependencies
- `src/services/api.js` - Updated to use offline-first approach
- `App.js` - Initialize services and add offline indicator
