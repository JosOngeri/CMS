import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'services/config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (kDebugMode) {
    debugPrint('=== Msabato CMS App Starting ===');
    debugPrint('API URL: ${AppConfig.debugApiUrl}');
    debugPrint('Is Production: ${AppConfig.isProduction}');
  }

  // Initialize services
  final prefs = await SharedPreferences.getInstance();

  // Load any previously saved server URL so the app can target a different
  // backend. Invalid/non-https overrides are ignored (validated in config).
  final savedApiUrl = prefs.getString('api_url');
  if (savedApiUrl != null && savedApiUrl.isNotEmpty) {
    if (!AppConfig.setCustomApiUrl(savedApiUrl)) {
      await prefs.remove('api_url'); // drop a stale/insecure override
    }
  }

  // L655: Firebase/Socket.IO init stays disabled until the push-notification
  // and SMS-relay features ship — dead init blocks were removed.

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