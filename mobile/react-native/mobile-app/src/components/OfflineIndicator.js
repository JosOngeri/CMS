import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';
import networkService from '../services/networkService';
import syncService from '../services/syncService';
import offlineQueueService from '../services/offlineQueueService';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Initialize network status
    setIsOnline(networkService.isOnline());

    // Subscribe to network changes
    const unsubscribeNetwork = networkService.subscribe(({ isConnected }) => {
      setIsOnline(isConnected);
    });

    // Subscribe to sync status changes
    const unsubscribeSync = syncService.subscribe((status) => {
      setIsSyncing(status.status === 'syncing');
    });

    // Update queue count periodically
    const updateQueueCount = async () => {
      const count = await offlineQueueService.getQueueCount();
      setQueueCount(count);
    };

    updateQueueCount();
    const queueInterval = setInterval(updateQueueCount, 5000);

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
      clearInterval(queueInterval);
    };
  }, []);

  if (isOnline && !isSyncing && queueCount === 0) {
    return null; // Don't show indicator when online, not syncing, and no queued items
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={[styles.badge, styles.offlineBadge]}>
          <Text style={styles.text}>Offline</Text>
        </View>
      )}
      {isSyncing && (
        <View style={[styles.badge, styles.syncingBadge]}>
          <Text style={styles.text}>Syncing...</Text>
        </View>
      )}
      {queueCount > 0 && (
        <View style={[styles.badge, styles.queueBadge]}>
          <Text style={styles.text}>{queueCount} Queued</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 5,
    zIndex: 1000,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  offlineBadge: {
    backgroundColor: '#ef4444',
  },
  syncingBadge: {
    backgroundColor: '#3b82f6',
  },
  queueBadge: {
    backgroundColor: '#f59e0b',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineIndicator;
