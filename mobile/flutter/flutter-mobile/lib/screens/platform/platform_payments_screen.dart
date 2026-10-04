import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Cross-tenant payment feed + stuck (>24h pending) list with manual
/// reconcile. The "money on fire" view for prod.
class PlatformPaymentsScreen extends ConsumerStatefulWidget {
  const PlatformPaymentsScreen({super.key});

  @override
  ConsumerState<PlatformPaymentsScreen> createState() => _PlatformPaymentsScreenState();
}

class _PlatformPaymentsScreenState extends ConsumerState<PlatformPaymentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  List<dynamic> _payments = [];
  List<dynamic> _stuck = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(platformApiProvider);
      final results = await Future.wait([api.getPayments(), api.getStuckPayments()]);
      setState(() {
        _payments = (results[0] as Map<String, dynamic>)['payments'] as List<dynamic>? ?? [];
        _stuck = results[1] as List<dynamic>;
        _loading = false;
      });
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'completed':
        return AppTheme.successColor;
      case 'failed':
        return AppTheme.errorColor;
      case 'pending':
        return AppTheme.warningColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  Future<void> _reconcile(Map<String, dynamic> p) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.check_circle, color: AppTheme.successColor),
              title: const Text('Mark completed'),
              onTap: () => Navigator.pop(ctx, 'completed'),
            ),
            ListTile(
              leading: const Icon(Icons.cancel, color: AppTheme.errorColor),
              title: const Text('Mark failed'),
              onTap: () => Navigator.pop(ctx, 'failed'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;
    try {
      await ref.read(platformApiProvider).reconcilePayment(p['id'].toString(), choice);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Payment marked $choice')));
      }
      _load();
    } on PlatformApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Widget _paymentTile(Map<String, dynamic> p, {bool reconcile = false}) {
    final status = p['status']?.toString();
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _statusColor(status).withOpacity(0.15),
          child: Icon(Icons.payments, color: _statusColor(status), size: 20),
        ),
        title: Text(
          '${p['currency'] ?? 'KES'} ${p['amount']} — ${p['church_name'] ?? ''}',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          '${p['payment_method'] ?? ''} · ${p['transaction_reference'] ?? 'no ref'} · ${status ?? ''}\n${p['created_at'] ?? ''}${p['stuck_for'] != null ? ' · stuck ${p['stuck_for']}' : ''}',
          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
        ),
        isThreeLine: true,
        trailing: reconcile
            ? TextButton(onPressed: () => _reconcile(p), child: const Text('Resolve'))
            : null,
        onTap: reconcile ? () => _reconcile(p) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tab,
          labelColor: AppTheme.primaryColor,
          tabs: [
            Tab(text: 'Feed (${_payments.length})'),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Stuck (${_stuck.length})'),
                  if (_stuck.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.error, size: 14, color: AppTheme.errorColor),
                  ],
                ],
              ),
            ),
          ],
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(
                      child: Text(_error!,
                          style: const TextStyle(color: AppTheme.errorColor)))
                  : TabBarView(
                      controller: _tab,
                      children: [
                        RefreshIndicator(
                          onRefresh: _load,
                          child: _payments.isEmpty
                              ? ListView(children: const [
                                  SizedBox(height: 80),
                                  Center(child: Text('No payments')),
                                ])
                              : ListView.builder(
                                  padding: const EdgeInsets.all(12),
                                  itemCount: _payments.length,
                                  itemBuilder: (_, i) =>
                                      _paymentTile(_payments[i] as Map<String, dynamic>),
                                ),
                        ),
                        RefreshIndicator(
                          onRefresh: _load,
                          child: _stuck.isEmpty
                              ? ListView(children: const [
                                  SizedBox(height: 80),
                                  Center(child: Text('Nothing stuck — all clear')),
                                ])
                              : ListView.builder(
                                  padding: const EdgeInsets.all(12),
                                  itemCount: _stuck.length,
                                  itemBuilder: (_, i) => _paymentTile(
                                      _stuck[i] as Map<String, dynamic>,
                                      reconcile: true),
                                ),
                        ),
                      ],
                    ),
        ),
      ],
    );
  }
}
