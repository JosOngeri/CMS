import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Platform analytics — growth (DAU/MAU, tenant signup trend), per-tenant
/// usage volume, and module adoption flags.
class PlatformAnalyticsScreen extends ConsumerStatefulWidget {
  const PlatformAnalyticsScreen({super.key});

  @override
  ConsumerState<PlatformAnalyticsScreen> createState() => _PlatformAnalyticsScreenState();
}

class _PlatformAnalyticsScreenState extends ConsumerState<PlatformAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  Map<String, dynamic>? _growth;
  List<dynamic> _usage = [];
  List<dynamic> _adoption = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(platformApiProvider);
      final results = await Future.wait([api.getGrowth(), api.getUsage(), api.getAdoption()]);
      setState(() {
        _growth = results[0] as Map<String, dynamic>;
        _usage = results[1] as List<dynamic>;
        _adoption = results[2] as List<dynamic>;
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
    return Column(
      children: [
        TabBar(
          controller: _tab,
          labelColor: AppTheme.primaryColor,
          tabs: const [Tab(text: 'Growth'), Tab(text: 'Usage'), Tab(text: 'Adoption')],
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: [_growthTab(), _usageTab(), _adoptionTab()],
          ),
        ),
      ],
    );
  }

  Widget _growthTab() {
    final g = _growth!;
    final months = (g['tenantsByMonth'] as List<dynamic>? ?? []);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            _metric('DAU', '${g['dau']}'),
            _metric('MAU', '${g['mau']}'),
            _metric('Active users', '${g['activeUsers']}'),
            _metric('Total users', '${g['totalUsers']}'),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Tenant signups by month',
            style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: months
                .map((m) => ListTile(
                      dense: true,
                      title: Text(m['month'].toString()),
                      trailing: Text('${m['tenants']} churches',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _usageTab() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _usage.length,
        itemBuilder: (_, i) {
          final u = _usage[i] as Map<String, dynamic>;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(u['name']?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                'KES ${u['payment_volume']} across ${u['payment_count']} payments\n'
                '${u['members']} members · ${u['users']} users',
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }

  Widget _adoptionTab() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _adoption.length,
        itemBuilder: (_, i) {
          final a = _adoption[i] as Map<String, dynamic>;
          final modules = (a['modules'] as Map<String, dynamic>?) ?? {};
          final used = modules.entries.where((e) => e.value == true).map((e) => e.key).toList();
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a['name']?.toString() ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: modules.entries
                        .map((e) => Chip(
                              label: Text(e.key, style: const TextStyle(fontSize: 11)),
                              backgroundColor:
                                  e.value == true ? AppTheme.successLight : AppTheme.borderColor,
                              visualDensity: VisualDensity.compact,
                            ))
                        .toList(),
                  ),
                  if (used.isEmpty)
                    const Text('No modules in use',
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _metric(String label, String value) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Column(
            children: [
              Text(value,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(label,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}
