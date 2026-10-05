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
          labelColor: Theme.of(context).colorScheme.primary,
          unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
          indicatorColor: Theme.of(context).colorScheme.primary,
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
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.8,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: [
            _metric('Daily active', '${g['dau']}'),
            _metric('Monthly active', '${g['mau']}'),
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
                'KES ${_formatNumber(u['payment_volume'])} · ${_formatNumber(u['payment_count'])} payments\n'
                '${_formatNumber(u['members'])} members · ${_formatNumber(u['users'])} users',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
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
                  Text('Modules in use (${used.length} of ${modules.length})',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: modules.entries.map((e) {
                      final active = e.value == true;
                      final scheme = Theme.of(context).colorScheme;
                      return Chip(
                        avatar: Icon(
                          active ? Icons.check_circle : Icons.remove_circle_outline,
                          size: 15,
                          color: active ? AppTheme.successColor : scheme.onSurfaceVariant,
                        ),
                        label: Text(
                          e.key,
                          style: TextStyle(
                            fontSize: 12,
                            color: active ? scheme.onSurface : scheme.onSurfaceVariant,
                          ),
                        ),
                        backgroundColor: active
                            ? AppTheme.successColor.withOpacity(0.16)
                            : scheme.surfaceContainerHighest,
                        side: BorderSide(
                          color: active ? AppTheme.successColor : scheme.outlineVariant,
                        ),
                        visualDensity: VisualDensity.compact,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1),
                  _TenantFlags(churchId: a['id']?.toString() ?? ''),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatNumber(dynamic value) {
    final number = value is num ? value : num.tryParse('$value') ?? 0;
    final whole = number.round().toString();
    return whole.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => ',',
    );
  }

  Widget _metric(String label, String value) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(value,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
              label,
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
}

/// Per-tenant feature-flag switches — real tenant_feature_flags rows toggled
/// via PUT /tenants/:id/flags, distinct from the usage-adoption chips above.
class _TenantFlags extends ConsumerStatefulWidget {
  final String churchId;

  const _TenantFlags({required this.churchId});

  @override
  ConsumerState<_TenantFlags> createState() => _TenantFlagsState();
}

class _TenantFlagsState extends ConsumerState<_TenantFlags> {
  List<dynamic>? _flags;
  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final flags =
          await ref.read(platformApiProvider).getTenantFlags(widget.churchId);
      if (mounted) setState(() => _flags = flags);
    } on PlatformApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _toggle(Map<String, dynamic> flag, bool enabled) async {
    if (_saving) return;
    final flags = _flags!;
    final index = flags.indexOf(flag);
    setState(() {
      _saving = true;
      flags[index] = {...flag, 'enabled': enabled};
    });
    try {
      await ref
          .read(platformApiProvider)
          .setTenantFlag(widget.churchId, flag['flag'].toString(), enabled);
    } on PlatformApiException catch (e) {
      if (mounted) {
        flags[index] = flag;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text('Feature flags: $_error',
            style: TextStyle(fontSize: 11, color: scheme.error)),
      );
    }
    if (_flags == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: SizedBox(
            height: 16,
            width: 16,
            child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 2),
          child: Text('Feature flags',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant)),
        ),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 4.6,
          mainAxisSpacing: 2,
          crossAxisSpacing: 8,
          children: _flags!.map((f) {
            final flag = f as Map<String, dynamic>;
            return Row(
              children: [
                Expanded(
                  child: Text(
                    flag['flag'].toString().replaceAll('_', ' '),
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Transform.scale(
                  scale: 0.72,
                  child: Switch(
                    value: flag['enabled'] == true,
                    onChanged: (v) => _toggle(flag, v),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}
