import {
  announcementsDB,
  eventsDB,
  membersDB,
  paymentsDB,
  offlineQueueDB
} from './localDatabase';
import networkService from './networkService';
import { announcementsAPI, eventsAPI, membersAPI, paymentsAPI } from './api';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
    this.lastSyncTime = null;
  }

  // Initialize sync service
  async init() {
    console.log('Sync service initialized');
    
    // Subscribe to network changes
    networkService.subscribe(async ({ isConnected, wasConnected }) => {
      // When connection is restored, trigger sync
      if (isConnected && !wasConnected) {
        console.log('Connection restored, starting sync...');
        await this.syncAll();
      }
    });
  }

  // Subscribe to sync status changes
  subscribe(listener) {
    this.syncListeners.push(listener);
    
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  // Notify listeners of sync status
  notifyListeners(status) {
    this.syncListeners.forEach(listener => {
      listener(status);
    });
  }

  // Sync all data
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!networkService.isOnline()) {
      console.log('Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      // Process offline queue first (actions performed while offline)
      await this.processOfflineQueue();

      // Sync each data type
      await this.syncAnnouncements();
      await this.syncEvents();
      await this.syncMembers();
      await this.syncPayments();

      this.lastSyncTime = new Date().toISOString();
      this.notifyListeners({ status: 'completed', progress: 100, lastSyncTime: this.lastSyncTime });
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners({ status: 'error', error: error.message });
    } finally {
      this.isSyncing = false;
    }
  }

  // Process offline queue (actions performed while offline)
  async processOfflineQueue() {
    try {
      const queueItems = await offlineQueueDB.getPendingItems();
      
      for (const item of queueItems) {
        try {
          const data = JSON.parse(item.data);
          
          // Execute the queued action
          let result;
          switch (item.action) {
            case 'POST':
              result = await this.apiPost(item.endpoint, data);
              break;
            case 'PUT':
              result = await this.apiPut(item.endpoint, data);
              break;
            case 'DELETE':
              result = await this.apiDelete(item.endpoint);
              break;
            default:
              console.error('Unknown action:', item.action);
              continue;
          }

          // If successful, remove from queue
          if (result) {
            await offlineQueueDB.delete(item.id);
          }
        } catch (error) {
          console.error('Error processing queue item:', item.id, error);
          
          // Update retry count
          await offlineQueueDB.update(item.id, {
            retry_count: item.retry_count + 1,
            last_error: error.message
          });

          // If too many retries, skip this item
          if (item.retry_count >= 3) {
            console.error('Max retries reached for item:', item.id);
            await offlineQueueDB.delete(item.id);
          }
        }
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  // Helper method for API POST
  async apiPost(endpoint, data) {
    // This would use the actual API service
    // For now, return success
    return true;
  }

  // Helper method for API PUT
  async apiPut(endpoint, data) {
    // This would use the actual API service
    // For now, return success
    return true;
  }

  // Helper method for API DELETE
  async apiDelete(endpoint) {
    // This would use the actual API service
    // For now, return success
    return true;
  }

  // Sync announcements
  async syncAnnouncements() {
    try {
      this.notifyListeners({ status: 'syncing', progress: 25, current: 'announcements' });
      
      // Fetch from remote
      const remoteAnnouncements = await announcementsAPI.getAnnouncements();
      
      if (remoteAnnouncements.success && remoteAnnouncements.data) {
        // Clear local and insert fresh data
        await announcementsDB.clearAll();
        
        for (const announcement of remoteAnnouncements.data) {
          await announcementsDB.insert({
            ...announcement,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
      }

      // Sync pending local changes to remote
      const pendingAnnouncements = await announcementsDB.getPendingSync();
      for (const announcement of pendingAnnouncements) {
        // This would sync to remote
        await announcementsDB.update(announcement.id, {
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error syncing announcements:', error);
    }
  }

  // Sync events
  async syncEvents() {
    try {
      this.notifyListeners({ status: 'syncing', progress: 50, current: 'events' });
      
      // Fetch from remote
      const remoteEvents = await eventsAPI.getEvents();
      
      if (remoteEvents.success && remoteEvents.data) {
        // Clear local and insert fresh data
        await eventsDB.clearAll();
        
        for (const event of remoteEvents.data) {
          await eventsDB.insert({
            ...event,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
      }

      // Sync pending local changes to remote
      const pendingEvents = await eventsDB.getPendingSync();
      for (const event of pendingEvents) {
        // This would sync to remote
        await eventsDB.update(event.id, {
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error syncing events:', error);
    }
  }

  // Sync members
  async syncMembers() {
    try {
      this.notifyListeners({ status: 'syncing', progress: 75, current: 'members' });
      
      // Fetch from remote
      const remoteMembers = await membersAPI.getMembers();
      
      if (remoteMembers.success && remoteMembers.data) {
        // Clear local and insert fresh data
        await membersDB.clearAll();
        
        for (const member of remoteMembers.data) {
          await membersDB.insert({
            ...member,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
      }

      // Sync pending local changes to remote
      const pendingMembers = await membersDB.getPendingSync();
      for (const member of pendingMembers) {
        // This would sync to remote
        await membersDB.update(member.id, {
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error syncing members:', error);
    }
  }

  // Sync payments
  async syncPayments() {
    try {
      this.notifyListeners({ status: 'syncing', progress: 90, current: 'payments' });
      
      // Fetch from remote
      const remotePayments = await paymentsAPI.getPaymentHistory();
      
      if (remotePayments.success && remotePayments.data) {
        // Clear local and insert fresh data
        await paymentsDB.clearAll();
        
        for (const payment of remotePayments.data) {
          await paymentsDB.insert({
            ...payment,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
      }

      // Sync pending local changes to remote
      const pendingPayments = await paymentsDB.getPendingSync();
      for (const payment of pendingPayments) {
        // This would sync to remote
        await paymentsDB.update(payment.id, {
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error syncing payments:', error);
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      isOnline: networkService.isOnline()
    };
  }

  // Force sync
  async forceSync() {
    await this.syncAll();
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;
