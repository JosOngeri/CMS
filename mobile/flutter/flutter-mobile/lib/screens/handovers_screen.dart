import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

/// Department leadership handovers involving the current user.
/// Incoming: accept or decline. Outgoing: review checklist and complete
/// to release the position.
class HandoversScreen extends StatefulWidget {
  const HandoversScreen({super.key});

  @override
  State<HandoversScreen> createState() => _HandoversScreenState();
}

class _HandoversScreenState extends State<HandoversScreen> {
  ApiService? _api;
  List<dynamic>? _incoming;
  List<dynamic>? _outgoing;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _api ??= await ApiService.getInstance();
    final res = await _api!.getMyHandovers();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res['success'] == true) {
        final data = res['data'];
        _incoming = data is Map
            ? (data['incoming'] as List? ?? [])
            : (data as List? ?? []);
        _outgoing = data is Map ? (data['outgoing'] as List? ?? []) : [];
      } else {
        _error = res['error']?.toString() ?? 'Failed to load handovers';
      }
    });
  }

  Future<void> _act(String id, String action) async {
    final res = await _api!.handoverAction(id, action);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['success'] == true
          ? (res['message']?.toString() ?? 'Done')
          : (res['error']?.toString() ?? 'Failed')),
      backgroundColor: res['success'] == true ? AppTheme.successColor : AppTheme.errorColor,
    ));
    if (res['success'] == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Handovers')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(_error!,
                          style: const TextStyle(color: AppTheme.errorColor)),
                    ),
                  _sectionTitle('Incoming — awaiting your response'),
                  if (_incoming == null || _incoming!.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16),
                      child: Text('No incoming handovers',
                          style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  else
                    ..._incoming!.map((h) => _IncomingCard(h, _act)),
                  const SizedBox(height: 24),
                  _sectionTitle('Outgoing — complete to release'),
                  if (_outgoing == null || _outgoing!.isEmpty)
                    const Text('No outgoing handovers',
                        style: TextStyle(color: AppTheme.textSecondary))
                  else
                    ..._outgoing!.map((h) => _OutgoingCard(h, _act)),
                ],
              ),
            ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t,
            style: const TextStyle(
                fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
      );
}

class _IncomingCard extends StatelessWidget {
  final Map<String, dynamic> h;
  final Future<void> Function(String, String) onAction;
  const _IncomingCard(this.h, this.onAction);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(h['department_name']?.toString() ?? 'Department',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
                'Position: ${h['position'] ?? ''} • From: ${h['outgoing_name'] ?? ''}',
                style: TextStyle(color: AppTheme.textSecondary)),
            if ((h['notes'] ?? '').toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(h['notes'].toString(),
                  style: const TextStyle(fontSize: 13)),
            ],
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: FilledButton(
                  onPressed: () => onAction(h['id'].toString(), 'accept'),
                  child: const Text('Accept'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => onAction(h['id'].toString(), 'decline'),
                  child: const Text('Decline'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

class _OutgoingCard extends StatelessWidget {
  final Map<String, dynamic> h;
  final Future<void> Function(String, String) onAction;
  const _OutgoingCard(this.h, this.onAction);

  @override
  Widget build(BuildContext context) {
    final status = h['status']?.toString() ?? 'pending';
    final checklist = h['checklist'];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(h['department_name']?.toString() ?? 'Department',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
                'To: ${h['incoming_name'] ?? ''} • Status: $status',
                style: TextStyle(color: AppTheme.textSecondary)),
            if (checklist is List && checklist.isNotEmpty) ...[
              const SizedBox(height: 8),
              ...checklist.map((c) => Row(
                    children: [
                      Icon(
                          c is Map && c['done'] == true
                              ? Icons.check_box
                              : Icons.check_box_outline_blank,
                          size: 18,
                          color: c is Map && c['done'] == true
                              ? AppTheme.successColor
                              : AppTheme.textSecondary),
                      const SizedBox(width: 6),
                      Expanded(
                          child: Text(
                              c is Map
                                  ? (c['item'] ?? c.toString())
                                  : c.toString(),
                              style: const TextStyle(fontSize: 13))),
                    ],
                  )),
            ],
            const SizedBox(height: 12),
            Row(children: [
              if (status == 'accepted' || status == 'pending')
                Expanded(
                  child: FilledButton(
                    onPressed: () =>
                        onAction(h['id'].toString(), 'complete'),
                    child: const Text('Complete Handover'),
                  ),
                ),
              if (status == 'pending') ...[
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () =>
                        onAction(h['id'].toString(), 'cancel'),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ]),
          ],
        ),
      ),
    );
  }
}
