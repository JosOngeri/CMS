import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/login_screen.dart';
import '../screens/payments_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/announcements_screen.dart';
import '../screens/events_screen.dart';
import '../screens/departments_screen.dart';
import '../screens/department_detail_screen.dart';
import '../screens/documents_screen.dart';
import '../screens/members_screen.dart';
import '../screens/approvals_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/forgot_password_screen.dart';
import '../screens/server_url_screen.dart';
import '../screens/my_obligations_screen.dart';
import '../screens/handovers_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/collect_payments_screen.dart';
import '../screens/gallery_screen.dart';
import '../widgets/main_shell.dart';
import '../widgets/platform_shell.dart';
import '../screens/platform/platform_login_screen.dart';
import '../screens/platform/platform_dashboard_screen.dart';
import '../screens/platform/platform_tenants_screen.dart';
import '../screens/platform/platform_tenant_detail_screen.dart';
import '../screens/platform/platform_payments_screen.dart';
import '../screens/platform/platform_incidents_screen.dart';
import '../screens/platform/platform_analytics_screen.dart';
import '../screens/platform/platform_audit_screen.dart';
import '../screens/platform/platform_ops_screen.dart';
import '../services/auth_service.dart';
import '../services/platform_auth_service.dart';

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

/// Root navigator key — lets background services (e.g. SMS payment
/// notifications) deep-link into the app without a BuildContext.
final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Bridges authProvider → Listenable so GoRouter re-runs redirect on every
/// auth-state change. Without this, a user landing on /loading while auth
/// restores stays on the spinner forever — nothing re-evaluates the guard.
class _AuthRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

final _authRefreshProvider = Provider<ChangeNotifier>((ref) {
  final notifier = _AuthRefresh();
  ref
    ..listen(authProvider, (_, __) => notifier.ping())
    ..listen(platformAuthProvider, (_, __) => notifier.ping())
    ..onDispose(notifier.dispose);
  return notifier;
});

// Router provider with auth guards
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/login',
    refreshListenable: ref.watch(_authRefreshProvider),
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final platformAuth = ref.read(platformAuthProvider);
      final isLoading = authState.isLoading || platformAuth.isLoading;
      final isAuthenticated = authState.isAuthenticated;
      final isPlatformAuthed = platformAuth.isAuthenticated;

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

      // Auth has settled — /loading is a dead-end route without this egress.
      if (state.matchedLocation == '/loading') {
        return isAuthenticated ? '/dashboard' : '/login';
      }

      // Protected routes - redirect to login if not authenticated.
      // Prefix match covers parameterized paths like /departments/:id.
      const protectedPrefixes = ['/dashboard', '/payments', '/events', '/announcements', '/profile', '/departments', '/documents', '/members', '/approvals', '/obligations', '/handovers', '/notifications', '/collect-payments', '/gallery'];
      final isProtected = protectedPrefixes.any((p) =>
          state.matchedLocation == p ||
          state.matchedLocation.startsWith('$p/'));
      if (isProtected && !isAuthenticated) {
        debugPrint('=== Router: Redirecting to /login (protected route) ===');
        return '/login';
      }

      // Platform-admin realm — separate auth, separate login screen.
      final isPlatformPath = state.matchedLocation.startsWith('/platform');
      if (isPlatformPath && !isPlatformAuthed) {
        return '/platform-login';
      }
      if (state.matchedLocation == '/platform-login' && isPlatformAuthed) {
        return '/platform';
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
      GoRoute(
        path: '/platform-login',
        builder: (context, state) => const PlatformLoginScreen(),
      ),
      // Platform-admin section — shell provides the drawer/nav chrome.
      ShellRoute(
        builder: (context, state, child) => PlatformShell(child: child),
        routes: [
          GoRoute(
            path: '/platform',
            builder: (context, state) => const PlatformDashboardScreen(),
          ),
          GoRoute(
            path: '/platform/tenants',
            builder: (context, state) => const PlatformTenantsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => PlatformTenantDetailScreen(
                  tenantId: state.pathParameters['id']!,
                  seed: state.extra as Map<String, dynamic>?,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/platform/payments',
            builder: (context, state) => const PlatformPaymentsScreen(),
          ),
          GoRoute(
            path: '/platform/incidents',
            builder: (context, state) => const PlatformIncidentsScreen(),
          ),
          GoRoute(
            path: '/platform/analytics',
            builder: (context, state) => const PlatformAnalyticsScreen(),
          ),
          GoRoute(
            path: '/platform/audit',
            builder: (context, state) => const PlatformAuditScreen(),
          ),
          GoRoute(
            path: '/platform/ops',
            builder: (context, state) => const PlatformOpsScreen(),
          ),
        ],
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
                path: '/events',
                builder: (context, state) => const EventsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/departments',
                builder: (context, state) => const DepartmentsScreen(),
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
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/announcements',
        builder: (context, state) => const AnnouncementsScreen(),
      ),
      GoRoute(
        path: '/obligations',
        builder: (context, state) => const MyObligationsScreen(),
      ),
      GoRoute(
        path: '/handovers',
        builder: (context, state) => const HandoversScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/collect-payments',
        builder: (context, state) => const CollectPaymentsScreen(),
      ),
      GoRoute(
        path: '/departments/:id',
        builder: (context, state) => DepartmentDetailScreen(
          department: state.extra as Map<String, dynamic>,
        ),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),
      GoRoute(
        path: '/gallery',
        builder: (context, state) => const GalleryScreen(),
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
              // '/' isn't a route — that go() lands back on this error page.
              onPressed: () => context.go('/dashboard'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});
