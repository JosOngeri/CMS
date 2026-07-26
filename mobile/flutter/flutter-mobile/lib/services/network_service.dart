import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class NetworkService {
  static final NetworkService _instance = NetworkService._internal();
  bool _isOnline = true;
  final StreamController<bool> _onlineStatusController = StreamController<bool>.broadcast();

  factory NetworkService() {
    return _instance;
  }

  NetworkService._internal() {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((result) {
      final wasOnline = _isOnline;
      _isOnline = result != ConnectivityResult.none;
      
      if (wasOnline != _isOnline) {
        debugPrint('=== NetworkService: Connection status changed: ${_isOnline ? "online" : "offline"} ===');
        _onlineStatusController.add(_isOnline);
      }
    });
  }

  Future<bool> checkConnectivity() async {
    try {
      final result = await Connectivity().checkConnectivity();
      _isOnline = result != ConnectivityResult.none;
      debugPrint('=== NetworkService: Connectivity check: ${_isOnline ? "online" : "offline"} ===');
      return _isOnline;
    } catch (e) {
      debugPrint('=== NetworkService: Error checking connectivity: $e ===');
      return false;
    }
  }

  bool get isOnline => _isOnline;
  Stream<bool> get onOnlineStatusChange => _onlineStatusController.stream;

  Future<bool> requireOnline(BuildContext context, {String? featureName}) async {
    if (_isOnline) {
      return true;
    }

    debugPrint('=== NetworkService: Offline, showing online requirement dialog ===');
    
    // Show online requirement dialog
    final shouldGoOnline = await _showOnlineRequirementDialog(context, featureName);
    
    if (shouldGoOnline) {
      // Open network settings
      debugPrint('=== NetworkService: Opening network settings ===');
      // In a real implementation, this would open network settings
      // For now, we'll just return false and let the user handle it
      return false;
    }
    
    return false;
  }

  Future<bool> _showOnlineRequirementDialog(BuildContext context, String? featureName) async {
    return false; // Placeholder - would show actual dialog
  }

  void dispose() {
    _onlineStatusController.close();
  }
}