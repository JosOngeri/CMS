import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_service.dart';
import 'sync_storage_service.dart';
import '../models/sync_models.dart';

class PullSyncService {
  static final PullSyncService _instance = PullSyncService._internal();
  Timer? _pollingTimer;
  bool _isPolling = false;
  bool _isOnline = true;
  int _retryCount = 0;
  static const int _maxRetries = 5;
  static const List<Duration> _retryDelays = [
    Duration(seconds: 1),
    Duration(seconds: 2),
    Duration(seconds: 4),
    Duration(seconds: 8),
    Duration(seconds: 30),
  ];
  static const Duration _pollingInterval = Duration(minutes: 5);

  factory PullSyncService() {
    return _instance;
  }

  PullSyncService._internal() {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((result) {
      _isOnline = result != ConnectivityResult.none;
      if (_isOnline) {
        debugPrint('=== PullSync: Connection restored, resuming polling ===');
        _retryCount = 0;
      } else {
        debugPrint('=== PullSync: Connection lost, pausing polling ===');
      }
    });
  }

  Future<bool> checkForUpdates() async {
    try {
      if (!_isOnline) {
        debugPrint('=== PullSync: Offline, skipping update check ===');
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      final lastSyncTimestamp = prefs.getString('last_sync_timestamp');
      final userId = await _getCurrentUserId();

      if (userId == null) {
        debugPrint('=== PullSync: No user ID found ===');
        return false;
      }

      debugPrint('=== PullSync: Checking for updates since $lastSyncTimestamp ===');

      final apiService = await ApiService.getInstance();
      final response = await apiService.dio.get(
        '/api/sms/sync/updates',
        queryParameters: {
          if (lastSyncTimestamp != null) 'since': lastSyncTimestamp,
          'user_id': userId,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final updates = response.data['data'] as List<dynamic>?;
        
        if (updates != null && updates.isNotEmpty) {
          debugPrint('=== PullSync: Found ${updates.length} updates ===');
          
          // Apply delta updates to local storage
          final syncStorage = SyncStorageService();
          for (var updateData in updates) {
            await syncStorage.storeRollingUpdate(
              userId,
              RollingUpdate(
                userId: userId,
                sequenceNumber: updateData['sequence_number'],
                tableName: updateData['table_name'],
                operation: updateData['operation'],
                data: updateData['data'],
                timestamp: DateTime.parse(updateData['timestamp']),
              ),
            );
          }

          // Update last sync timestamp
          await prefs.setString('last_sync_timestamp', DateTime.now().toIso8601String());
          _retryCount = 0;
          
          debugPrint('=== PullSync: Updates applied successfully ===');
          return true;
        } else {
          debugPrint('=== PullSync: No new updates available ===');
          return false;
        }
      } else {
        debugPrint('=== PullSync: Update check failed: ${response.statusCode} ===');
        return false;
      }
    } catch (e) {
      debugPrint('=== PullSync: Error checking for updates: $e ===');
      return false;
    }
  }

  Future<String?> _getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user_data');
    if (userData != null) {
      final userMap = jsonDecode(userData);
      return userMap['id']?.toString();
    }
    return null;
  }

  void startPolling() {
    if (_isPolling) {
      debugPrint('=== PullSync: Already polling ===');
      return;
    }

    debugPrint('=== PullSync: Starting 5-minute polling ===');
    _isPolling = true;
    _pollingTimer = Timer.periodic(_pollingInterval, (timer) async {
      if (_isOnline) {
        await _performPollWithRetry();
      } else {
        debugPrint('=== PullSync: Offline, skipping poll ===');
      }
    });

    // Perform initial check
    _performPollWithRetry();
  }

  Future<void> _performPollWithRetry() async {
    if (_retryCount >= _maxRetries) {
      debugPrint('=== PullSync: Max retries reached, stopping ===');
      return;
    }

    final success = await checkForUpdates();
    
    if (!success) {
      _retryCount++;
      if (_retryCount < _maxRetries) {
        final delay = _retryDelays[_retryCount - 1];
        debugPrint('=== PullSync: Retry $_retryCount in ${delay.inSeconds}s ===');
        Future.delayed(delay, () => _performPollWithRetry());
      }
    } else {
      _retryCount = 0;
    }
  }

  void stopPolling() {
    debugPrint('=== PullSync: Stopping polling ===');
    _isPolling = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  void pausePolling() {
    debugPrint('=== PullSync: Pausing polling (app in background) ===');
    _isPolling = false;
    _pollingTimer?.cancel();
  }

  void resumePolling() {
    debugPrint('=== PullSync: Resuming polling (app in foreground) ===');
    if (!_isPolling && _isOnline) {
      startPolling();
    }
  }

  Future<bool> performFullSync() async {
    try {
      if (!_isOnline) {
        debugPrint('=== PullSync: Offline, cannot perform full sync ===');
        return false;
      }

      final userId = await _getCurrentUserId();
      if (userId == null) {
        debugPrint('=== PullSync: No user ID found ===');
        return false;
      }

      debugPrint('=== PullSync: Performing full sync for user $userId ===');

      final apiService = await ApiService.getInstance();
      final response = await apiService.dio.get(
        '/api/sms/sync/snapshot',
        queryParameters: {'user_id': userId},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final snapshotData = response.data['data'] as Map<String, dynamic>?;
        
        if (snapshotData != null) {
          // Store compressed snapshot
          final syncStorage = SyncStorageService();
          final success = await syncStorage.storeSnapshot(userId, snapshotData);
          
          if (success) {
            // Update last sync timestamp
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('last_sync_timestamp', DateTime.now().toIso8601String());
            
            debugPrint('=== PullSync: Full sync completed successfully ===');
            return true;
          }
        }
      }

      debugPrint('=== PullSync: Full sync failed ===');
      return false;
    } catch (e) {
      debugPrint('=== PullSync: Error performing full sync: $e ===');
      return false;
    }
  }

  Future<Map<String, dynamic>> getSyncStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSyncTimestamp = prefs.getString('last_sync_timestamp');
    final syncStorage = SyncStorageService();
    final userId = await _getCurrentUserId();

    String? lastSequence;
    if (userId != null) {
      lastSequence = await syncStorage.getLastSyncSequence(userId);
    }

    return {
      'is_polling': _isPolling,
      'is_online': _isOnline,
      'last_sync_timestamp': lastSyncTimestamp,
      'last_sync_sequence': lastSequence,
      'retry_count': _retryCount,
    };
  }

  void dispose() {
    stopPolling();
  }
}