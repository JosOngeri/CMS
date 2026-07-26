import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
      
      // Get FCM token
      final token = await _messaging.getToken();
      if (kDebugMode) {
        debugPrint('FCM Token: $token');
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
  
  // Handle message navigation and actions
  void _handleMessage(RemoteMessage message) {
    // Extract data from message
    final data = message.data;
    
    // Navigate based on message type
    final messageType = data['type'] ?? 'general';
    
    switch (messageType) {
      case 'announcement':
        // Navigate to announcements screen
        // TODO: Implement navigation to announcements
        break;
      case 'payment':
        // Navigate to payments screen
        // TODO: Implement navigation to payments
        break;
      case 'event':
        // Navigate to events screen
        // TODO: Implement navigation to events
        break;
      default:
        // Default behavior - show notification or navigate to dashboard
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
  
  // Subscribe to relevant topics
  Future<void> _subscribeToTopics() async {
    try {
      // Subscribe to general announcements
      await _messaging.subscribeToTopic('announcements');
      
      // Subscribe to payment notifications
      await _messaging.subscribeToTopic('payments');
      
      // Subscribe to event notifications
      await _messaging.subscribeToTopic('events');
      
      if (kDebugMode) {
        debugPrint('Subscribed to Firebase topics');
      }
    } catch (e) {
      debugPrint('Error subscribing to topics: $e');
    }
  }
  
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