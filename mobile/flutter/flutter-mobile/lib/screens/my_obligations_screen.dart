import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

/// Member's financial obligations across all departments — required targets
/// and voluntary contribution options, each with its own progress bar.
class MyObligationsScreen extends StatefulWidget {
  const MyObligationsScreen({super.key});

  @override
  State<MyObligationsScreen> createState() => _MyObligationsScreenState();
}

class _MyObligationsScreenState extends State<MyObligationsScreen> {
  ApiService? _api;
  List<dynamic>? _obligations;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _api ??= await ApiService.getInstance();
    final res = await _api!.getMyObligations();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res['success'] == true) {
        final data = res['data'];
        _obligations = data is List ? data : (data?['obligations'] as List? ?? []);
      } else {
        _error = res['error']?.toString() ?? 'Failed to load obligations';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Obligations')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _error != null
                  ? ListView(children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_error!)),
                    ])
                  : (_obligations == null || _obligations!.isEmpty)
                      ? ListView(children: const [
                          SizedBox(height: 80),
                          Center(
                            child: Column(
                              children: [
                                Icon(Icons.check_circle_outline,
                                    size: 56, color: AppTheme.successColor),
                                SizedBox(height: 12),
                                Text('No outstanding obligations',
                                    style: TextStyle(fontSize: 16)),
                              ],
                            ),
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _obligations!.length,
                          itemBuilder: (context, i) =>
                              _ObligationCard(_obligations![i], _pay, _api!),
                        ),
            ),
    );
  }

  Future<void> _pay(Map<String, dynamic> ob) async {
    final remaining = _num(ob['target_amount']) - _num(ob['paid_amount']);
    final amountCtrl = TextEditingController(
        text: remaining > 0 ? remaining.toStringAsFixed(0) : '');
    final phoneCtrl = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Pay: ${ob['title'] ?? 'Obligation'}',
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: 'Amount (KES)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                  labelText: 'M-Pesa phone (2547XXXXXXXX)',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.payments),
              label: const Text('Pay with M-Pesa'),
              onPressed: () => Navigator.pop(ctx, true),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final amount = double.tryParse(amountCtrl.text) ?? 0;
    final phone = phoneCtrl.text.trim();
    if (amount <= 0 || !RegExp(r'^2547\d{8}$').hasMatch(phone)) {
      _snack('Enter a valid amount and phone number (2547XXXXXXXX)',
          isError: true);
      return;
    }
    final res = await _api!.initiatePayment({
      'amount': amount,
      'phoneNumber': phone,
      'category': 'Department',
      'description': ob['title'] ?? 'Department obligation',
      'obligationId': ob['id'],
    });
    if (!mounted) return;
    if (res['success'] == true) {
      _snack('Payment initiated — check your phone for the M-Pesa prompt.');
      _load();
    } else {
      _snack(res['error']?.toString() ?? 'Payment failed', isError: true);
    }
  }

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppTheme.errorColor : AppTheme.successColor,
    ));
  }
}

class _ObligationCard extends StatelessWidget {
  final Map<String, dynamic> ob;
  final Future<void> Function(Map<String, dynamic>) onPay;
  final ApiService api;
  const _ObligationCard(this.ob, this.onPay, this.api);

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;

  @override
  Widget build(BuildContext context) {
    final target = _num(ob['target_amount']);
    final paid = _num(ob['paid_amount']);
    final progress = target > 0 ? (paid / target).clamp(0.0, 1.0) : 0.0;
    final voluntary = (ob['obligation_type'] ?? 'target') == 'voluntary';
    final status = (ob['status'] ?? 'pending').toString();
    final done = status == 'fulfilled' || paid >= target && target > 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(ob['title'] ?? 'Obligation',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: voluntary
                        ? AppTheme.primaryColor.withOpacity(0.12)
                        : AppTheme.warningColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    voluntary ? 'Voluntary' : 'Target',
                    style: TextStyle(
                        fontSize: 11,
                        color: voluntary ? AppTheme.primaryColor : AppTheme.warningColor,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (ob['department_name'] != null) ...[
              const SizedBox(height: 4),
              Text(ob['department_name'].toString(),
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
            ],
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress, minHeight: 8),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Paid: KES ${paid.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 13)),
                Text(
                    'Target: KES ${target.toStringAsFixed(0)}  •  ${(progress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(fontSize: 13)),
              ],
            ),
            if (ob['due_date'] != null) ...[
              const SizedBox(height: 4),
              Text('Due: ${ob['due_date'].toString().split('T').first}',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            ],
            const SizedBox(height: 12),
            if (done)
              const Row(children: [
                Icon(Icons.check_circle, color: AppTheme.successColor, size: 18),
                SizedBox(width: 6),
                Text('Fulfilled',
                    style: TextStyle(
                        color: AppTheme.successColor, fontWeight: FontWeight.w600)),
              ])
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonalIcon(
                  icon: const Icon(Icons.payments),
                  label: Text(voluntary ? 'Contribute' : 'Pay Now'),
                  onPressed: () => onPay(ob),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
