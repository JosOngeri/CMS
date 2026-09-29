import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'dept_collections_tab.dart';
import 'dept_leadership_tab.dart';

/// Detail view for a single department. Members get Overview / Subcommittees /
/// Programs & Events / Messages. Heads and privileged roles also get Requests
/// (join approvals) and a compose action for communications.
class DepartmentDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> department;

  const DepartmentDetailScreen({super.key, required this.department});

  @override
  ConsumerState<DepartmentDetailScreen> createState() =>
      _DepartmentDetailScreenState();
}

class _DepartmentDetailScreenState extends ConsumerState<DepartmentDetailScreen>
    with SingleTickerProviderStateMixin {
  ApiService? _api;
  TabController? _tabController;
  bool _canManage = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    _api = await ApiService.getInstance();
    final user = ref.read(userProvider);
    final roles =
        (user?['roles'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final roleInDept =
        (widget.department['role_in_department'] ?? '').toString().toLowerCase();
    _canManage = roles.any((r) => [
          'Super Admin',
          'Pastor',
          'First Elder'
        ].contains(r)) ||
        (roles.contains('Department Head') && roleInDept.contains('head'));
    _tabController = TabController(
      length: _canManage ? 7 : 6,
      vsync: this,
    );
    if (mounted) setState(() => _ready = true);
  }

  String get _deptId => widget.department['id'];

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final tabs = <Tab>[
      const Tab(text: 'Overview'),
      const Tab(text: 'Collections'),
      const Tab(text: 'Subcommittees'),
      const Tab(text: 'Programs & Events'),
      const Tab(text: 'Leadership'),
      const Tab(text: 'Messages'),
      if (_canManage) const Tab(text: 'Requests'),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.department['name'] ?? 'Department'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: tabs,
        ),
      ),
      floatingActionButton: _canManage
          ? FloatingActionButton.extended(
              onPressed: _showComposeDialog,
              icon: const Icon(Icons.campaign),
              label: const Text('Announce'),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          _OverviewTab(dept: widget.department),
          DeptCollectionsTab(api: _api!, deptId: _deptId, canManage: _canManage),
          _SubcommitteesTab(api: _api!, deptId: _deptId, canManage: _canManage),
          _ProgramsEventsTab(api: _api!, deptId: _deptId, canManage: _canManage),
          DeptLeadershipTab(api: _api!, deptId: _deptId, canManage: _canManage),
          _MessagesTab(api: _api!, deptId: _deptId, canManage: _canManage),
          if (_canManage) _RequestsTab(api: _api!, deptId: _deptId),
        ],
      ),
    );
  }

  Future<void> _showComposeDialog() async {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    bool sendSms = false;
    final sent = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Send to department'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              TextField(
                controller: bodyCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Message'),
              ),
              SwitchListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: const Text('Also send by SMS (JOSms)', style: TextStyle(fontSize: 13)),
                value: sendSms,
                onChanged: (v) => setD(() => sendSms = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
          ],
        ),
      ),
    );
    if (sent != true) return;
    final res = await _api!.sendDeptCommunication(_deptId, {
      'title': titleCtrl.text.trim(),
      'body': bodyCtrl.text.trim(),
      'send_sms': sendSms,
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'Sent to department${sendSms ? ' + SMS queued' : ''}'
            : (res['error'] ?? 'Failed')),
      ));
    }
  }
}

// --------------------------------------------------------------------------
// Overview
// --------------------------------------------------------------------------
class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> dept;
  const _OverviewTab({required this.dept});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: const Icon(Icons.groups, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(dept['name'] ?? 'Department',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Wrap(spacing: 8, children: [
                if (dept['dept_type'] != null) Chip(label: Text('${dept['dept_type']}'), visualDensity: VisualDensity.compact),
                if (dept['category'] != null) Chip(label: Text('${dept['category']}'), visualDensity: VisualDensity.compact),
              ]),
            ]),
          ),
        ]),
        const SizedBox(height: 16),
        if (dept['description'] != null)
          Text(dept['description'], style: TextStyle(color: Colors.grey[700])),
        const SizedBox(height: 16),
        if (dept['role_in_department'] != null)
          ListTile(
            leading: const Icon(Icons.badge),
            title: const Text('Your role'),
            subtitle: Text(dept['role_in_department']),
          ),
        if (dept['joined_at'] != null)
          ListTile(
            leading: const Icon(Icons.calendar_today),
            title: const Text('Member since'),
            subtitle: Text(dept['joined_at'].toString().split('T').first),
          ),
      ],
    );
  }
}

// --------------------------------------------------------------------------
// Subcommittees
// --------------------------------------------------------------------------
class _SubcommitteesTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;
  const _SubcommitteesTab({required this.api, required this.deptId, required this.canManage});

  @override
  State<_SubcommitteesTab> createState() => _SubcommitteesTabState();
}

