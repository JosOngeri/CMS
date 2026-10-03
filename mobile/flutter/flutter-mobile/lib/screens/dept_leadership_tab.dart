import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

/// Department Leadership tab — roster of head/assistant/secretary/
/// collector positions. Managers can appoint and revoke; everyone can see
/// who leads them.
class DeptLeadershipTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;

  const DeptLeadershipTab({
    super.key,
    required this.api,
    required this.deptId,
    required this.canManage,
  });

  @override
  State<DeptLeadershipTab> createState() => _DeptLeadershipTabState();
}

class _DeptLeadershipTabState extends State<DeptLeadershipTab> {
  List<dynamic> _leaders = [];
  bool _loading = true;
  String? _error;

  static const _positions = [
    'head',
    'assistant',
    'secretary',
    'subcommittee_head',
    'collector',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await widget.api.getDeptLeadership(widget.deptId);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res['success'] == true) {
        final d = res['data'];
        _leaders = d is List ? d : (d?['leadership'] as List? ?? []);
      } else {
        _error = res['error']?.toString();
      }
    });
  }

  IconData _iconFor(String position) {
    switch (position) {
      case 'head':
      case 'acting_head':
        return Icons.stars;
      case 'assistant':
        return Icons.supervised_user_circle;
      case 'secretary':
        return Icons.edit_note;
      case 'collector':
        return Icons.account_balance_wallet;
      default:
        return Icons.person;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor)),
            ),
          if (_leaders.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: Text('No leadership assigned yet')),
            )
          else
            ..._leaders.map((l) {
              final temporary =
                  l['is_temporary'] == true || l['expires_at'] != null;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor:
                        AppTheme.primaryColor.withOpacity(0.12),
                    child: Icon(_iconFor(l['position']?.toString() ?? ''),
                        color: AppTheme.primaryColor),
                  ),
                  title: Text(l['user_name']?.toString() ??
                      l['name']?.toString() ??
                      'Unknown'),
                  subtitle: Text(
                    '${l['position'] ?? ''}'
                    '${temporary ? ' • temporary' : ''}'
                    '${l['expires_at'] != null ? ' (until ${l['expires_at'].toString().split('T').first})' : ''}',
                  ),
                  trailing: widget.canManage
                      ? IconButton(
                          icon: const Icon(Icons.remove_circle_outline,
                              color: AppTheme.errorColor),
                          onPressed: () => _revoke(l),
                        )
                      : null,
                ),
              );
            }),
          if (widget.canManage) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.person_add),
              label: const Text('Appoint Leader'),
              onPressed: _appoint,
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              icon: const Icon(Icons.swap_horiz),
              label: const Text('My Handovers'),
              onPressed: () => context.push('/handovers'),
            ),
          ],
        ],
      ),
    );
  }

  /// Step 1 — pick a real member (L732). Returns {'id': …, 'name': …} or null.
  /// The old free-text field sent a name verbatim as user_id → every
  /// non-numeric appointment failed server-side.
  Future<Map<String, dynamic>?> _pickMember() async {
    final searchCtrl = TextEditingController();
    return showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => _MemberPickerDialog(api: widget.api, searchCtrl: searchCtrl),
    );
  }

  Future<void> _appoint() async {
    final member = await _pickMember();
    if (member == null || !mounted) return;

    String position = 'assistant';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text('Appoint ${member['name']}'),
          content: DropdownButtonFormField<String>(
            value: position,
            decoration: const InputDecoration(labelText: 'Position'),
            items: _positions
                .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                .toList(),
            onChanged: (v) => setD(() => position = v ?? 'assistant'),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Appoint')),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final res = await widget.api.appointLeader(widget.deptId, {
      'user_id': member['id'],
      'position': position,
    });
    _result(res);
  }

  Future<void> _revoke(Map<String, dynamic> leader) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove leader?'),
        content: Text(
            'Remove ${leader['user_name'] ?? 'this member'} as ${leader['position']}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Remove')),
        ],
      ),
    );
    if (confirmed != true) return;
    final res = await widget.api
        .revokeLeader(widget.deptId, leader['id'].toString());
    _result(res);
  }

  void _result(Map<String, dynamic> res) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res['success'] == true
          ? (res['message']?.toString() ?? 'Done')
          : (res['error']?.toString() ?? 'Failed')),
      backgroundColor: res['success'] == true ? AppTheme.successColor : AppTheme.errorColor,
    ));
    if (res['success'] == true) _load();
  }
}

/// Searchable member picker — returns {'id', 'name'} via Navigator.pop.
class _MemberPickerDialog extends StatefulWidget {
  final ApiService api;
  final TextEditingController searchCtrl;

  const _MemberPickerDialog({required this.api, required this.searchCtrl});

  @override
  State<_MemberPickerDialog> createState() => _MemberPickerDialogState();
}

class _MemberPickerDialogState extends State<_MemberPickerDialog> {
  List<dynamic> _members = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
    widget.searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    widget.searchCtrl.removeListener(_onSearchChanged);
    super.dispose();
  }

  // Simple debounce — rebuild-at-most-once-per-400ms.
  DateTime _lastKeystroke = DateTime.fromMillisecondsSinceEpoch(0);
  void _onSearchChanged() {
    _lastKeystroke = DateTime.now();
    final stamp = _lastKeystroke;
    Future.delayed(const Duration(milliseconds: 400), () {
      if (_lastKeystroke == stamp && mounted) _fetch();
    });
  }

  Future<void> _fetch() async {
    final res = await widget.api.getMembers(
      search: widget.searchCtrl.text.trim(),
      limit: 50,
    );
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res['success'] == true) {
        _members = res['members'] as List? ?? [];
        _error = null;
      } else {
        _error = res['error']?.toString();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Select Member'),
      content: SizedBox(
        width: double.maxFinite,
        height: 360,
        child: Column(
          children: [
            TextField(
              controller: widget.searchCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Search members',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Text(_error!,
                              style: const TextStyle(color: AppTheme.errorColor)))
                      : _members.isEmpty
                          ? const Center(child: Text('No members found'))
                          : ListView.builder(
                              itemCount: _members.length,
                              itemBuilder: (ctx, i) {
                                final m = _members[i] as Map<String, dynamic>;
                                final name =
                                    '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}'
                                        .trim();
                                final display =
                                    name.isNotEmpty ? name : (m['email']?.toString() ?? 'Unknown');
                                final id = m['id'] ?? m['user_id'];
                                return ListTile(
                                  dense: true,
                                  title: Text(display),
                                  subtitle: m['email'] != null
                                      ? Text(m['email'].toString())
                                      : null,
                                  onTap: () => Navigator.pop(context,
                                      {'id': id, 'name': display}),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
