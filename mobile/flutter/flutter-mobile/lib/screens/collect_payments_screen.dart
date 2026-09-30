import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/sms_recon_service.dart';

/// Collector's pending-payments inbox. The collector copies an M-Pesa or
/// bank payment SMS and pastes it here — the app parses it on-device and
/// queues it. Collector taps Accept and picks the member's obligation
/// (auto-suggested on phone+amount match) or Decline to drop it.
class CollectPaymentsScreen extends StatefulWidget {
  const CollectPaymentsScreen({super.key});

  @override
  State<CollectPaymentsScreen> createState() => _CollectPaymentsScreenState();
}

class _CollectPaymentsScreenState extends State<CollectPaymentsScreen> {
  ApiService? _api;
  List<Map<String, dynamic>> _pending = [];
  List<dynamic> _myDepts = [];
  List<Map<String, dynamic>> _rulesets = [];
  bool _loading = true;
  bool _parsing = false;
  final _pasteCtrl = TextEditingController();

  @override
  void dispose() {
    _pasteCtrl.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _api ??= await ApiService.getInstance();
    final pending = await SmsReconService.instance.getPending();
    final depts = await _api!.getMyDepartments();
    if (!mounted) return;
    setState(() {
      _pending = pending;
      _myDepts = depts['success'] == true
          ? (depts['departments'] as List? ?? [])
          : [];
      _loading = false;
    });
    _refreshRulesets();
  }

