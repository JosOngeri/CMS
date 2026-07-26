import 'package:flutter/foundation.dart';

class AppConfig {
  // Development URLs
  static const String _localDevApiUrl = 'http://localhost:5005/api';
  static const String _emulatorApiUrl = 'http://10.0.2.2:5005/api';
  static const String _physicalDeviceApiUrl = 'http://192.168.1.100:5005/api'; // Update with your local IP

  // Production (CMS) - configurable via environment variable
  // Set API_URL environment variable to override this default
  static String get _prodApiUrl => 
      const String.fromEnvironment('API_URL', defaultValue: 'https://cms.josongeri.co.ke/api');
  
  // Current API URL based on environment and platform
  static String get apiUrl {
    if (isProduction) {
      return _prodApiUrl;
    }
    
    // Development environment - detect platform
    if (kIsWeb) {
      return _localDevApiUrl;
    }
    
    // For Android, detect if running on emulator or physical device
    // This is a simplified detection - you may need to adjust based on your setup
    // For physical device testing, use production URL
    return _prodApiUrl; // Use production URL for physical device testing
  }
  
  // Method to override API URL for testing
  static String? _customApiUrl;
  
  static void setCustomApiUrl(String url) {
    _customApiUrl = url;
  }
  
  static void clearCustomApiUrl() {
    _customApiUrl = null;
  }
  
  static String get effectiveApiUrl {
    return _customApiUrl ?? apiUrl;
  }
  
  // App Info
  static const String appName = 'Msabato';
  static const String appVersion = '1.0.0';
  
  // Environment detection
  static bool get isDevelopment {
    return !const bool.fromEnvironment('dart.vm.product');
  }
  
  static bool get isProduction {
    return const bool.fromEnvironment('dart.vm.product');
  }
  
  // API Configuration
  static const Duration apiTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;
  
  // Feature flags
  static const bool enableLogging = true;
  static const bool enableCrashReporting = false; // Enable in production
  
  // Debug helper to show current API URL
  static String get debugApiUrl {
    return effectiveApiUrl;
  }
}
