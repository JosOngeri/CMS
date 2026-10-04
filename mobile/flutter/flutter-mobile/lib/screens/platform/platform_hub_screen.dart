import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class PlatformHubScreen extends StatelessWidget {
  const PlatformHubScreen({super.key});

  static const areas = [
    (label: 'Staff & Access', icon: Icons.admin_panel_settings_outlined, path: '/platform/hub/staff'),
    (label: 'System Health', icon: Icons.monitor_heart_outlined, path: '/platform/hub/health'),
    (label: 'Security', icon: Icons.security_outlined, path: '/platform/hub/security'),
    (label: 'Data & Backups', icon: Icons.storage_outlined, path: '/platform/hub/data'),
    (label: 'Billing', icon: Icons.receipt_long_outlined, path: '/platform/hub/billing'),
    (label: 'Analytics', icon: Icons.insights_outlined, path: '/platform/analytics'),
    (label: 'Communication', icon: Icons.campaign_outlined, path: '/platform/hub/communication'),
    (label: 'Support', icon: Icons.support_agent_outlined, path: '/platform/hub/support'),
    (label: 'Audit Log', icon: Icons.policy_outlined, path: '/platform/audit'),
    (label: 'Configuration', icon: Icons.tune_outlined, path: '/platform/hub/config'),
    (label: 'Operations', icon: Icons.settings_suggest_outlined, path: '/platform/ops'),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.25,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: areas.length,
      itemBuilder: (context, index) {
        final area = areas[index];
        return Card(
          margin: EdgeInsets.zero,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => context.go(area.path),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(area.icon, color: Theme.of(context).colorScheme.primary, size: 30),
                  const SizedBox(height: 12),
                  Text(area.label, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Open dashboard', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
