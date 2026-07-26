import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  String? _churchId;
  final StreamController<Map<String, dynamic>> _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _statusController = StreamController<Map<String, dynamic>>.broadcast();

  // Streams for UI to listen to
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get statusStream => _statusController.stream;

  bool get isConnected => _isConnected;
  String? get churchId => _churchId;

  // Initialize Socket.IO connection
  void initialize({String? serverUrl}) {
    final url = serverUrl ?? _getServerUrl();
    
    try {
      _socket = IO.io(url, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
        'reconnection': true,
        'reconnectionAttempts': 5,
        'reconnectionDelay': 3000,
      });

      _setupEventListeners();
      
      if (kDebugMode) {
        debugPrint('Socket.IO initialized with URL: $url');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to initialize Socket.IO: $e');
      }
    }
  }

  void _setupEventListeners() {
    if (_socket == null) return;

    _socket!.onConnect((_) {
      _isConnected = true;
      _statusController.add({'status': 'connected'});
      
      if (kDebugMode) {
        debugPrint('Socket connected');
      }
      
      // Auto-register relay if churchId is set
      if (_churchId != null) {
        registerRelay(_churchId!);
      }
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      _statusController.add({'status': 'disconnected'});
      
      if (kDebugMode) {
        debugPrint('Socket disconnected');
      }
    });

    _socket!.onError((data) {
      if (kDebugMode) {
        debugPrint('Socket error: $data');
      }
      _statusController.add({'status': 'error', 'error': data.toString()});
    });

    _socket!.on('process_bulk', (data) {
      if (kDebugMode) {
        debugPrint('Received process_bulk event: $data');
      }
      _messageController.add({'event': 'process_bulk', 'data': data});
    });

    _socket!.on('cancel_request', (data) {
      if (kDebugMode) {
        debugPrint('Received cancel_request event: $data');
      }
      _messageController.add({'event': 'cancel_request', 'data': data});
    });

    _socket!.on('sync_contacts', (data) {
      if (kDebugMode) {
        debugPrint('Received sync_contacts event: $data');
      }
      _messageController.add({'event': 'sync_contacts', 'data': data});
    });
  }

  // Connect to Socket.IO server
  void connect() {
    if (_socket != null) {
      _socket!.connect();
      if (kDebugMode) {
        debugPrint('Attempting to connect to Socket.IO server');
      }
    }
  }

  // Disconnect from Socket.IO server
  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _isConnected = false;
      if (kDebugMode) {
        debugPrint('Disconnected from Socket.IO server');
      }
    }
  }

  // Register this device as an SMS relay for the church
  void registerRelay(String churchId) {
    _churchId = churchId;
    
    if (!_isConnected) {
      if (kDebugMode) {
        debugPrint('Cannot register relay: not connected');
      }
      return;
    }

    try {
      final deviceData = {
        'churchId': churchId,
        'deviceId': _getDeviceId(),
        'model': _getDeviceModel(),
        'batteryLevel': _getBatteryLevel(),
        'signalStrength': _getSignalStrength(),
      };

      _socket!.emit('register_relay', deviceData);
      
      if (kDebugMode) {
        debugPrint('Registered relay for church: $churchId');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to register relay: $e');
      }
    }
  }

  // Get device ID (placeholder - would need platform-specific implementation)
  String _getDeviceId() {
    // In a real implementation, you'd use device_info_plus package
    return 'flutter_device_${DateTime.now().millisecondsSinceEpoch}';
  }

  // Get device model (placeholder)
  String _getDeviceModel() {
    // In a real implementation, you'd use device_info_plus package
    return 'Flutter Device';
  }

  // Get battery level (placeholder)
  int _getBatteryLevel() {
    // In a real implementation, you'd use battery_plus package
    return 100;
  }

  // Get signal strength (placeholder)
  int _getSignalStrength() {
    // In a real implementation, you'd use connectivity_plus package
    return 100;
  }

  // Get server URL based on environment
  String _getServerUrl() {
    // Remove /api from the API URL for Socket.IO
    String apiUrl = AppConfig.effectiveApiUrl;
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 4);
    }
    return apiUrl;
  }

  // Cleanup resources
  void dispose() {
    _socket?.off();
    disconnect();
    _messageController.close();
    _statusController.close();
    
    if (kDebugMode) {
      debugPrint('Socket service disposed');
    }
  }
}
