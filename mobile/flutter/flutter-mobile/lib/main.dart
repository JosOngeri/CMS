import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as provider;
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (non-blocking; app works without Firebase config)
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase init skipped: $e');
  }

  // Initialize services
  await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      child: provider.ChangeNotifierProvider(
        create: (_) => AuthService(),
        child: const SDAChurchApp(),
      ),
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
      title: 'SDA Church Kiserian',
      debugShowCheckedModeBanner: false,
      
      // Theme
      theme: theme,
      darkTheme: darkTheme,
      themeMode: ThemeMode.system,
      
      // Router
      routerConfig: router,
      
      // Builder for consistent styling
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.noScaling, // Prevent text scaling issues
          ),
          child: child!,
        );
      },
    );
  }
}
