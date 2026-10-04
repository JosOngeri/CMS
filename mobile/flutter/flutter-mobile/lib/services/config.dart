import 'package:flutter/foundation.dart';

class AppConfig {
  // Development URL — used by web dev builds only; native dev builds go
  // through the production URL or the runtime override below.
  static const String _localDevApiUrl = 'http://localhost:5005/api';

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

  // L654: validate overrides — release builds only accept https URLs so a
  // saved/hand-edited URL can't silently downgrade traffic to plaintext.
  static bool setCustomApiUrl(String url) {
    final uri = Uri.tryParse(url.trim());
    final valid = uri != null &&
        uri.host.isNotEmpty &&
        (uri.isScheme('https') || kDebugMode);
    if (!valid) return false;
    _customApiUrl = url.trim();
    return true;
  }
  
  static void clearCustomApiUrl() {
    _customApiUrl = null;
  }
  
  static String get effectiveApiUrl {
    return _customApiUrl ?? apiUrl;
  }
  
  // App Info
  static const String appName = 'Msabato';
  static const String appVersion = '1.7.0'; // keep in sync with pubspec version field
  
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
  
  // Feature flags — L654: logging must never ship in release builds.
  static bool get enableLogging => kDebugMode;
  static const bool enableCrashReporting = false; // Enable in production
  
  // Debug helper to show current API URL
  static String get debugApiUrl {
    return effectiveApiUrl;
  }
}