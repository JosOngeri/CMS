import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'services/auth_service.dart';
import 'services/config.dart';
// import 'services/socket_service.dart';
// import 'services/firebase_service.dart';
// import 'services/update_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Debug: Show API URL being used
  debugPrint('=== SDA Church App Starting ===');
  debugPrint('API URL: ${AppConfig.debugApiUrl}');
  debugPrint('Is Production: ${AppConfig.isProduction}');
  debugPrint('Is Development: ${AppConfig.isDevelopment}');

  // Initialize Firebase (non-blocking; app works without Firebase config)
  // try {
  //   await Firebase.initializeApp();
  //   
  //   // Initialize Firebase Messaging
  //   await firebaseService.initialize();
  // } catch (e) {
  //   debugPrint('Firebase init skipped: $e');
  // }

  // Initialize services
  await SharedPreferences.getInstance();
  
  // Initialize Socket.IO service for KMainCMS integration
  // try {
  //   SocketService().initialize();
  //   SocketService().connect();
  //   debugPrint('Socket.IO service initialized');
  // } catch (e) {
  //   debugPrint('Socket.IO service initialization failed: $e');
  // }

  runApp(
    const ProviderScope(
      child: SDAChurchApp(),
    ),
  );
}

class SDAChurchApp extends ConsumerWidget {
  const SDAChurchApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final theme = AppTheme.lightTheme;
    final darkTheme = AppTheme.darkTheme;
    
    return MaterialApp.router(
      title: 'Msabato',
      debugShowCheckedModeBanner: false,
      
      // Theme
      theme: theme,
      darkTheme: darkTheme,
      themeMode: ThemeMode.system,
      
      // Router
      routerConfig: router,
      
      // Builder for consistent styling and accessibility
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            // Enable text scaling for better accessibility
            // textScaler: TextScaler.noScaling, // Removed for accessibility
          ),
          child: child!,
        );
      },
    );
  }
}