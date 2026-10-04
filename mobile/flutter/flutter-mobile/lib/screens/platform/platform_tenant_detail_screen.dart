import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Single-church view — tenant record + metrics + stats, with
/// suspend/activate. Used from the tenants list; the row map arrives via
/// `state.extra` so the header renders instantly while detail loads.
class PlatformTenantDetailScreen extends ConsumerStatefulWidget {
  final String tenantId;
  final Map<String, dynamic>? seed;

  const PlatformTenantDetailScreen({super.key, required this.tenantId, this.seed});

  @override
  ConsumerState<PlatformTenantDetailScreen> createState() =>
      _PlatformTenantDetailScreenState();
}

class _PlatformTenantDetailScreenState extends ConsumerState<PlatformTenantDetailScreen> {
  Map<String, dynamic>? _tenant;
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tenant = widget.seed;
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
        api.getTenant(widget.tenantId),
        api.getTenantStats(widget.tenantId).catchError((_) => <String, dynamic>{}),
      ]);
      setState(() {
        _tenant = results[0];
        _stats = results[1];
        _loading = false;
      });
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _toggleStatus() async {
    final t = _tenant!;
    final active = t['status'] == 'active' || t['is_active'] == true;
    try {
      final api = ref.read(platformApiProvider);
      if (active) {
        await api.suspendTenant(widget.tenantId);
      } else {
        await api.activateTenant(widget.tenantId);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${t['name']} ${active ? 'suspended' : 'activated'}')),
        );
      }
      _load();
    } on PlatformApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _tenant;
    if (t == null && _loading) return const Center(child: CircularProgressIndicator());
    if (t == null) {
      return Center(child: Text(_error ?? 'Tenant not found',
          style: const TextStyle(color: AppTheme.errorColor)));
    }

    final active = t['status'] == 'active' || t['is_active'] == true;
    final metrics = (t['metrics'] as Map<String, dynamic>?) ?? {};

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: active ? AppTheme.successLight : AppTheme.errorLight,
                child: Icon(Icons.church,
                    color: active ? AppTheme.successColor : AppTheme.errorColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t['name']?.toString() ?? 'Unnamed',
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    Text(
                      '${t['slug'] ?? ''} · ${t['status'] ?? (active ? 'active' : 'suspended')} · ${t['subscription_tier'] ?? ''}',
                      style: const TextStyle(color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _toggleStatus,
            icon: Icon(active ? Icons.pause_circle : Icons.play_circle),
            label: Text(active ? 'Suspend church' : 'Activate church'),
            style: FilledButton.styleFrom(
              backgroundColor: active ? AppTheme.errorColor : AppTheme.successColor,
            ),
          ),
          const SizedBox(height: 20),
          if (_loading) const LinearProgressIndicator(),
          _section('Metrics', metrics),
          _section('Stats', _stats ?? {}),
          _section('Details', {
            'Created': t['created_at'],
            'Billing cycle': t['billing_cycle'],
            'Contact email': t['contact_email'] ?? t['admin_email'],
            'Phone': t['phone'],
          }),
        ],
      ),
    );
  }

  Widget _section(String title, Map<String, dynamic> data) {
    final entries = data.entries
        .where((e) => e.value != null && e.value is! Map && e.value is! List)
        .toList();
    if (entries.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        Text(title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Card(
          child: Column(
            children: entries
                .map((e) => ListTile(
                      dense: true,
                      title: Text(e.key.replaceAll('_', ' '),
                          style: const TextStyle(
                              fontSize: 13, color: AppTheme.textSecondary)),
                      trailing: Text('${e.value}',
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w600)),
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }
}
