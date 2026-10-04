import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

class PlatformAreaSource {
  final String label;
  final String path;

  const PlatformAreaSource(this.label, this.path);
}

class PlatformAreaScreen extends ConsumerStatefulWidget {
  final String title;
  final List<PlatformAreaSource> sources;

  const PlatformAreaScreen({
    super.key,
    required this.title,
    required this.sources,
  });

  @override
  ConsumerState<PlatformAreaScreen> createState() => _PlatformAreaScreenState();
}

class _PlatformAreaScreenState extends ConsumerState<PlatformAreaScreen> {
  Map<String, dynamic> _data = {};
  Map<String, String> _errors = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _errors = {};
    });
    final api = ref.read(platformApiProvider);
    final data = <String, dynamic>{};
    final errors = <String, String>{};
    await Future.wait(widget.sources.map((source) async {
      try {
        data[source.label] = await api.getAreaData(source.path);
      } on PlatformApiException catch (error) {
        errors[source.label] = error.statusCode == 403
            ? 'Your role does not have permission to view this section.'
            : error.message;
      }
    }));
    if (!mounted) return;
    setState(() {
      _data = data;
      _errors = errors;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: widget.sources.map((source) {
          final error = _errors[source.label];
          final value = _data[source.label];
          return _SourceSection(
            label: source.label,
            value: value,
            error: error,
          );
        }).toList(),
      ),
    );
  }
}

class _SourceSection extends StatelessWidget {
  final String label;
  final dynamic value;
  final String? error;

  const _SourceSection({
    required this.label,
    required this.value,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(
                error == null ? Icons.check_circle : Icons.lock_outline,
                size: 18,
                color: error == null ? AppTheme.successColor : scheme.error,
              ),
              const SizedBox(width: 8),
              Text(label, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
        if (error != null)
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Text(error!, style: TextStyle(color: scheme.error)),
            ),
          )
        else
          ..._buildValue(context, value),
        const SizedBox(height: 8),
      ],
    );
  }

  List<Widget> _buildValue(BuildContext context, dynamic value) {
    final rows = _recordsOf(value);
    if (rows != null) {
      if (rows.isEmpty) {
        return [
          Text('No records',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ];
      }
      return rows.map((row) => _RecordCard(row)).toList();
    }
    return [_RecordCard(value)];
  }

  /// Unwrap common envelope shapes: `{items|data|tickets|...: [...]}`,
  /// `{items: [...]}` under a single list key, or a raw list.
  List<dynamic>? _recordsOf(dynamic value) {
    if (value is List) return value;
    if (value is! Map) return null;
    const listKeys = [
      'data', 'items', 'rows', 'records', 'results', 'users', 'sessions',
      'alerts', 'tickets', 'issues', 'backups', 'plans', 'subscriptions',
      'invoices', 'tenants', 'logs', 'jobs', 'announcements', 'templates',
      'flags', 'settings', 'catalog', 'healthScores', 'messages',
    ];
    for (final key in listKeys) {
      final v = value[key];
      if (v is List) return v;
    }
    final listVals = value.values.whereType<List>().toList();
    if (listVals.length == 1) return listVals.first;
    return null;
  }
}

class _RecordCard extends StatelessWidget {
  final dynamic record;

  const _RecordCard(this.record);

  static const _titleKeys = [
    'name', 'title', 'email', 'subject', 'description', 'key',
    'church_name', 'service_name', 'severity', 'status', 'code',
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (record is! Map) {
      return Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Text(_formatScalar(record)),
        ),
      );
    }
    final map = Map<String, dynamic>.from(record as Map);
    String? title;
    for (final key in _titleKeys) {
      final v = map[key];
      if (v is String && v.isNotEmpty) {
        title = v;
        break;
      }
    }
    final entries = map.entries
        .where((e) => e.value is! Map && e.value is! List)
        .toList();
    final nested = map.entries.where((e) => e.value is Map || e.value is List).toList();

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
              ),
            ...entries.map((e) {
              if (e.key.toString() == title && entries.length > 1) return const SizedBox();
              if (_titleKeys.contains(e.key) && e.value == title) return const SizedBox();
              return _kvRow(context, e.key, e.value);
            }),
            ...nested.map((e) => Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_labelFor(e.key),
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          )),
                      const SizedBox(height: 2),
                      Text(
                        e.value is List
                            ? '${(e.value as List).length} item(s)'
                            : _inlineMap(e.value as Map),
                        style: TextStyle(
                            fontSize: 12, color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _kvRow(BuildContext context, String key, dynamic value) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(_labelFor(key),
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(
              _formatScalar(value),
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  String _inlineMap(Map map) {
    return map.entries
        .where((e) => e.value is! Map && e.value is! List)
        .map((e) => '${_labelFor(e.key)}: ${_formatScalar(e.value)}')
        .join(' · ');
  }

  String _labelFor(dynamic key) {
    final s = key.toString().replaceAll('_', ' ');
    return s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
  }

  String _formatScalar(dynamic value) {
    if (value == null) return '—';
    if (value is bool) return value ? 'Yes' : 'No';
    if (value is num) {
      final s = value is int
          ? value.toString()
          : value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2);
      return s.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
    }
    final s = value.toString();
    final dt = DateTime.tryParse(s);
    if (dt != null && s.contains('T')) {
      final local = dt.toLocal();
      return '${local.year}-${_pad2(local.month)}-${_pad2(local.day)} '
          '${_pad2(local.hour)}:${_pad2(local.minute)}';
    }
    return s;
  }

  String _pad2(int n) => n.toString().padLeft(2, '0');
}
