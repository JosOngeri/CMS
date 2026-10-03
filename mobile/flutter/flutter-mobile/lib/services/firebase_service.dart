import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../app/router.dart' show rootNavigatorKey;

class FirebaseService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  static const String _notificationPermissionKey = 'notification_permission_requested';
  
  // Initialize Firebase Messaging
  Future<void> initialize() async {
    try {
      // Request notification permission (for iOS 13+ and Android 13+)
      await _requestNotificationPermission();
      
      // Get initial message if app was opened from notification
      final RemoteMessage? initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleMessage(initialMessage);
      }
      
      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
      
      // Handle background messages (when app is in background but not terminated)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
      
      // Handle background messages (when app is terminated)
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      
      // Get FCM token — never log it in full (it's a push credential; L652)
      final token = await _messaging.getToken();
      if (kDebugMode && token != null) {
        debugPrint('FCM token issued: …${token.substring(token.length - 6)}');
      }
      
      // Subscribe to topics
      await _subscribeToTopics();
      
    } catch (e) {
      debugPrint('Firebase initialization error: $e');
    }
  }
  
  // Request notification permission
  Future<bool> _requestNotificationPermission() async {
    try {
      // Check if we've already requested permission
      final prefs = await SharedPreferences.getInstance();
      final hasRequested = prefs.getBool(_notificationPermissionKey) ?? false;
      
      if (hasRequested) {
        // Check current permission status
        final status = await Permission.notification.status;
        return status.isGranted;
      }
      
      // Request permission
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      
      // Mark that we've requested permission
      await prefs.setBool(_notificationPermissionKey, true);
      
      if (kDebugMode) {
        debugPrint('Notification permission: ${settings.authorizationStatus}');
      }
      
      return settings.authorizationStatus == AuthorizationStatus.authorized;
    } catch (e) {
      debugPrint('Error requesting notification permission: $e');
      return false;
    }
  }
  
  // Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    if (kDebugMode) {
      debugPrint('Foreground message: ${message.notification?.title}');
    }
    
    _showLocalNotification(message);
  }
  
  // Handle message when app is opened from notification
  void _handleMessageOpenedApp(RemoteMessage message) {
    if (kDebugMode) {
      debugPrint('Message opened app: ${message.notification?.title}');
    }
    
    _handleMessage(message);
  }
  
  // Handle message navigation and actions — deep-links into GoRouter via the
  // app-level rootNavigatorKey (no BuildContext available here; L652).
  void _handleMessage(RemoteMessage message) {
    final data = message.data;
    final messageType = data['type'] ?? 'general';

    final context = rootNavigatorKey.currentContext;
    if (context == null) return; // app not fully up yet

    switch (messageType) {
      case 'announcement':
        context.go('/announcements');
        break;
      case 'payment':
        context.go('/payments');
        break;
      case 'event':
        context.go('/events');
        break;
      default:
        context.go('/dashboard');
        break;
    }
  }
  
  // Show local notification
  Future<void> _showLocalNotification(RemoteMessage message) async {
    try {
      const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
        'sda_church_channel',
        'SDA Church Notifications',
        channelDescription: 'Notifications from SDA Church Kiserian',
        importance: Importance.max,
        priority: Priority.high,
        showWhen: false,
      );
      
      const NotificationDetails platformChannelSpecifics = NotificationDetails(
        android: androidPlatformChannelSpecifics,
      );
      
      await _localNotifications.show(
        message.hashCode,
        message.notification?.title,
        message.notification?.body,
        platformChannelSpecifics,
        payload: message.data.toString(),
      );
    } catch (e) {
      debugPrint('Error showing local notification: $e');
    }
  }
  
  // Subscribe to topics scoped to the signed-in user's church (L652).
  // Global topics would push every tenant's messages to every device.
  Future<void> _subscribeToTopics() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userData = prefs.getString('user_data');
      final churchId = userData != null
          ? (jsonDecode(userData) as Map<String, dynamic>)['church_id']?.toString()
          : null;

      if (churchId == null || churchId.isEmpty) {
        if (kDebugMode) debugPrint('No church_id yet — skipping topic subscriptions');
        return;
      }

      for (final topic in [
        'church_${churchId}_announcements',
        'church_${churchId}_payments',
        'church_${churchId}_events',
      ]) {
        await _messaging.subscribeToTopic(topic);
      }

      if (kDebugMode) debugPrint('Subscribed to church-scoped topics');
    } catch (e) {
      debugPrint('Error subscribing to topics: $e');
    }
  }

  /// Re-call after login so topic subscriptions pick up the user's church.
  Future<void> refreshTopicSubscriptions() => _subscribeToTopics();
  
  // Get FCM token
  Future<String?> getToken() async {
    try {
      return await _messaging.getToken();
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
      return null;
    }
  }
  
  // Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    try {
      final settings = await _messaging.getNotificationSettings();
      return settings.authorizationStatus == AuthorizationStatus.authorized;
    } catch (e) {
      debugPrint('Error checking notification status: $e');
      return false;
    }
  }
}

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background message
  // This is called when the app is in the background or terminated
  if (kDebugMode) {
    debugPrint('Background message: ${message.notification?.title}');
  }
}

// Global Firebase service instance
final firebaseService = FirebaseService();