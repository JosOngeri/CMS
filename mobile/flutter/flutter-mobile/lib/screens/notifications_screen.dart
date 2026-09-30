import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

/// In-app notification history. Push notifications are transient — this
/// screen is the durable record (handover invites, approvals, obligations).
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  ApiService? _api;
  List<dynamic>? _items;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    _api ??= await ApiService.getInstance();
    final res = await _api!.getNotifications();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res['success'] == true) {
        _items = res['notifications'] as List? ?? [];
      } else {
        _error = res['error']?.toString() ?? 'Failed to load notifications';
      }
    });
  }

  Future<void> _markRead(Map<String, dynamic> n) async {
    if (n['is_read'] == true || n['read'] == true) return;
    final res = await _api!.markNotificationRead(n['id'].toString());
    if (res['success'] == true) _load();
  }

  IconData _iconFor(String type) {
    switch (type.toLowerCase()) {
      case 'payment':
      case 'obligation':
        return Icons.payments;
      case 'handover':
        return Icons.swap_horiz;
      case 'approval':
        return Icons.approval;
      case 'event':
        return Icons.event;
      case 'announcement':
        return Icons.campaign;
      default:
        return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _error != null
                  ? ListView(children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_error!)),
                    ])
                  : (_items == null || _items!.isEmpty)
                      ? ListView(children: const [
                          SizedBox(height: 80),
                          Center(child: Text('No notifications')),
                        ])
                      : ListView.builder(
                          itemCount: _items!.length,
                          itemBuilder: (context, i) {
                            final n = _items![i] as Map<String, dynamic>;
                            final read =
                                n['is_read'] == true || n['read'] == true;
                            final type =
                                (n['type'] ?? 'general').toString();
                            return ListTile(
                              leading: CircleAvatar(
                                backgroundColor: read
                                    ? AppTheme.textSecondary.withOpacity(0.15)
                                    : const AppTheme.primaryColor
                                        .withOpacity(0.12),
                                child: Icon(_iconFor(type),
                                    color: read
                                        ? AppTheme.textSecondary
                                        : const AppTheme.primaryColor),
                              ),
                              title: Text(
                                n['title']?.toString() ?? 'Notification',
                                style: TextStyle(
                                  fontWeight: read
                                      ? FontWeight.normal
                                      : FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                n['message']?.toString() ??
                                    n['body']?.toString() ??
                                    '',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: read
                                  ? null
                                  : const Icon(Icons.circle,
                                      size: 10, color: AppTheme.primaryColor),
                              onTap: () => _markRead(n),
                            );
                          },
                        ),
            ),
    );
  }
}
