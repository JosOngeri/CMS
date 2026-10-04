import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../services/platform_api_service.dart';

/// Cross-tenant church list with search, status filter, and
/// suspend/activate actions. Tapping a row opens the tenant detail.
class PlatformTenantsScreen extends ConsumerStatefulWidget {
  const PlatformTenantsScreen({super.key});

  @override
  ConsumerState<PlatformTenantsScreen> createState() => _PlatformTenantsScreenState();
}

class _PlatformTenantsScreenState extends ConsumerState<PlatformTenantsScreen> {
  final _searchController = TextEditingController();
  List<dynamic> _tenants = [];
  bool _loading = true;
  String? _error;
  String? _statusFilter;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(platformApiProvider).getTenants(
            search: _search,
            status: _statusFilter,
          );
      setState(() {
        _tenants = res['tenants'] as List<dynamic>? ?? [];
        _loading = false;
      });
    } on PlatformApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _toggleStatus(Map<String, dynamic> tenant) async {
    final id = tenant['id'].toString();
    final isActive = tenant['status'] == 'active' || tenant['is_active'] == true;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isActive ? 'Suspend church?' : 'Activate church?'),
        content: Text(isActive
            ? '${tenant['name']} will lose access to the app until reactivated.'
            : 'Restore ${tenant['name']} access?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: isActive ? AppTheme.errorColor : AppTheme.successColor),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(isActive ? 'Suspend' : 'Activate'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final api = ref.read(platformApiProvider);
      if (isActive) {
        await api.suspendTenant(id);
      } else {
        await api.activateTenant(id);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${tenant['name']} ${isActive ? 'suspended' : 'activated'}')),
        );
      }
      _load();
    } on PlatformApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search churches…',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    isDense: true,
                  ),
                  onSubmitted: (v) {
                    _search = v.trim();
                    _load();
                  },
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String?>(
                icon: const Icon(Icons.filter_list),
                onSelected: (v) {
                  setState(() => _statusFilter = v);
                  _load();
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: null, child: Text('All')),
                  PopupMenuItem(value: 'active', child: Text('Active')),
                  PopupMenuItem(value: 'suspended', child: Text('Suspended')),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _tenants.isEmpty
                          ? ListView(children: const [
                              SizedBox(height: 80),
                              Center(child: Text('No churches found')),
                            ])
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              itemCount: _tenants.length,
                              itemBuilder: (_, i) {
                                final t = _tenants[i] as Map<String, dynamic>;
                                final active = t['status'] == 'active' || t['is_active'] == true;
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: active
                                          ? AppTheme.successLight
                                          : AppTheme.errorLight,
                                      child: Icon(Icons.church,
                                          color: active
                                              ? AppTheme.successColor
                                              : AppTheme.errorColor,
                                          size: 20),
                                    ),
                                    title: Text(t['name']?.toString() ?? 'Unnamed',
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                      '${t['subscription_tier'] ?? t['tier'] ?? ''} · ${t['status'] ?? (active ? 'active' : 'suspended')}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    trailing: PopupMenuButton<String>(
                                      onSelected: (v) {
                                        if (v == 'toggle') _toggleStatus(t);
                                        if (v == 'open') {
                                          context.push('/platform/tenants/${t['id']}', extra: t);
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(value: 'open', child: Text('Open')),
                                        PopupMenuItem(
                                          value: 'toggle',
                                          child: Text(
                                            active ? 'Suspend' : 'Activate',
                                            style: TextStyle(
                                                color: active
                                                    ? AppTheme.errorColor
                                                    : AppTheme.successColor),
                                          ),
                                        ),
                                      ],
                                    ),
                                    onTap: () =>
                                        context.push('/platform/tenants/${t['id']}', extra: t),
                                  ),
                                );
                              },
                            ),
                    ),
        ),
      ],
    );
  }
}
