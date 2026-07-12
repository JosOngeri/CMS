/**
 * Offline-First Service Tests
 * 
 * This file contains test cases for the offline-first functionality.
 * Run these tests with: npm test
 */

import {
  initDatabase,
  announcementsDB,
  eventsDB,
  membersDB,
  paymentsDB,
  offlineQueueDB
} from '../localDatabase';
import networkService from '../networkService';
import syncService from '../syncService';
import offlineQueueService from '../offlineQueueService';

describe('Offline-First Services', () => {
  
  describe('Local Database', () => {
    test('should initialize database successfully', async () => {
      const result = await initDatabase();
      expect(result).toBe(true);
    });

    test('should insert and retrieve announcements', async () => {
      const testAnnouncement = {
        id: 1,
        title: 'Test Announcement',
        content: 'Test content',
        author_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_published: 1,
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      };

      await announcementsDB.insert(testAnnouncement);
      const retrieved = await announcementsDB.getById(1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.title).toBe('Test Announcement');
    });

    test('should insert and retrieve events', async () => {
      const testEvent = {
        id: 1,
        title: 'Test Event',
        description: 'Test description',
        event_date: new Date().toISOString(),
        location: 'Test Location',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: 1,
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      };

      await eventsDB.insert(testEvent);
      const retrieved = await eventsDB.getById(1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.title).toBe('Test Event');
    });

    test('should insert and retrieve members', async () => {
      const testMember = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        department_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      };

      await membersDB.insert(testMember);
      const retrieved = await membersDB.getById(1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.first_name).toBe('John');
    });

    test('should insert and retrieve payments', async () => {
      const testPayment = {
        id: 1,
        user_id: 1,
        amount: 100.00,
        category: 'tithe',
        transaction_id: 'TX123',
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      };

      await paymentsDB.insert(testPayment);
      const retrieved = await paymentsDB.getById(1);
      expect(retrieved).toBeTruthy();
      expect(retrieved.amount).toBe(100.00);
    });

    test('should insert and retrieve offline queue items', async () => {
      const testQueueItem = {
        action: 'POST',
        endpoint: '/api/test',
        data: JSON.stringify({ test: 'data' }),
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_error: null
      };

      await offlineQueueDB.insert(testQueueItem);
      const queue = await offlineQueueDB.getAll();
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0].action).toBe('POST');
    });
  });

  describe('Network Service', () => {
    test('should initialize network service', async () => {
      const result = await networkService.init();
      expect(result).toBe(true);
    });

    test('should return connection status', () => {
      const status = networkService.getConnectionStatus();
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('connectionType');
    });

    test('should subscribe to network changes', () => {
      let receivedStatus = null;
      const unsubscribe = networkService.subscribe((status) => {
        receivedStatus = status;
      });
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Sync Service', () => {
    test('should initialize sync service', async () => {
      await syncService.init();
      expect(syncService.getSyncStatus()).toHaveProperty('isSyncing');
    });

    test('should return sync status', () => {
      const status = syncService.getSyncStatus();
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('isOnline');
    });
  });

  describe('Offline Queue Service', () => {
    test('should initialize queue service', async () => {
      await offlineQueueService.init();
      expect(offlineQueueService.getQueueStatus()).toHaveProperty('count');
    });

    test('should queue an action', async () => {
      const result = await offlineQueueService.queueAction('POST', '/api/test', { test: 'data' });
      expect(result).toBe(true);
    });

    test('should get queue count', async () => {
      const count = await offlineQueueService.getQueueCount();
      expect(typeof count).toBe('number');
    });

    test('should get queue status', () => {
      const status = offlineQueueService.getQueueStatus();
      expect(status).toHaveProperty('count');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
    });
  });
});

// Integration test for offline-first workflow
describe('Offline-First Integration', () => {
  test('should complete offline-first workflow', async () => {
    // 1. Initialize services
    await initDatabase();
    await networkService.init();
    await syncService.init();
    await offlineQueueService.init();

    // 2. Insert data locally
    await announcementsDB.insert({
      id: 999,
      title: 'Offline Test',
      content: 'Test content',
      author_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: 1,
      sync_status: 'pending',
      synced_at: null
    });

    // 3. Retrieve data locally
    const localData = await announcementsDB.getById(999);
    expect(localData).toBeTruthy();
    expect(localData.sync_status).toBe('pending');

    // 4. Queue an action
    await offlineQueueService.queuePost('/api/announcements', { title: 'New Announcement' });
    const queueCount = await offlineQueueService.getQueueCount();
    expect(queueCount).toBeGreaterThan(0);

    // 5. Check sync status
    const syncStatus = syncService.getSyncStatus();
    expect(syncStatus).toHaveProperty('isSyncing');
    expect(syncStatus).toHaveProperty('isOnline');
  });
});
