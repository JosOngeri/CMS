import { offlineQueueDB } from './localDatabase';
import networkService from './networkService';
import syncService from './syncService';

class OfflineQueueService {
  constructor() {
    this.queue = [];
  }

  // Initialize the queue service
  async init() {
    // Load existing queue from database
    this.queue = await offlineQueueDB.getAll();
    console.log(`Loaded ${this.queue.length} items from offline queue`);
  }

  // Add an action to the queue
  async queueAction(action, endpoint, data) {
    const queueItem = {
      action,
      endpoint,
      data: JSON.stringify(data),
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null
    };

    try {
      await offlineQueueDB.insert(queueItem);
      this.queue.push(queueItem);
      console.log(`Queued ${action} request to ${endpoint}`);
      return true;
    } catch (error) {
      console.error('Error queuing action:', error);
      return false;
    }
  }

  // Queue a POST request
  async queuePost(endpoint, data) {
    return this.queueAction('POST', endpoint, data);
  }

  // Queue a PUT request
  async queuePut(endpoint, data) {
    return this.queueAction('PUT', endpoint, data);
  }

  // Queue a DELETE request
  async queueDelete(endpoint) {
    return this.queueAction('DELETE', endpoint, {});
  }

  // Get all queued items
  async getQueue() {
    this.queue = await offlineQueueDB.getAll();
    return this.queue;
  }

  // Get queue count
  async getQueueCount() {
    this.queue = await offlineQueueDB.getAll();
    return this.queue.length;
  }

  // Clear the queue
  async clearQueue() {
    try {
      await offlineQueueDB.clearAll();
      this.queue = [];
      console.log('Offline queue cleared');
      return true;
    } catch (error) {
      console.error('Error clearing queue:', error);
      return false;
    }
  }

  // Execute an action (tries online first, queues if offline)
  async executeAction(action, endpoint, data, apiFunction) {
    // If online, try to execute immediately
    if (networkService.isOnline()) {
      try {
        const result = await apiFunction(endpoint, data);
        return result;
      } catch (error) {
        console.error('Error executing action online:', error);
        // If it fails, queue it for later
        console.log('Queueing action for later sync');
        await this.queueAction(action, endpoint, data);
        return { queued: true, message: 'Action queued for sync' };
      }
    } else {
      // If offline, queue the action
      console.log('Offline, queuing action');
      await this.queueAction(action, endpoint, data);
      return { queued: true, message: 'Action queued for sync' };
    }
  }

  // Execute a POST request
  async executePost(endpoint, data, apiFunction) {
    return this.executeAction('POST', endpoint, data, apiFunction);
  }

  // Execute a PUT request
  async executePut(endpoint, data, apiFunction) {
    return this.executeAction('PUT', endpoint, data, apiFunction);
  }

  // Execute a DELETE request
  async executeDelete(endpoint, apiFunction) {
    return this.executeAction('DELETE', endpoint, {}, apiFunction);
  }

  // Get queue status
  getQueueStatus() {
    return {
      count: this.queue.length,
      isOnline: networkService.isOnline(),
      isSyncing: syncService.isSyncing
    };
  }
}

// Export singleton instance
const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
