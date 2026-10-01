import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:permission_handler/permission_handler.dart';

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
      debugPrint('=== NetworkService: Opening app settings ===');
      await openAppSettings();
      return false;
    }

    return false;
  }

  Future<bool> _showOnlineRequirementDialog(BuildContext context, String? featureName) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('No Internet Connection'),
        content: Text(
          featureName != null
              ? '$featureName requires an internet connection. Please connect and try again.'
              : 'This feature requires an internet connection. Please connect and try again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  void dispose() {
    _onlineStatusController.close();
  }
}