class _SubcommitteesTabState extends State<_SubcommitteesTab> {
  List<dynamic>? _items;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final r = await widget.api.getSubcommittees(widget.deptId);
    if (mounted) setState(() => _items = r['data'] as List? ?? []);
  }

  Future<void> _create() async {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New subcommittee'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Create')),
        ],
      ),
    );
    if (ok != true) return;
    await widget.api.createSubcommittee(widget.deptId, {
      'name': nameCtrl.text.trim(),
      'description': descCtrl.text.trim(),
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_items == null) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: widget.canManage
          ? FloatingActionButton.small(onPressed: _create, child: const Icon(Icons.add))
          : null,
      body: _items!.isEmpty
          ? const Center(child: Text('No subcommittees yet'))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _items!.length,
                itemBuilder: (context, i) {
                  final s = _items![i];
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.account_tree),
                      title: Text(s['name'] ?? ''),
                      subtitle: Text([
                        if (s['lead_name'] != null) 'Lead: ${s['lead_name']}',
                        '${s['member_count'] ?? 0} members',
                      ].join('  ·  ')),
                      trailing: widget.canManage
                          ? const Icon(Icons.edit, size: 18)
                          : null,
                    ),
                  );
                },
              ),
            ),
    );
  }
}

// --------------------------------------------------------------------------
// Programs & Events
// --------------------------------------------------------------------------
class _ProgramsEventsTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;
  const _ProgramsEventsTab({required this.api, required this.deptId, required this.canManage});

  @override
  State<_ProgramsEventsTab> createState() => _ProgramsEventsTabState();
}

class _ProgramsEventsTabState extends State<_ProgramsEventsTab> {
  List<dynamic>? _programs;
  List<dynamic>? _events;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await widget.api.getDeptPrograms(widget.deptId);
    final e = await widget.api.getDeptEvents(widget.deptId);
    if (mounted) {
      setState(() {
        _programs = p['data'] as List? ?? [];
        _events = e['data'] as List? ?? [];
      });
    }
  }

  Future<void> _contribute({String? programId, String? eventId, String? name}) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Contribute to $name'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount (KES)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Contribute')),
        ],
      ),
    );
    if (ok != true) return;
    final amount = double.tryParse(ctrl.text) ?? 0;
    if (amount <= 0) return;
    final res = programId != null
        ? await widget.api.contributeToProgram(widget.deptId, programId, amount)
        : await widget.api.contributeToEvent(widget.deptId, eventId!, amount);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['success'] == true ? 'Contribution recorded' : (res['error'] ?? 'Failed'))));
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_programs == null) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Programs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          if (_programs!.isEmpty) const Text('No programs yet'),
          ..._programs!.map((p) => Card(
                child: ListTile(
                  leading: const Icon(Icons.flag),
                  title: Text(p['name'] ?? ''),
                  subtitle: Text(
                      '${p['status'] ?? ''}  ·  target KES ${p['budget_target'] ?? 0}  ·  raised KES ${p['raised'] ?? 0}'),
                  trailing: TextButton(
                    onPressed: () => _contribute(programId: p['id'], name: p['name']),
                    child: const Text('Contribute'),
                  ),
                ),
              )),
          const SizedBox(height: 16),
          const Text('Department events', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          if (_events!.isEmpty) const Text('No department events'),
          ..._events!.map((e) => Card(
                child: ListTile(
                  leading: Icon(
                    e['rsvp_required'] == true ? Icons.event_available : Icons.event,
                  ),
                  title: Text(e['title'] ?? ''),
                  subtitle: Text(
                      '${(e['event_date'] ?? '').toString().split('T').first}  ·  RSVPs: ${e['rsvp_count'] ?? 0}${e['my_rsvp'] != null ? '  ·  you: ${e['my_rsvp']}' : ''}'),
                  trailing: TextButton(
                    onPressed: () => _contribute(eventId: e['id'], name: e['title']),
                    child: const Text('Contribute'),
                  ),
                ),
              )),
        ],
      ),
    );
  }
}

