import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../services/sms_recon_service.dart';
import '../app/theme.dart';

/// Department Collections tab — collection target progress, milestones,
/// budgets/obligations (heads), and the M-Pesa reconciliation + parser
/// setup flows for collectors/treasurers.
class DeptCollectionsTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;
  final bool canCollect;

  const DeptCollectionsTab({
    super.key,
    required this.api,
    required this.deptId,
    required this.canManage,
    this.canCollect = false,
  });

  @override
  State<DeptCollectionsTab> createState() => _DeptCollectionsTabState();
}

class _DeptCollectionsTabState extends State<DeptCollectionsTab> {
  Map<String, dynamic>? _collections;
  List<dynamic> _budgets = [];
  List<dynamic> _reconciliations = [];
  List<dynamic> _pendingFunds = [];
  List<dynamic> _remittances = [];
  List<dynamic> _subcommitteeList = [];
  int _pendingCount = 0;
  bool _loading = true;
  String? _error;

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final col = await widget.api.getDeptCollections(widget.deptId);
    final bud = widget.canManage
        ? await widget.api.getDeptBudgets(widget.deptId)
        : {'success': false};
    final rec = widget.canManage
        ? await widget.api.getReconciliations(widget.deptId)
        : {'success': false};
    final canRemit = widget.canManage || widget.canCollect;
    final funds = canRemit
        ? await widget.api.getPendingFunds(widget.deptId)
        : {'success': false};
    final rems = canRemit
        ? await widget.api.getRemittances(widget.deptId)
        : {'success': false};
    final subs = widget.canManage
        ? await widget.api.getSubcommittees(widget.deptId)
        : {'success': false};
    if (!mounted) return;
    setState(() {
      _loading = false;
      _collections = col['success'] == true ? col['data'] : null;
      _error = col['success'] == true ? null : col['error']?.toString();
      if (bud['success'] == true) {
        final d = bud['data'];
        _budgets = d is List ? d : (d?['budgets'] as List? ?? []);
      }
      if (rec['success'] == true) {
        final d = rec['data'];
        _reconciliations = d is List ? d : (d?['reconciliations'] as List? ?? []);
      }
      if (funds['success'] == true) {
        _pendingFunds = (funds['data']?['items'] as List?) ?? [];
      }
      if (rems['success'] == true) {
        final d = rems['data'];
        _remittances = d is List ? d : (d?['remittances'] as List? ?? []);
      }
      if (subs['success'] == true) {
        final d = subs['data'];
        _subcommitteeList = d is List ? d : (d?['subcommittees'] as List? ?? []);
      }
    });
    final pending = await SmsReconService.instance.getPending();
    if (!mounted) return;
    setState(() {
      _pendingCount = pending.length;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null && _collections == null) {
      return Center(child: Text(_error!));
    }
    final collBudgets = (_collections?['budgets'] as List?) ?? [];
    final subcommittees = (_collections?['subcommittees'] as List?) ?? [];
    final members = (_collections?['members'] as List?) ?? [];
    final target = collBudgets.fold<double>(
        0, (s, b) => s + _num(b['target_amount']));
    final collected = collBudgets.fold<double>(
        0, (s, b) => s + _num(b['collected']));
    final progress = target > 0 ? (collected / target).clamp(0.0, 1.0) : 0.0;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (collBudgets.isNotEmpty)
            _progressCard(target, collected, progress),
          if (collBudgets.isNotEmpty) const SizedBox(height: 12),
          ...collBudgets.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _collectionBudgetCard(b),
              )),
          if (subcommittees.isNotEmpty) _subcommitteesCard(subcommittees),
          if (widget.canManage || widget.canCollect) ...[
            _collectorCard(),
            if (widget.canManage) _budgetCard(),
            if (_reconciliations.isNotEmpty) _reconCard(),
            if (_pendingFunds.isNotEmpty || _remittances.isNotEmpty)
              _remittanceCard(),
            if (widget.canManage) _parserCard(),
          ],
          if (members.isNotEmpty) _membersCard(members),
        ],
      ),
    );
  }

  /// Per-budget progress card — mirrors the web Collections tab: progress
  /// bar, milestone marks, member fulfillment, subcommittee tag, and an
  /// allocate action for managers on active budgets.
  Widget _collectionBudgetCard(Map<String, dynamic> b) {
    final target = _num(b['target_amount']);
    final collected = _num(b['collected']);
    final pct = (_num(b['percent']) / 100).clamp(0.0, 1.0);
    final milestones = (b['milestones'] as List?) ?? [];
    final status = (b['status'] ?? '').toString();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(b['purpose']?.toString() ?? 'Department budget',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15)),
                      Text(
                        '${b['obligation_type'] == 'target' ? 'Required obligations' : 'Voluntary contributions'}'
                        '${b['subcommittee_name'] != null ? ' · ${b['subcommittee_name']}' : ''}'
                        '${b['collection_deadline'] != null ? ' · due ${b['collection_deadline'].toString().split('T').first}' : ''}',
                        style:
                            TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (status.isNotEmpty)
                  Chip(
                    label: Text(status,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.white)),
                    backgroundColor:
                        status == 'active' ? AppTheme.successColor : AppTheme.textSecondary,
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: pct, minHeight: 10),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('KES ${collected.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                Text('of KES ${target.toStringAsFixed(0)} '
                    '(${_num(b['percent']).toStringAsFixed(0)}%)'),
              ],
            ),
            if (milestones.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: milestones
                    .map((m) => Row(
                          children: [
                            if (m['reached'] == true)
                              const Icon(Icons.check_circle,
                                  size: 14, color: AppTheme.successColor),
                            Text(' ${_num(m['percent']).toInt()}%',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: m['reached'] == true
                                        ? AppTheme.successColor
                                        : AppTheme.textSecondary)),
                          ],
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              '${_num(b['fulfilled_count']).toInt()}/${_num(b['member_count']).toInt()} members fulfilled',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            if (widget.canManage && status == 'active')
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  icon: const Icon(Icons.groups, size: 18),
                  label: const Text('Allocate to members'),
                  onPressed: () => _allocate(b),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Subcommittee rollup — how each auxiliary arm is doing against its
  /// own budget targets.
  Widget _subcommitteesCard(List subs) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Subcommittee collections',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...subs.map((s) {
              final target = _num(s['target_amount']);
              final collected = _num(s['collected']);
              final pct = (_num(s['percent']) / 100).clamp(0.0, 1.0);
              return InkWell(
                onTap: () => _subDetail(s),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                                s['name']?.toString() ?? 'Subcommittee',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                          ),
                          Text(
                            'KES ${collected.toStringAsFixed(0)} / ${target.toStringAsFixed(0)}',
                            style: TextStyle(
                                fontSize: 12, color: AppTheme.textSecondary),
                          ),
                          const Icon(Icons.chevron_right,
                              size: 18, color: AppTheme.textSecondary),
                        ],
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(value: pct, minHeight: 6),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _progressCard(double target, double collected, double progress) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Collection Target',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress, minHeight: 10),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('KES ${collected.toStringAsFixed(0)} collected'),
                Text('of KES ${target.toStringAsFixed(0)} '
                    '(${(progress * 100).toStringAsFixed(0)}%)'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Collector card — jump to the pending-payments inbox where a payment
  /// SMS is pasted and reconciled. No permissions needed — the collector
  /// copies the message and the app parses it on-device.
  Widget _collectorCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.sms, color: AppTheme.textSecondary),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Reconcile a payment',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Copy an M-Pesa or bank payment SMS and paste it in the app — '
              'it\'s parsed on this phone and queued for review.',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                icon: _pendingCount > 0
                    ? Badge(
                        label: Text('$_pendingCount'),
                        child: const Icon(Icons.content_paste_go),
                      )
                    : const Icon(Icons.content_paste_go),
                label: Text(_pendingCount > 0
                    ? 'Review $_pendingCount pending payment${_pendingCount > 1 ? 's' : ''}'
                    : 'Paste a payment message'),
                onPressed: () =>
                    context.push('/collect-payments').then((_) => _load()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _budgetCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Budget pipeline',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Propose'),
                  onPressed: _proposeBudget,
                ),
              ],
            ),
            if (_budgets.isEmpty)
              const Text('No budgets yet',
                  style: TextStyle(color: AppTheme.textSecondary))
            else
              ..._budgets.map((b) {
                final status = (b['status'] ?? 'pending').toString();
                final subName = _subName(b['subcommittee_id']);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(b['purpose']?.toString() ?? 'Budget'),
                  subtitle: Text(
                      'KES ${_num(b['target_amount']).toStringAsFixed(0)} • $status'
                      '${subName != null ? ' • $subName' : ''}'),
                  trailing: status == 'active'
                      ? TextButton(
                          onPressed: () => _allocate(b),
                          child: const Text('Allocate'),
                        )
                      : null,
                );
              }),
          ],
        ),
      ),
    );
  }

  String? _subName(dynamic subId) {
    if (subId == null) return null;
    for (final s in _subcommitteeList) {
      if (s['id']?.toString() == subId.toString()) {
        return s['name']?.toString();
      }
    }
    return null;
  }

  Widget _reconCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Recent Reconciliations',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ..._reconciliations.take(5).map((r) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.receipt_long),
                  title: Text('${r['tx_code'] ?? ''}'),
                  subtitle: Text(
                      'KES ${_num(r['amount']).toStringAsFixed(0)} • ${r['status'] ?? 'pending'}'),
                )),
          ],
        ),
      ),
    );
  }

  /// Remittance ledger — reconciled funds sitting with collectors and the
  /// handover trail to the church account. Collectors batch their
  /// reconciled txns; treasurers confirm or dispute receipt.
  Widget _remittanceCard() {
    final pendingTotal = _pendingFunds.fold<double>(
        0, (s, x) => s + _num(x['amount']));
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Remittances',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            if (_pendingFunds.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.warningColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.warningColor.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KES ${pendingTotal.toStringAsFixed(0)} in hand '
                      '(${_pendingFunds.length} txn${_pendingFunds.length > 1 ? 's' : ''})',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Reconciled funds not yet handed to the church account.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.account_balance),
                        label: const Text('Hand over to church'),
                        onPressed: _handOver,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
            ..._remittances.take(8).map((r) {
              final status = (r['status'] ?? 'pending').toString();
              final color = status == 'confirmed'
                  ? AppTheme.successColor
                  : status == 'disputed'
                      ? AppTheme.errorColor
                      : AppTheme.warningColor;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.account_balance_wallet, color: color),
                title: Text(
                    'KES ${_num(r['amount']).toStringAsFixed(0)} • ${r['method'] ?? 'cash'}'),
                subtitle: Text(
                  '${r['collector_name'] ?? 'Collector'} → church'
                  '${r['reference'] != null ? ' • ref ${r['reference']}' : ''}'
                  '${r['dispute_reason'] != null ? '\n⚠ ${r['dispute_reason']}' : ''}',
                ),
                isThreeLine: r['dispute_reason'] != null,
                trailing: status == 'pending' && widget.canManage
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Confirm receipt',
                            icon: const Icon(Icons.check_circle,
                                color: AppTheme.successColor),
                            onPressed: () => _confirmRemittance(r),
                          ),
                          IconButton(
                            tooltip: 'Dispute',
                            icon: const Icon(Icons.flag, color: AppTheme.errorColor),
                            onPressed: () => _dispute(r),
                          ),
                        ],
                      )
                    : Chip(
                        label: Text(status,
                            style: const TextStyle(
                                fontSize: 11, color: Colors.white)),
                        backgroundColor: color,
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
              );
            }),
          ],
        ),
      ),
    );
  }

  /// Batch handover: pick which pending txns are being handed over,
  /// how (cash/bank/M-Pesa), and an optional reference.
  Future<void> _handOver() async {
    final selected = _pendingFunds.map((x) => x['id'].toString()).toSet();
    String method = 'cash';
    final refCtrl = TextEditingController();
    final notesCtrl = TextEditingController();

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Hand over funds'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Transactions included:',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                ..._pendingFunds.map((x) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text(
                          '${x['tx_code']} — KES ${_num(x['amount']).toStringAsFixed(0)}'),
                      value: selected.contains(x['id'].toString()),
                      onChanged: (v) => setDlg(() {
                        if (v == true) {
                          selected.add(x['id'].toString());
                        } else {
                          selected.remove(x['id'].toString());
                        }
                      }),
                    )),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: method,
                  decoration:
                      const InputDecoration(labelText: 'Handover method'),
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('Cash')),
                    DropdownMenuItem(value: 'bank', child: Text('Bank deposit')),
                    DropdownMenuItem(value: 'mpesa', child: Text('M-Pesa')),
                  ],
                  onChanged: (v) => setDlg(() => method = v ?? 'cash'),
                ),
                TextField(
                  controller: refCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Reference (slip no. / tx code)'),
                ),
                TextField(
                  controller: notesCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Notes (optional)'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
              onPressed:
                  selected.isEmpty ? null : () => Navigator.pop(ctx, true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final res = await widget.api.createRemittance(widget.deptId, {
      'reconciliation_ids': selected.toList(),
      'method': method,
      if (refCtrl.text.trim().isNotEmpty) 'reference': refCtrl.text.trim(),
      if (notesCtrl.text.trim().isNotEmpty) 'notes': notesCtrl.text.trim(),
    });
    _result(res, successMsg: 'Remittance recorded — awaiting treasurer confirmation');
  }

  Future<void> _confirmRemittance(Map<String, dynamic> r) async {
    final res = await widget.api
        .confirmRemittance(widget.deptId, r['id'].toString());
    _result(res, successMsg: 'Remittance confirmed');
  }

  Future<void> _dispute(Map<String, dynamic> r) async {
    final reasonCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dispute remittance'),
        content: TextField(
          controller: reasonCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'What is the discrepancy?',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Dispute'),
          ),
        ],
      ),
    );
    if (ok != true || reasonCtrl.text.trim().isEmpty) return;
    final res = await widget.api.disputeRemittance(
        widget.deptId, r['id'].toString(), reasonCtrl.text.trim());
    _result(res, successMsg: 'Remittance flagged as disputed');
  }

  Widget _parserCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('M-Pesa Parser',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            const Text(
              'Paste a real M-Pesa or bank SMS and AI will generate the '
              'parsing rules for this collection account. Calibrate once — '
              'future messages are parsed on-device.',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.auto_fix_high),
                label: const Text('Parser Setup'),
                onPressed: _parserSetup,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Per-member obligation breakdown for the newest active budget —
  /// leaders only (backend gates `members` on canManageDepartment).
  Widget _membersCard(List members) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Member Obligations',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...members.take(20).map((o) {
              final t = _num(o['amount']);
              final p = _num(o['paid_amount']);
              final pct = t > 0 ? (p / t * 100).toStringAsFixed(0) : '0';
              final name =
                  '${o['first_name'] ?? ''} ${o['last_name'] ?? ''}'.trim();
              final status = (o['status'] ?? '').toString();
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(name.isNotEmpty ? name : 'Member'),
                subtitle: Text(
                    '${o['obligation_type'] ?? 'target'} • KES ${p.toStringAsFixed(0)} / ${t.toStringAsFixed(0)}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$pct%'),
                    if (widget.canManage &&
                        status != 'fulfilled' &&
                        status != 'waived')
                      TextButton(
                        onPressed: () => _waive(o),
                        child: const Text('waive',
                            style:
                                TextStyle(fontSize: 12, color: AppTheme.errorColor)),
                      ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  /// Subcommittee detail sheet — collection rollup plus spend view
  /// (budget total/spent/remaining and recent spend requests).
  Future<void> _subDetail(Map<String, dynamic> s) async {
    final res = await widget.api
        .getSubcommitteeBudget(widget.deptId, s['id'].toString());
    if (!mounted) return;
    if (res['success'] != true) {
      _snack(res['error']?.toString() ?? 'Failed to load', isError: true);
      return;
    }
    final budget = res['data']?['budget'];
    final requests = (res['data']?['spend_requests'] as List?) ?? [];
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(s['name']?.toString() ?? 'Subcommittee',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 4),
              Text(
                'Collected KES ${_num(s['collected']).toStringAsFixed(0)} '
                'of KES ${_num(s['target_amount']).toStringAsFixed(0)} target',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
              const Divider(height: 24),
              if (budget == null)
                const Text('No spend budget set for this subcommittee.',
                    style: TextStyle(color: AppTheme.textSecondary))
              else ...[
                const Text('Spend budget',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _kvRow('Total',
                    'KES ${_num(budget['total_amount']).toStringAsFixed(0)}'),
                _kvRow('Spent',
                    'KES ${_num(budget['spent_amount']).toStringAsFixed(0)}'),
                _kvRow(
                    'Remaining',
                    'KES ${_num(budget['remaining_amount']).toStringAsFixed(0)}'),
              ],
              if (requests.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text('Recent spend requests',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                ...requests.take(5).map((r) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.receipt_long, size: 20),
                      title: Text(r['title']?.toString() ?? 'Request',
                          overflow: TextOverflow.ellipsis),
                      subtitle: Text(
                          'KES ${_num(r['amount']).toStringAsFixed(0)}'),
                      trailing: Chip(
                        label: Text('${r['status']}',
                            style: const TextStyle(
                                fontSize: 10, color: Colors.white)),
                        backgroundColor: r['status'] == 'approved'
                            ? AppTheme.successColor
                            : r['status'] == 'rejected'
                                ? AppTheme.errorColor
                                : AppTheme.warningColor,
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _kvRow(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [Text(k), Text(v, style: const TextStyle(fontWeight: FontWeight.w600))],
        ),
      );

  Future<void> _waive(Map<String, dynamic> o) async {
    final res = await widget.api
        .waiveObligation(widget.deptId, o['id'].toString());
    _result(res, successMsg: 'Obligation waived');
  }

  Future<void> _proposeBudget() async {
    final purposeCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final deadlineCtrl = TextEditingController();
    String obligationType = 'target';
    String? subcommitteeId;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Propose Budget'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                    controller: purposeCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Purpose')),
                TextField(
                    controller: amountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Target amount (KES)')),
                TextField(
                    controller: deadlineCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Deadline (YYYY-MM-DD, optional)')),
                DropdownButtonFormField<String>(
                  value: obligationType,
                  decoration:
                      const InputDecoration(labelText: 'Obligation type'),
                  items: const [
                    DropdownMenuItem(
                        value: 'target',
                        child: Text('Target — members must give')),
                    DropdownMenuItem(
                        value: 'voluntary',
                        child: Text('Voluntary — open pool')),
                  ],
                  onChanged: (v) =>
                      setDlg(() => obligationType = v ?? 'target'),
                ),
                if (_subcommitteeList.isNotEmpty)
                  DropdownButtonFormField<String>(
                    value: subcommitteeId,
                    decoration: const InputDecoration(
                        labelText: 'Subcommittee (optional)'),
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('Whole department')),
                      ..._subcommitteeList.map((s) => DropdownMenuItem(
                          value: s['id']?.toString(),
                          child: Text(s['name']?.toString() ?? 'Sub'))),
                    ],
                    onChanged: (v) => setDlg(() => subcommitteeId = v),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Submit')),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final res = await widget.api.proposeDeptBudget(widget.deptId, {
      'purpose': purposeCtrl.text.trim(),
      'target_amount': double.tryParse(amountCtrl.text) ?? 0,
      'obligation_type': obligationType,
      if (deadlineCtrl.text.trim().isNotEmpty)
        'collection_deadline': deadlineCtrl.text.trim(),
      if (subcommitteeId != null) 'subcommittee_id': subcommitteeId,
    });
    _result(res, successMsg: 'Budget proposed — awaiting approval');
  }

  Future<void> _allocate(Map<String, dynamic> budget) async {
    final type = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Allocate to members'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'equal'),
            child: const Text('Equal target split'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'voluntary'),
            child: const Text('Voluntary pool'),
          ),
        ],
      ),
    );
    if (type == null) return;
    final res = await widget.api.allocateDeptBudget(
        widget.deptId, budget['id'].toString(), {'mode': type});
    _result(res);
  }

  Future<void> _parserSetup() async {
    final sampleCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Calibrate SMS Parser'),
        content: TextField(
          controller: sampleCtrl,
          maxLines: 5,
          decoration: const InputDecoration(
            labelText: 'Paste a sample M-Pesa/bank SMS',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Calibrate')),
        ],
      ),
    );
    if (ok != true || sampleCtrl.text.trim().isEmpty) return;
    _snack('Calibrating parser…');
    final res = await widget.api
        .calibrateParser(widget.deptId, {'sample_sms': sampleCtrl.text});
    _result(res, successMsg: 'Parser profile generated — validate with a second sample to activate');
  }

  void _result(Map<String, dynamic> res, {String? successMsg}) {
    if (!mounted) return;
    if (res['success'] == true) {
      _snack(successMsg ?? res['message']?.toString() ?? 'Done');
      _load();
    } else {
      _snack(res['error']?.toString() ?? 'Failed', isError: true);
    }
  }

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppTheme.errorColor : AppTheme.successColor,
    ));
  }
}
