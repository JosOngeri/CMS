import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  constructor() {
    this.isConnected = true;
    this.connectionType = 'unknown';
    this.listeners = [];
  }

  // Initialize network monitoring
  async init() {
    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.isConnected = state.isConnected;
      this.connectionType = state.type;

      // Subscribe to network changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected;
        this.connectionType = state.type;

        // Notify listeners of connection changes
        this.listeners.forEach(listener => {
          listener({
            isConnected: this.isConnected,
            wasConnected,
            connectionType: this.connectionType
          });
        });

        // Log connection changes
        if (wasConnected !== this.isConnected) {
          console.log(
            `Network connection ${this.isConnected ? 'restored' : 'lost'}. ` +
            `Type: ${this.connectionType}`
          );
        }
      });

      console.log('Network service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing network service:', error);
      return false;
    }
  }

  // Get current connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType
    };
  }

  // Check if currently online
  isOnline() {
    return this.isConnected;
  }

  // Check if currently offline
  isOffline() {
    return !this.isConnected;
  }

  // Subscribe to network changes
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Unsubscribe from network changes
  unsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }

  // Force refresh network status
  async refresh() {
    try {
      const state = await NetInfo.fetch();
      this.isConnected = state.isConnected;
      this.connectionType = state.type;
      return this.getConnectionStatus();
    } catch (error) {
      console.error('Error refreshing network status:', error);
      return this.getConnectionStatus();
    }
  }
}

// Export singleton instance
const networkService = new NetworkService();
export default networkService;
