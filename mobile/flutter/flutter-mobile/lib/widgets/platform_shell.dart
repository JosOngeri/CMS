import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/platform_api_service.dart';
import '../services/platform_auth_service.dart';

class PlatformShell extends ConsumerWidget {
  final Widget child;

  const PlatformShell({super.key, required this.child});

  static const destinations = [
    (icon: Icons.space_dashboard_outlined, selected: Icons.space_dashboard, label: 'Home', path: '/platform'),
    (icon: Icons.church_outlined, selected: Icons.church, label: 'Tenants', path: '/platform/tenants'),
    (icon: Icons.payments_outlined, selected: Icons.payments, label: 'Money', path: '/platform/payments'),
    (icon: Icons.notifications_active_outlined, selected: Icons.notifications_active, label: 'Alerts', path: '/platform/incidents'),
    (icon: Icons.grid_view_outlined, selected: Icons.grid_view, label: 'Hub', path: '/platform/hub'),
  ];

  int _selectedIndex(String path) {
    if (path == '/platform') return 0;
    if (path.startsWith('/platform/tenants')) return 1;
    if (path.startsWith('/platform/payments')) return 2;
    if (path.startsWith('/platform/incidents')) return 3;
    return 4;
  }

  String _title(String path) {
    if (path == '/platform') return 'Command Center';
    if (path.startsWith('/platform/tenants/')) return 'Church Detail';
    if (path == '/platform/tenants') return 'Tenants';
    if (path == '/platform/payments') return 'Money';
    if (path == '/platform/incidents') return 'Alerts & Incidents';
    if (path == '/platform/hub') return 'Admin Hub';
    if (path == '/platform/analytics') return 'Analytics';
    if (path == '/platform/audit') return 'Security & Audit';
    if (path == '/platform/ops') return 'Operations';
    final segment = path.split('/').last;
    return segment[0].toUpperCase() + segment.substring(1);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final path = GoRouterState.of(context).matchedLocation;
    final rootPaths = destinations.map((item) => item.path).toSet();
    return Scaffold(
      appBar: AppBar(
        leading: rootPaths.contains(path)
            ? const Padding(
                padding: EdgeInsets.all(10),
                child: Icon(Icons.admin_panel_settings),
              )
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.canPop() ? context.pop() : context.go('/platform/hub'),
              ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_title(path)),
            Text('MSABATO ADMIN', style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              try {
                await ref.read(platformApiProvider).logout();
              } catch (_) {}
              await ref.read(platformAuthProvider.notifier).logout();
              if (context.mounted) context.go('/platform-login');
            },
          ),
        ],
      ),
      body: SafeArea(child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex(path),
        onDestinationSelected: (index) => context.go(destinations[index].path),
        destinations: destinations
            .map((item) => NavigationDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.selected),
                  label: item.label,
                ))
            .toList(),
      ),
    );
  }
}
