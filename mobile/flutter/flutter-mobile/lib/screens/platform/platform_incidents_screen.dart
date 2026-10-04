import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Incident tracker — list, open a new incident, move status forward.
class PlatformIncidentsScreen extends ConsumerStatefulWidget {
  const PlatformIncidentsScreen({super.key});

  @override
  ConsumerState<PlatformIncidentsScreen> createState() => _PlatformIncidentsScreenState();
}

class _PlatformIncidentsScreenState extends ConsumerState<PlatformIncidentsScreen> {
  List<dynamic> _incidents = [];
  bool _loading = true;
  String? _error;

  static const _nextStatus = {
    'open': 'investigating',
    'investigating': 'monitoring',
    'monitoring': 'resolved',
  };

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
      _incidents = await ref.read(platformApiProvider).getIncidents();
      setState(() => _loading = false);
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Color _severityColor(String? sev) {
    switch (sev) {
      case 'critical':
        return AppTheme.errorColor;
      case 'high':
        return AppTheme.warningColor;
      case 'medium':
        return AppTheme.secondaryColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  Future<void> _create() async {
    final title = TextEditingController();
    final summary = TextEditingController();
    String severity = 'medium';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Open incident'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: summary,
                maxLines: 3,
                decoration: const InputDecoration(
                    labelText: 'What happened / impact', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: severity,
                decoration: const InputDecoration(
                    labelText: 'Severity', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'low', child: Text('Low')),
                  DropdownMenuItem(value: 'medium', child: Text('Medium')),
                  DropdownMenuItem(value: 'high', child: Text('High')),
                  DropdownMenuItem(value: 'critical', child: Text('Critical')),
                ],
                onChanged: (v) => setDlg(() => severity = v ?? 'medium'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Open')),
          ],
        ),
      ),
    );
    if (ok != true || title.text.trim().isEmpty) return;
    try {
      await ref.read(platformApiProvider).createIncident(
            title: title.text.trim(),
            summary: summary.text.trim(),
            severity: severity,
          );
      _load();
    } on PlatformApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _advance(Map<String, dynamic> incident) async {
    final next = _nextStatus[incident['status']];
    if (next == null) return;
    try {
      await ref.read(platformApiProvider).updateIncident(incident['id'].toString(), next);
      _load();
    } on PlatformApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('Open incident'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _incidents.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 80),
                          Center(child: Text('No incidents — all clear')),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _incidents.length,
                          itemBuilder: (_, i) {
                            final inc = _incidents[i] as Map<String, dynamic>;
                            final status = inc['status']?.toString() ?? 'open';
                            final resolved = status == 'resolved';
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: Icon(
                                  resolved ? Icons.check_circle : Icons.error_outline,
                                  color: resolved
                                      ? AppTheme.successColor
                                      : _severityColor(inc['severity']?.toString()),
                                ),
                                title: Text(inc['title']?.toString() ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text(
                                  '${inc['severity'] ?? ''} · $status'
                                  '${inc['tenant_name'] != null ? ' · ${inc['tenant_name']}' : ''}\n'
                                  '${inc['summary'] ?? ''}',
                                  style: const TextStyle(
                                      fontSize: 12, color: AppTheme.textSecondary),
                                ),
                                isThreeLine: true,
                                trailing: !resolved && _nextStatus[status] != null
                                    ? TextButton(
                                        onPressed: () => _advance(inc),
                                        child: Text('→ ${_nextStatus[status]}'),
                                      )
                                    : null,
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
