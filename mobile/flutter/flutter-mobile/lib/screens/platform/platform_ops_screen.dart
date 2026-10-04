import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Ops panel — maintenance-mode switch, active alerts, version and
/// deploy history. The "break glass" page.
class PlatformOpsScreen extends ConsumerStatefulWidget {
  const PlatformOpsScreen({super.key});

  @override
  ConsumerState<PlatformOpsScreen> createState() => _PlatformOpsScreenState();
}

class _PlatformOpsScreenState extends ConsumerState<PlatformOpsScreen> {
  Map<String, dynamic>? _maintenance;
  Map<String, dynamic>? _version;
  List<dynamic> _deploys = [];
  List<dynamic> _alerts = [];
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
        api.getMaintenance(),
        api.getVersion().catchError((_) => <String, dynamic>{}),
        api.getDeploys().catchError((_) => <dynamic>[]),
        api.getAlerts().catchError((_) => <String, dynamic>{'alerts': <dynamic>[]}),
      ]);
      setState(() {
        _maintenance = results[0] as Map<String, dynamic>;
        _version = results[1] as Map<String, dynamic>;
        _deploys = results[2] as List<dynamic>;
        final alertsData = results[3] as Map<String, dynamic>;
        _alerts = alertsData['alerts'] is List
            ? alertsData['alerts'] as List<dynamic>
            : alertsData['data'] is List
                ? alertsData['data'] as List<dynamic>
                : [];
        _loading = false;
      });
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _toggleMaintenance(bool enabled) async {
    String? message;
    if (enabled) {
      final controller = TextEditingController(
          text: 'Scheduled maintenance in progress — please try again shortly.');
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Enable maintenance mode?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('All tenant API calls will return 503 until disabled.'),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: 'Message tenants see', border: OutlineInputBorder()),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Enable'),
            ),
          ],
        ),
      );
      if (ok != true) return;
      message = controller.text.trim();
    } else {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Disable maintenance mode?'),
          content: const Text('Tenant apps resume normal API access immediately.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Disable')),
          ],
        ),
      );
      if (ok != true) return;
    }
    try {
      await ref.read(platformApiProvider).setMaintenance(enabled: enabled, message: message);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Maintenance ${enabled ? 'ON' : 'OFF'}')),
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
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor)));
    }

    final maintOn = _maintenance?['enabled'] == true;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Maintenance mode
          Card(
            color: maintOn ? AppTheme.errorLight : null,
            child: SwitchListTile(
              title: const Text('Maintenance mode',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(maintOn
                  ? 'ON — tenant API calls return 503\n${_maintenance?['message'] ?? ''}'
                  : 'Off — tenants have normal access'),
              value: maintOn,
              onChanged: _toggleMaintenance,
              activeColor: AppTheme.errorColor,
            ),
          ),
          const SizedBox(height: 12),

          // Active alerts
          const Text('Active alerts', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          if (_alerts.isEmpty)
            const Card(
              child: ListTile(
                dense: true,
                leading: Icon(Icons.check_circle, color: AppTheme.successColor),
                title: Text('No active alerts'),
              ),
            )
          else
            ..._alerts.map((a) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.warning_amber, color: AppTheme.warningColor),
                    title: Text(a['message']?.toString() ?? a['title']?.toString() ?? 'Alert',
                        style: const TextStyle(fontSize: 13)),
                    subtitle: Text('${a['severity'] ?? ''} · ${a['created_at'] ?? a['fired_at'] ?? ''}',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  ),
                )),
          const SizedBox(height: 12),

          // Version + deploys
          if (_version != null && _version!.isNotEmpty)
            Card(
              child: ListTile(
                leading: const Icon(Icons.info_outline, color: AppTheme.primaryColor),
                title: const Text('Backend version'),
                subtitle: Text(_version!.entries
                    .map((e) => '${e.key}: ${e.value}')
                    .join(' · ')),
              ),
            ),
          const SizedBox(height: 8),
          const Text('Recent deploys', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          if (_deploys.isEmpty)
            const Text('No deploy records', style: TextStyle(color: AppTheme.textSecondary))
          else
            ..._deploys.take(10).map((d) => Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.rocket_launch_outlined,
                        size: 18, color: AppTheme.secondaryColor),
                    title: Text(
                        d['version']?.toString() ?? d['commit']?.toString() ?? 'deploy',
                        style: const TextStyle(fontSize: 13)),
                    subtitle: Text('${d['status'] ?? ''} · ${d['created_at'] ?? d['deployed_at'] ?? ''}',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  ),
                )),
        ],
      ),
    );
  }
}
