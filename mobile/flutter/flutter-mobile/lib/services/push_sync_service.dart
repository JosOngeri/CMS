import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'api_service.dart';
import 'sync_storage_service.dart';
import '../models/sync_models.dart';

class PushSyncService {
  static final PushSyncService _instance = PushSyncService._internal();
  WebSocketChannel? _channel;
  bool _isConnected = false;
  bool _isOnline = true;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const List<Duration> _reconnectDelays = [
    Duration(seconds: 1),
    Duration(seconds: 2),
    Duration(seconds: 5),
    Duration(seconds: 10),
    Duration(seconds: 30),
  ];
  StreamSubscription? _connectivitySubscription;
  StreamSubscription? _webSocketSubscription;

  factory PushSyncService() {
    return _instance;
  }

  PushSyncService._internal() {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((result) {
      _isOnline = result != ConnectivityResult.none;
      if (_isOnline && !_isConnected) {
        debugPrint('=== PushSync: Connection restored, attempting WebSocket reconnect ===');
        _connectWebSocket();
      } else if (!_isOnline) {
        debugPrint('=== PushSync: Connection lost, closing WebSocket ===');
        _disconnectWebSocket();
      }
    });
  }

  Future<void> connect() async {
    if (_isConnected) {
      debugPrint('=== PushSync: Already connected ===');
      return;
    }

    if (!_isOnline) {
      debugPrint('=== PushSync: Offline, cannot connect ===');
      return;
    }

    await _connectWebSocket();
  }

  Future<void> _connectWebSocket() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userId = await _getCurrentUserId();

      if (token == null || userId == null) {
        debugPrint('=== PushSync: No token or user ID found ===');
        return;
      }

      final apiService = await ApiService.getInstance();
      final wsUrl = apiService.dio.options.baseUrl
          .replaceFirst('http', 'ws')
          .replaceFirst('https', 'wss');
      
      final fullWsUrl = '$wsUrl/api/sms/sync/push?token=$token&user_id=$userId';
      
      debugPrint('=== PushSync: Connecting to WebSocket ===');
      _channel = WebSocketChannel.connect(Uri.parse(fullWsUrl));

      _webSocketSubscription = _channel!.stream.listen(
        _handleWebSocketMessage,
        onError: _handleWebSocketError,
        onDone: _handleWebSocketDone,
      );

      _isConnected = true;
      _reconnectAttempts = 0;
      debugPrint('=== PushSync: WebSocket connected successfully ===');
    } catch (e) {
      debugPrint('=== PushSync: WebSocket connection error: $e ===');
      _handleReconnect();
    }
  }

  void _handleWebSocketMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String);
      debugPrint('=== PushSync: Received WebSocket message ===');
      debugPrint('=== PushSync: Message data: $data ===');

      if (data['type'] == 'update') {
        _handlePushUpdate(data);
      } else if (data['type'] == 'department_update') {
        _handleDepartmentUpdate(data);
      } else if (data['type'] == 'ping') {
        // Respond to keep-alive ping
        _channel?.sink.add(jsonEncode({'type': 'pong'}));
      }
    } catch (e) {
      debugPrint('=== PushSync: Error handling WebSocket message: $e ===');
    }
  }

  Future<void> _handlePushUpdate(Map<String, dynamic> data) async {
    try {
      final userId = await _getCurrentUserId();
      if (userId == null) return;

      final syncStorage = SyncStorageService();
      
      // Store the rolling update
      final update = RollingUpdate(
        userId: userId,
        sequenceNumber: data['sequence_number'],
        tableName: data['table_name'],
        operation: data['operation'],
        data: data['data'],
        timestamp: DateTime.parse(data['timestamp']),
      );

      await syncStorage.storeRollingUpdate(userId, update);
      debugPrint('=== PushSync: Push update applied successfully ===');
    } catch (e) {
      debugPrint('=== PushSync: Error handling push update: $e ===');
    }
  }

  Future<void> _handleDepartmentUpdate(Map<String, dynamic> data) async {
    try {
      debugPrint('=== PushSync: Department update received ===');
      debugPrint('=== PushSync: Department: ${data['department']} ===');
      debugPrint('=== PushSync: Update type: ${data['update_type']} ===');
      
      // Handle department head updates that affect members
      // This could trigger a full sync or specific delta updates
      final userId = await _getCurrentUserId();
      if (userId != null) {
        // Apply department-specific updates to user data
        final syncStorage = SyncStorageService();
        // Implementation depends on specific department update structure
        debugPrint('=== PushSync: Department update processed for user $userId ===');
      }
    } catch (e) {
      debugPrint('=== PushSync: Error handling department update: $e ===');
    }
  }

  void _handleWebSocketError(error) {
    debugPrint('=== PushSync: WebSocket error: $error ===');
    _isConnected = false;
    _handleReconnect();
  }

  void _handleWebSocketDone() {
    debugPrint('=== PushSync: WebSocket connection closed ===');
    _isConnected = false;
    _handleReconnect();
  }

  void _handleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('=== PushSync: Max reconnect attempts reached ===');
      return;
    }

    _reconnectAttempts++;
    final delay = _reconnectDelays[_reconnectAttempts - 1];
    
    debugPrint('=== PushSync: Reconnect attempt $_reconnectAttempts in ${delay.inSeconds}s ===');
    
    Future.delayed(delay, () {
      if (_isOnline && !_isConnected) {
        _connectWebSocket();
      }
    });
  }

  void _disconnectWebSocket() {
    debugPrint('=== PushSync: Disconnecting WebSocket ===');
    _webSocketSubscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
  }

  void disconnect() {
    _disconnectWebSocket();
    _connectivitySubscription?.cancel();
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

  bool get isConnected => _isConnected;
  bool get isOnline => _isOnline;

  Future<Map<String, dynamic>> getConnectionStatus() async {
    return {
      'is_connected': _isConnected,
      'is_online': _isOnline,
      'reconnect_attempts': _reconnectAttempts,
    };
  }

  void dispose() {
    disconnect();
  }
}