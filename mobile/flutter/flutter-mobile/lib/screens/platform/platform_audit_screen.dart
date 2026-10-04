import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Platform audit trail — filterable by action and actor.
class PlatformAuditScreen extends ConsumerStatefulWidget {
  const PlatformAuditScreen({super.key});

  @override
  ConsumerState<PlatformAuditScreen> createState() => _PlatformAuditScreenState();
}

class _PlatformAuditScreenState extends ConsumerState<PlatformAuditScreen> {
  final _actionController = TextEditingController();
  final _actorController = TextEditingController();
  List<dynamic> _logs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _actionController.dispose();
    _actorController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(platformApiProvider).getAuditLogs(
            action: _actionController.text.trim(),
            actor: _actorController.text.trim(),
          );
      setState(() {
        _logs = res['logs'] as List<dynamic>? ?? [];
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
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _actionController,
                  decoration: InputDecoration(
                    hintText: 'Action…',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _load(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _actorController,
                  decoration: InputDecoration(
                    hintText: 'Actor…',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _load(),
                ),
              ),
              IconButton(icon: const Icon(Icons.search), onPressed: _load),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _logs.isEmpty
                          ? ListView(children: const [
                              SizedBox(height: 80),
                              Center(child: Text('No audit entries')),
                            ])
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              itemCount: _logs.length,
                              itemBuilder: (_, i) {
                                final l = _logs[i] as Map<String, dynamic>;
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  child: ListTile(
                                    dense: true,
                                    leading: const Icon(Icons.history,
                                        size: 18, color: AppTheme.primaryColor),
                                    title: Text(l['action']?.toString() ?? '',
                                        style: const TextStyle(
                                            fontSize: 13, fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                      '${l['actor_name'] ?? l['actor_email'] ?? 'system'}'
                                      '${l['resource_type'] != null ? ' · ${l['resource_type']}' : ''}'
                                      '${l['ip_address'] != null ? ' · ${l['ip_address']}' : ''}\n'
                                      '${l['created_at'] ?? ''}',
                                      style: const TextStyle(
                                          fontSize: 11, color: AppTheme.textSecondary),
                                    ),
                                    isThreeLine: true,
                                  ),
                                );
                              },
                            ),
                    ),
        ),
      ],
    );
  }
}
