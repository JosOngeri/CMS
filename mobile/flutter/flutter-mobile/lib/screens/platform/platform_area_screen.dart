import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ExpansionTile(
              initiallyExpanded: widget.sources.length == 1,
              leading: Icon(
                error == null ? Icons.check_circle_outline : Icons.lock_outline,
                color: error == null
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.error,
              ),
              title: Text(source.label),
              subtitle: Text(error ?? _summary(_data[source.label])),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: SelectableText(
                    error ?? const JsonEncoder.withIndent('  ').convert(_data[source.label]),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  String _summary(dynamic value) {
    if (value is List) return '${value.length} records';
    if (value is Map) {
      for (final key in ['data', 'items', 'rows', 'tickets', 'alerts', 'users']) {
        if (value[key] is List) return '${(value[key] as List).length} records';
      }
      return '${value.length} metrics';
    }
    return value?.toString() ?? 'No data';
  }
}
