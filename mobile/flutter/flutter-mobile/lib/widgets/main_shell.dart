import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/auth_service.dart';

/// Bottom-navigation shell wrapping the main app sections.
/// Uses StatefulShellRoute so each tab keeps its own navigation stack/state.
/// Tabs whose module is off in tenant_feature_flags (enable_* on the
/// login/profile user payload) are hidden; a hidden current branch
/// redirects to Home.
class MainShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const MainShell({super.key, required this.navigationShell});

  // branch index → flag gating it (null = always visible)
  static const _destinations = [
    (Icons.dashboard_outlined, Icons.dashboard, 'Home', null),
    (Icons.event_outlined, Icons.event, 'Events', 'enable_events'),
    (Icons.groups_outlined, Icons.groups, 'Depts', 'enable_departments'),
    (Icons.payments_outlined, Icons.payments, 'Payments', 'enable_payments'),
    (Icons.person_outline, Icons.person, 'Profile', null),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final features =
        (ref.watch(authProvider).user?['features'] as Map?)?.cast<String, dynamic>() ??
            {};
    bool flagOn(String? flag) => flag == null || features[flag] != false;

    final visible = <int>[
      for (var i = 0; i < _destinations.length; i++)
        if (flagOn(_destinations[i].$4)) i,
    ];

    var selected = visible.indexOf(navigationShell.currentIndex);
    if (selected < 0) {
      // Current branch's module was disabled — send the shell to Home.
      selected = 0;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        navigationShell.goBranch(0, initialLocation: true);
      });
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (index) => navigationShell.goBranch(
          visible[index],
          initialLocation: visible[index] == navigationShell.currentIndex,
        ),
        destinations: [
          for (final i in visible)
            NavigationDestination(
              icon: Icon(_destinations[i].$1),
              selectedIcon: Icon(_destinations[i].$2),
              label: _destinations[i].$3,
            ),
        ],
      ),
    );
  }
}