  /// Pull the active AI-calibrated parser profiles for the church scope
  /// and each of the collector's departments, then cache them so they
  /// also apply offline. Cached rulesets are used until this succeeds.
  Future<void> _refreshRulesets() async {
    _rulesets = await SmsReconService.instance.getCachedRulesets();
    final scopes = {
      'church',
      ..._myDepts.map((d) => d['id'].toString()),
    };
    final fresh = <Map<String, dynamic>>[];
    for (final s in scopes) {
      try {
        final res = await _api!.getParserProfile(s);
        final rs =
            SmsReconService.rulesetFromProfile(res['data']?['profile']);
        if (rs != null) fresh.add(rs);
      } catch (_) {
        // Offline or profile endpoint unavailable — keep cached rules.
      }
    }
    if (fresh.isNotEmpty || _rulesets.isEmpty) {
      await SmsReconService.instance.cacheRulesets(fresh);
      if (mounted) setState(() => _rulesets = fresh);
    } else if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pending Payments')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _pasteCard(),
                  const SizedBox(height: 12),
                  if (_pending.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 60),
                      child: Column(children: [
                        Icon(Icons.sms_outlined,
                            size: 56, color: Colors.grey),
                        SizedBox(height: 12),
                        Text('No payments waiting',
                            style: TextStyle(fontSize: 16)),
                        SizedBox(height: 4),
                        Text(
                          'Copy an M-Pesa or bank payment SMS and\npaste it above to reconcile it.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                      ]),
                    )
                  else
                    ..._pending.map(_txCard),
                ],
              ),
            ),
    );
  }

  Widget _pasteCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add a payment message',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
              'Long-press the SMS in your messages app → Copy, then paste it '
              'here. You can paste several messages at once.',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _pasteCtrl,
              maxLines: 4,
              minLines: 2,
              decoration: const InputDecoration(
                hintText:
                    'e.g. SGH41RT2KL Confirmed. You have received Ksh500.00 from…',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                icon: _parsing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.content_paste_go),
                label: const Text('Parse & queue'),
                onPressed: _parsing ? null : _parsePasted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _parsePasted() async {
    final text = _pasteCtrl.text.trim();
    if (text.isEmpty) {
      _snack('Paste a payment SMS first', isError: true);
      return;
    }
    setState(() => _parsing = true);
    try {
      final result =
          SmsReconService.parseDump(text, rulesets: _rulesets);
      final added = await SmsReconService.instance.addPending(result.parsed);
      if (!mounted) return;
      _pasteCtrl.clear();
      if (added > 0) {
        _snack('$added payment${added > 1 ? 's' : ''} queued for review'
            '${result.failed > 0 ? ' (${result.failed} message${result.failed > 1 ? 's' : ''} skipped)' : ''}');
      } else if (result.parsed.isNotEmpty) {
        _snack('Already queued — same transaction code');
      } else {
        _snack('Nothing recognized — check the message text and try again',
            isError: true);
      }
      _load();
    } finally {
      if (mounted) setState(() => _parsing = false);
    }
  }

  Widget _txCard(Map<String, dynamic> tx) {
    final type = tx['type']?.toString() ?? 'received';
    final isReversal = type == 'reversal';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(
                isReversal
                    ? Icons.undo
                    : type == 'sent'
                        ? Icons.north_east
                        : Icons.south_west,
                color: isReversal
                    ? Colors.red
                    : type == 'sent'
                        ? Colors.orange
                        : Colors.green,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isReversal
                          ? 'Reversal — ${tx['tx_code']}'
                          : 'KES ${_fmt(tx['amount'])}',
                      style: const TextStyle(
                          fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${tx['counterparty_name'] ?? 'Unknown'}'
                      '${tx['counterparty_phone'] != null ? ' · ${tx['counterparty_phone']}' : ''}',
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                    Text('${tx['tx_code']} · $type',
                        style: TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: Colors.grey[500])),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              if (!isReversal) ...[
                Expanded(
                  child: FilledButton.icon(
                    icon: const Icon(Icons.check),
                    label: const Text('Accept'),
                    onPressed: () => _accept(tx),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.close),
                  label: Text(isReversal ? 'Dismiss' : 'Decline'),
                  onPressed: () => _decline(tx),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  String _fmt(dynamic v) {
    final n = double.tryParse(v?.toString() ?? '0') ?? 0;
    return n.toStringAsFixed(0);
  }

  /// Pick department → obligation (auto-suggested) → post reconciliation.
  Future<void> _accept(Map<String, dynamic> tx) async {
    if (_myDepts.isEmpty) {
      _snack('No departments found — cannot assign', isError: true);
      return;
    }
    // Step 1: pick which department this collection belongs to.
    final dept = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Which department is this collection for?',
                  style:
                      TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            ..._myDepts.map((d) => ListTile(
                  leading: const Icon(Icons.groups),
                  title: Text(d['name']?.toString() ?? 'Department'),
                  onTap: () => Navigator.pop(ctx, d),
                )),
          ],
        ),
      ),
    );
    if (dept == null || !mounted) return;

    // Step 2: fetch that dept's obligations and auto-suggest by phone+amount.
    final col = await _api!.getDeptCollections(dept['id'].toString());
    if (!mounted) return;
    final obligations = col['success'] == true
        ? ((col['data']?['obligations'] as List?) ?? [])
        : [];
    final open = obligations
        .where((o) => o['status'] != 'fulfilled' && o['status'] != 'waived')
        .toList();
    final txPhone = (tx['counterparty_phone'] ?? '').toString();
    final txAmount = double.tryParse('${tx['amount']}') ?? 0;
    open.sort((a, b) {
      final aScore = _matchScore(a, txPhone, txAmount);
      final bScore = _matchScore(b, txPhone, txAmount);
      return bScore.compareTo(aScore);
    });

    final obligation = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ConstrainedBox(
          constraints:
              BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.7),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Whose obligation does this pay?',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    ...open.map((o) {
                      final score = _matchScore(o, txPhone, txAmount);
                      final bal = _num(o['target_amount']) - _num(o['paid_amount']);
                      return ListTile(
                        leading: score > 0
                            ? const Icon(Icons.star, color: Colors.amber)
                            : const Icon(Icons.person_outline),
                        title: Text(o['member_name']?.toString() ??
                            'Member'),
                        subtitle: Text(
                            'Balance KES ${bal.toStringAsFixed(0)}'),
                        trailing: score > 0
                            ? const Text('suggested',
                                style: TextStyle(
                                    fontSize: 11, color: Colors.amber))
                            : null,
                        onTap: () => Navigator.pop(ctx, o),
                      );
                    }),
                    const Divider(),
                    ListTile(
                      leading: const Icon(Icons.inbox),
                      title: const Text('Not sure — park as unassigned'),
                      subtitle: const Text(
                          'Treasurer can attach it later'),
                      onTap: () =>
                          Navigator.pop(ctx, {'id': null, '_unassigned': true}),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (obligation == null || !mounted) return;

    final res = await _api!.postReconciliation(dept['id'].toString(), {
      'tx_code': tx['tx_code'],
      'amount': txAmount,
      'payer_name': tx['counterparty_name'],
      'payer_phone': tx['counterparty_phone'],
      'sms_timestamp': tx['occurred_at'],
      if (obligation['_unassigned'] != true) 'obligation_id': obligation['id'],
    });
    if (!mounted) return;
    if (res['success'] == true) {
      _snack(obligation['_unassigned'] == true
          ? 'Parked as unassigned — treasurer will attach it'
          : 'Payment reconciled');
      await SmsReconService.instance.removePending(tx['tx_code']);
      _load();
    } else {
      _snack(res['error']?.toString() ?? 'Failed to reconcile',
          isError: true);
    }
  }

  /// Score how well an obligation matches the incoming SMS — phone match
  /// and/or outstanding-amount match. Never auto-posts; just sorts.
  int _matchScore(Map<String, dynamic> o, String phone, double amount) {
    int score = 0;
    final phones = [o['payer_phone'], o['phone'], o['member_phone']]
        .map((p) => (p ?? '').toString())
        .where((p) => p.isNotEmpty);
    for (final p in phones) {
      if (phone.endsWith(p.length >= 9 ? p.substring(p.length - 9) : p) ||
          p.endsWith(phone.length >= 9 ? phone.substring(phone.length - 9) : phone)) {
        score += 2;
        break;
      }
    }
    final outstanding = _num(o['target_amount']) - _num(o['paid_amount']);
    if (outstanding > 0 && (outstanding - amount).abs() < 1) score += 3;
    return score;
  }

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;

  Future<void> _decline(Map<String, dynamic> tx) async {
    await SmsReconService.instance.removePending(tx['tx_code']);
    _load();
  }

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red : Colors.green,
    ));
  }
}