// --------------------------------------------------------------------------
// Messages — member: own private thread; head: thread list -> chat
// --------------------------------------------------------------------------
class _MessagesTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;
  const _MessagesTab({required this.api, required this.deptId, required this.canManage});

  @override
  State<_MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<_MessagesTab> {
  List<dynamic>? _threads; // head view
  String? _myThreadId; // member view
  String? _filterLabel;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.canManage) {
      final r = await widget.api.getDeptThreads(widget.deptId);
      if (mounted) setState(() => _threads = r['data'] as List? ?? []);
    } else {
      final r = await widget.api.getMyDeptThread(widget.deptId);
      if (mounted && r['success'] == true) {
        setState(() => _myThreadId = r['data']['thread_id']);
      }
    }
  }

  void _openChat(String threadId, String memberName) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ThreadChatScreen(
        api: widget.api,
        deptId: widget.deptId,
        threadId: threadId,
        title: memberName,
        canManage: widget.canManage,
      ),
    )).then((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    // Member — straight into own thread
    if (!widget.canManage) {
      if (_myThreadId == null) return const Center(child: CircularProgressIndicator());
      return _ThreadChatView(
        api: widget.api,
        deptId: widget.deptId,
        threadId: _myThreadId!,
        canManage: false,
      );
    }
    // Head — list of member threads
    if (_threads == null) return const Center(child: CircularProgressIndicator());
    final labels = <String>{
      for (final t in _threads!) if (t['labels'] != null) ...t['labels'].toString().split(', ')
    };
    final filtered = _filterLabel == null
        ? _threads!
        : _threads!.where((t) => (t['labels'] ?? '').toString().contains(_filterLabel!)).toList();
    return Column(
      children: [
        if (labels.isNotEmpty)
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FilterChip(
                    label: const Text('All'),
                    selected: _filterLabel == null,
                    onSelected: (_) => setState(() => _filterLabel = null),
                  ),
                ),
                ...labels.map((l) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: FilterChip(
                        label: Text(l),
                        selected: _filterLabel == l,
                        onSelected: (_) => setState(() => _filterLabel = l),
                      ),
                    )),
              ],
            ),
          ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(child: Text('No messages yet'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final t = filtered[i];
                      final unread = int.tryParse('${t['unread']}') ?? 0;
                      return ListTile(
                        leading: CircleAvatar(child: Text('${t['member_name'] ?? '?'}'[0])),
                        title: Text(t['member_name'] ?? 'Member'),
                        subtitle: Text(
                          t['last_message'] ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: unread > 0
                            ? CircleAvatar(
                                radius: 11,
                                backgroundColor: Colors.red,
                                child: Text('$unread',
                                    style: const TextStyle(fontSize: 11, color: Colors.white)))
                            : null,
                        onTap: () => _openChat(t['thread_id'], t['member_name'] ?? 'Member'),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

/// Inline chat view used by the member tab.
class _ThreadChatView extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final String threadId;
  final bool canManage;
  const _ThreadChatView({
    required this.api,
    required this.deptId,
    required this.threadId,
    required this.canManage,
  });

  @override
  State<_ThreadChatView> createState() => _ThreadChatViewState();
}

class _ThreadChatViewState extends State<_ThreadChatView> {
  List<dynamic>? _messages;
  final _ctrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final r = await widget.api.getThreadMessages(widget.deptId, widget.threadId);
    if (mounted) setState(() => _messages = r['data'] as List? ?? []);
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    await widget.api.postThreadMessage(widget.deptId, widget.threadId, {'body': text});
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: _messages == null
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _messages!.length,
                  itemBuilder: (context, i) {
                    final m = _messages![i];
                    return Align(
                      alignment: Alignment.centerLeft,
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Text(m['sender_name'] ?? '',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 12)),
                                if (m['label'] != null) ...[
                                  const SizedBox(width: 6),
                                  Chip(
                                    label: Text('${m['label']}',
                                        style: const TextStyle(fontSize: 10)),
                                    padding: EdgeInsets.zero,
                                    visualDensity: VisualDensity.compact,
                                  ),
                                ],
                              ]),
                              const SizedBox(height: 4),
                              Text(m['body'] ?? ''),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          child: Row(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: TextField(
                    controller: _ctrl,
                    decoration: const InputDecoration(hintText: 'Message the department head…'),
                  ),
                ),
              ),
              IconButton(icon: const Icon(Icons.send), onPressed: _send),
            ],
          ),
        ),
      ],
    );
  }
}

/// Full-screen chat for the head replying to a member's thread.
class _ThreadChatScreen extends StatelessWidget {
  final ApiService api;
  final String deptId;
  final String threadId;
  final String title;
  final bool canManage;
  const _ThreadChatScreen({
    required this.api,
    required this.deptId,
    required this.threadId,
    required this.title,
    required this.canManage,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: _ThreadChatView(api: api, deptId: deptId, threadId: threadId, canManage: canManage),
    );
  }
}

// --------------------------------------------------------------------------
// Requests — pending join approvals (head only)
// --------------------------------------------------------------------------
class _RequestsTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  const _RequestsTab({required this.api, required this.deptId});

  @override
  State<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<_RequestsTab> {
  List<dynamic>? _requests;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final r = await widget.api.getDeptPendingRequests(widget.deptId);
    if (mounted) setState(() => _requests = r['requests'] as List? ?? []);
  }

  Future<void> _act(String userId, bool approve) async {
    final res = approve
        ? await widget.api.approveDeptMember(widget.deptId, userId)
        : await widget.api.rejectDeptMember(widget.deptId, userId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? (approve ? 'Approved' : 'Rejected')
            : (res['error'] ?? 'Failed')),
      ));
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_requests == null) return const Center(child: CircularProgressIndicator());
    if (_requests!.isEmpty) {
      return const Center(child: Text('No pending join requests'));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _requests!.length,
        itemBuilder: (context, i) {
          final r = _requests![i];
          return Card(
            child: ListTile(
              leading: const Icon(Icons.person_add),
              title: Text(r['member_name'] ?? r['first_name'] ?? r['user_id'] ?? 'Member'),
              subtitle: Text('Requested ${(r['requested_at'] ?? r['joined_at'] ?? '').toString().split('T').first}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.check_circle, color: Colors.green),
                    onPressed: () => _act(r['user_id'], true),
                  ),
                  IconButton(
                    icon: const Icon(Icons.cancel, color: Colors.red),
                    onPressed: () => _act(r['user_id'], false),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
