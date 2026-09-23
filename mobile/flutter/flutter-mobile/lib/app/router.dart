import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/login_screen.dart';
import '../screens/payments_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/announcements_screen.dart';
import '../screens/events_screen.dart';
import '../screens/departments_screen.dart';
import '../screens/documents_screen.dart';
import '../screens/members_screen.dart';
import '../screens/approvals_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/forgot_password_screen.dart';
import '../screens/server_url_screen.dart';
import '../widgets/main_shell.dart';
import '../services/auth_service.dart';

// Loading screen for auth state restoration
class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

// Router provider with auth guards
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.watch(authProvider);
      final isLoading = authState.isLoading;
      final isAuthenticated = authState.isAuthenticated;

      debugPrint('=== Router: Redirect check - Location: ${state.matchedLocation}, isLoading: $isLoading, isAuthenticated: $isAuthenticated ===');

      // Show loading screen while restoring auth state
      if (isLoading) {
        // Allow loading screen to be shown
        if (state.matchedLocation != '/loading') {
          debugPrint('=== Router: Redirecting to /loading ===');
          return '/loading';
        }
        return null;
      }

      // Protected routes - redirect to login if not authenticated
      final protectedRoutes = ['/dashboard', '/payments', '/events', '/announcements', '/profile', '/departments', '/documents', '/members', '/approvals'];
      if (protectedRoutes.contains(state.matchedLocation) && !isAuthenticated) {
        debugPrint('=== Router: Redirecting to /login (protected route) ===');
        return '/login';
      }

      // Login route - redirect to dashboard if already authenticated
      if (state.matchedLocation == '/login' && isAuthenticated) {
        debugPrint('=== Router: Redirecting to /dashboard (already authenticated) ===');
        return '/dashboard';
      }

      debugPrint('=== Router: No redirect needed ===');
      return null;
    },
    routes: [
      GoRoute(
        path: '/loading',
        builder: (context, state) => const LoadingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/payments',
                builder: (context, state) => const PaymentsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/events',
                builder: (context, state) => const EventsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/announcements',
                builder: (context, state) => const AnnouncementsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/departments',
        builder: (context, state) => const DepartmentsScreen(),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),
      GoRoute(
        path: '/members',
        builder: (context, state) => const MembersScreen(),
      ),
      GoRoute(
        path: '/approvals',
        builder: (context, state) => const ApprovalsScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/server-url',
        builder: (context, state) => const ServerUrlScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Page not found'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});
