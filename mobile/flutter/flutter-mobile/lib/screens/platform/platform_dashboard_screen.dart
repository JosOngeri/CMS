import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Platform overview — fleet stats, live health, and recent admin actions.
class PlatformDashboardScreen extends ConsumerStatefulWidget {
  const PlatformDashboardScreen({super.key});

  @override
  ConsumerState<PlatformDashboardScreen> createState() => _PlatformDashboardScreenState();
}

class _PlatformDashboardScreenState extends ConsumerState<PlatformDashboardScreen> {
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _health;
  List<dynamic> _activity = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(platformApiProvider);
      final results = await Future.wait([
        api.getStats(),
        api.getHealth(),
        api.getActivity(limit: 12),
      ]);
      setState(() {
        _stats = results[0] as Map<String, dynamic>;
        _health = results[1] as Map<String, dynamic>;
        _activity = results[2] as List<dynamic>;
        _loading = false;
      });
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, style: const TextStyle(color: AppTheme.errorColor)),
            const SizedBox(height: 12),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }

    final stats = _stats!;
    final health = _health!;
    final live = (health['live'] as Map?) ?? {};
    final overall = health['overall']?.toString() ?? 'unknown';
    final healthColor = overall == 'healthy'
        ? AppTheme.successColor
        : overall == 'degraded'
            ? AppTheme.warningColor
            : AppTheme.errorColor;
    final services = health['services'] as List<dynamic>? ?? [];
    final unhealthyServices = services
        .where((service) => service['status'] != 'healthy')
        .map((service) => service['name'].toString())
        .toList();
    final healthBackground = healthColor.withOpacity(0.16);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Health banner
          Card(
            color: healthBackground,
            child: ListTile(
              leading: Icon(Icons.monitor_heart, color: healthColor),
              title: Text('Platform ${overall.toUpperCase()}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: healthColor)),
              subtitle: Text(
                [
                  'DB ${live['dbLatencyMs'] ?? '?'}ms · up ${live['uptimeHours'] ?? '?'}h · ${live['memoryMb'] ?? '?'}MB',
                  if (unhealthyServices.isNotEmpty)
                    'Attention: ${unhealthyServices.join(', ')}',
                ].join('\n'),
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
              ),
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
            ),
          ),
          const SizedBox(height: 8),

          // Fleet stats grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.6,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            children: [
              _statCard('Churches', '${stats['activeChurches']}/${stats['totalChurches']}',
                  Icons.church, AppTheme.primaryColor,
                  subtitle: '${stats['suspendedChurches'] ?? 0} suspended'),
              _statCard('MRR', 'KES ${_fmt(stats['totalMRR'])}', Icons.payments,
                  AppTheme.secondaryColor,
                  subtitle: 'ARPC ${_fmt(stats['arpc'])}'),
              _statCard('Users', '${stats['totalUsers']}', Icons.people_alt,
                  AppTheme.accentColor,
                  subtitle: '${stats['totalMembers']} members'),
              _statCard('New this month', '${stats['newChurchesThisMonth']}',
                  Icons.trending_up, AppTheme.successColor,
                  subtitle: 'churn ${(stats['churnRate'] as num?)?.toStringAsFixed(1) ?? '0'}%'),
            ],
          ),
          const SizedBox(height: 12),

          // Quick actions
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip(context, 'Tenants', Icons.church_outlined, '/platform/tenants'),
              _chip(context, 'Stuck payments', Icons.warning_amber, '/platform/payments'),
              _chip(context, 'Incidents', Icons.report_outlined, '/platform/incidents'),
              _chip(context, 'Analytics', Icons.insights, '/platform/analytics'),
              _chip(context, 'Maintenance', Icons.build_outlined, '/platform/ops'),
            ],
          ),
          const SizedBox(height: 16),

          const Text('Recent platform activity',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_activity.isEmpty)
            Text(
              'No recent activity',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ..._activity.map((a) => Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: ListTile(
                  dense: true,
                  leading: const Icon(Icons.bolt, size: 18, color: AppTheme.secondaryColor),
                  title: Text(a['title']?.toString() ?? a['type']?.toString() ?? '',
                      style: const TextStyle(fontSize: 13)),
                  subtitle: Text(
                    a['time']?.toString() ?? '',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color,
      {String? subtitle}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
            const SizedBox(height: 6),
            Text(value,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            if (subtitle != null)
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chip(BuildContext context, String label, IconData icon, String path) {
    return ActionChip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      onPressed: () => context.go(path),
    );
  }

  String _fmt(dynamic v) {
    final n = (v is num) ? v : num.tryParse('$v') ?? 0;
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toStringAsFixed(0);
  }
}
