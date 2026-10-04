import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/theme.dart';
import '../services/platform_auth_service.dart';
import '../services/platform_api_service.dart';

/// Shared scaffold for the platform-admin section: AppBar + NavigationDrawer
/// with every admin section. Wraps a ShellRoute child so each screen keeps
/// its own route for deep-linking.
class PlatformShell extends ConsumerWidget {
  final Widget child;

  const PlatformShell({super.key, required this.child});

  static const _sections = [
    (icon: Icons.dashboard_outlined, label: 'Overview', path: '/platform'),
    (icon: Icons.church_outlined, label: 'Tenants', path: '/platform/tenants'),
    (icon: Icons.payments_outlined, label: 'Payments', path: '/platform/payments'),
    (icon: Icons.report_gmailerrorred_outlined, label: 'Incidents', path: '/platform/incidents'),
    (icon: Icons.insights_outlined, label: 'Analytics', path: '/platform/analytics'),
    (icon: Icons.receipt_long_outlined, label: 'Audit Log', path: '/platform/audit'),
    (icon: Icons.settings_suggest_outlined, label: 'Ops & Maintenance', path: '/platform/ops'),
  ];

  String _titleFor(String path) {
    if (path.startsWith('/platform/tenants/')) return 'Church detail';
    for (final s in _sections) {
      if (s.path == path) return s.label;
    }
    return 'Platform Admin';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(platformUserProvider);
    final currentPath = GoRouterState.of(context).matchedLocation;
    final title = _titleFor(currentPath);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      drawer: NavigationDrawer(
        // Tenant detail highlights the Tenants section; unknown paths show none.
        selectedIndex: currentPath.startsWith('/platform/tenants')
            ? 1
            : (_sections.indexWhere((s) => s.path == currentPath) >= 0
                ? _sections.indexWhere((s) => s.path == currentPath)
                : null),
        onDestinationSelected: (i) {
          Navigator.of(context).pop();
          context.go(_sections[i].path);
        },
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Msabato Platform',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  '${user?['name'] ?? ''} · ${user?['role'] ?? ''}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const Divider(),
          ..._sections.map((s) => NavigationDrawerDestination(
                icon: Icon(s.icon),
                label: Text(s.label),
              )),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: AppTheme.errorColor),
            title: const Text('Sign out', style: TextStyle(color: AppTheme.errorColor)),
            onTap: () async {
              try {
                await ref.read(platformApiProvider).logout();
              } catch (_) {
                // Best-effort server logout — wipe the token either way.
              }
              await ref.read(platformAuthProvider.notifier).logout();
              if (context.mounted) context.go('/platform-login');
            },
          ),
        ],
      ),
      body: SafeArea(child: child),
    );
  }
}
