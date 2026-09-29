import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Department Collections tab — collection target progress, milestones,
/// budgets/obligations (heads), and the M-Pesa reconciliation + parser
/// setup flows for collectors/treasurers.
class DeptCollectionsTab extends StatefulWidget {
  final ApiService api;
  final String deptId;
  final bool canManage;

  const DeptCollectionsTab({
    super.key,
    required this.api,
    required this.deptId,
    required this.canManage,
  });

  @override
  State<DeptCollectionsTab> createState() => _DeptCollectionsTabState();
}

class _DeptCollectionsTabState extends State<DeptCollectionsTab> {
  Map<String, dynamic>? _collections;
  List<dynamic> _budgets = [];
  List<dynamic> _reconciliations = [];
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
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null && _collections == null) {
      return Center(child: Text(_error!));
    }
    final target = _num(_collections?['target_amount']);
    final collected = _num(_collections?['collected_amount']);
    final progress = target > 0 ? (collected / target).clamp(0.0, 1.0) : 0.0;
    final milestones = (_collections?['milestones'] as List?) ?? [];
    final obligations = (_collections?['obligations'] as List?) ?? [];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _progressCard(target, collected, progress),
          const SizedBox(height: 12),
          if (milestones.isNotEmpty) _milestonesCard(milestones),
          if (widget.canManage) ...[
            _budgetCard(),
            if (_reconciliations.isNotEmpty) _reconCard(),
            _parserCard(),
          ],
          if (obligations.isNotEmpty) _obligationsCard(obligations),
        ],
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

  Widget _milestonesCard(List milestones) {
    const marks = [25, 50, 75, 100];
    final hit = milestones
        .map((m) => (m is Map ? _num(m['milestone']) : _num(m)).toInt())
        .toSet();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Milestones',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: marks
                  .map((m) => Column(
                        children: [
                          Icon(
                            hit.contains(m)
                                ? Icons.check_circle
                                : Icons.radio_button_unchecked,
                            color:
                                hit.contains(m) ? Colors.green : Colors.grey,
                          ),
                          const SizedBox(height: 4),
                          Text('$m%', style: const TextStyle(fontSize: 12)),
                        ],
                      ))
                  .toList(),
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
                const Text('Budgets',
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
                  style: TextStyle(color: Colors.grey))
            else
              ..._budgets.map((b) {
                final status = (b['status'] ?? 'proposed').toString();
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(b['title']?.toString() ?? 'Budget'),
                  subtitle: Text(
                      'KES ${_num(b['amount']).toStringAsFixed(0)} • $status'),
                  trailing: status == 'approved'
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
              style: TextStyle(fontSize: 13, color: Colors.grey),
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

  Widget _obligationsCard(List obligations) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Member Obligations',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...obligations.take(20).map((o) {
              final t = _num(o['target_amount']);
              final p = _num(o['paid_amount']);
              final pct = t > 0 ? (p / t * 100).toStringAsFixed(0) : '0';
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(o['member_name']?.toString() ??
                    o['title']?.toString() ??
                    'Member'),
                subtitle:
                    Text('KES ${p.toStringAsFixed(0)} / ${t.toStringAsFixed(0)}'),
                trailing: Text('$pct%'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Future<void> _proposeBudget() async {
    final titleCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Propose Budget'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Title')),
            TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration:
                    const InputDecoration(labelText: 'Amount (KES)')),
            TextField(
                controller: descCtrl,
                decoration: const InputDecoration(labelText: 'Description')),
          ],
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
    );
    if (ok != true) return;
    final res = await widget.api.proposeDeptBudget(widget.deptId, {
      'title': titleCtrl.text.trim(),
      'amount': double.tryParse(amountCtrl.text) ?? 0,
      'description': descCtrl.text.trim(),
    });
    _result(res);
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
      backgroundColor: isError ? Colors.red : Colors.green,
    ));
  }
}
