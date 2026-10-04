import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../app/theme.dart';
import 'platform_messages_screen.dart';

class AnnouncementsScreen extends ConsumerStatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  ConsumerState<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends ConsumerState<AnnouncementsScreen> {
  ApiService? _apiService;
  List<dynamic>? _announcements;
  Set<String> _readAnnouncements = {};
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _errorMessage;
  // null = still checking / hidden (non-admin roles get 403 and never see it)
  int? _platformUnread;

  @override
  void initState() {
    super.initState();
    _initApiService();
    _loadAnnouncements();
    _loadReadAnnouncements();
    _loadPlatformUnread();
  }

  /// Mirror of the web PlatformMessagesCard: only admin roles can see the
  /// church <-> platform thread; a 403/401 hides the banner entirely.
  Future<void> _loadPlatformUnread() async {
    final api = await ApiService.getInstance();
    try {
      final res = await api.dio.get('/platform-messages/unread-count');
      if (!mounted) return;
      setState(() {
        _platformUnread = (res.data['data']?['n'] as num?)?.toInt() ?? 0;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _platformUnread = null);
    }
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
  }

  Future<void> _loadReadAnnouncements() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getStringList('read_announcements') ?? [];
    setState(() {
      _readAnnouncements = saved.toSet();
    });
  }

  Future<void> _loadAnnouncements() async {
    if (_isRefreshing) {
      setState(() {
        _isRefreshing = false;
      });
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      if (_apiService == null) {
        await _initApiService();
      }
      final response = await _apiService!.dio.get('/announcements/public?limit=20');
      if (response.statusCode == 200) {
        setState(() {
          _announcements = response.data['announcements'] ?? [];
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load announcements. Please check your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  Future<void> _refreshAnnouncements() async {
    setState(() {
      _isRefreshing = true;
    });
    await _loadAnnouncements();
  }

  Future<void> _markAsRead(String announcementId) async {
    if (announcementId.isEmpty) return;
    setState(() {
      _readAnnouncements.add(announcementId);
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('read_announcements', _readAnnouncements.toList());
  }

  void _showAnnouncementDetail(Map<String, dynamic> announcement) {
    _markAsRead(announcement['id']?.toString() ?? '');
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Expanded(
              child: Text(
                announcement['title'] ?? 'Announcement',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            if (announcement['priority'] == 'urgent')
              const Icon(Icons.priority_high, color: AppTheme.errorColor),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (announcement['author'] != null) ...[
                Text(
                  'By: ${announcement['author']}',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(
                _formatDate(announcement['created_at']),
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textTertiary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                announcement['content'] ?? '',
                style: const TextStyle(fontSize: 14),
              ),
              if (announcement['attachments'] != null && announcement['attachments'].isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Attachments:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...List.generate(
                  announcement['attachments'].length,
                  (index) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.attach_file, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            announcement['attachments'][index]['name'] ?? 'Attachment',
                            style: const TextStyle(color: AppTheme.primaryColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcements'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshAnnouncements,
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _errorMessage != null
              ? _buildErrorState()
              : _announcements == null || _announcements!.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _refreshAnnouncements,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _announcements!.length + (_platformUnread != null ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_platformUnread != null && index == 0) {
                            return _buildPlatformBanner();
                          }
                          final announcement = _announcements![
                              index - (_platformUnread != null ? 1 : 0)];
                          final isRead = _readAnnouncements.contains(announcement['id']?.toString());
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isRead ? AppTheme.dividerColor : AppTheme.primaryColor,
                                child: Icon(
                                  isRead ? Icons.check : Icons.announcement,
                                  color: isRead ? AppTheme.textSecondary : Colors.white,
                                ),
                              ),
                              title: Text(
                                announcement['title'] ?? 'Announcement',
                                style: TextStyle(
                                  fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                  color: isRead ? AppTheme.textSecondary : null,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatDate(announcement['created_at']),
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  if (announcement['priority'] == 'urgent')
                                    const Text(
                                      'Urgent',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.errorColor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                ],
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => _showAnnouncementDetail(announcement),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  Widget _buildPlatformBanner() {
    final unread = _platformUnread ?? 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.primaryColor,
          child: const Icon(Icons.support_agent, color: Colors.white),
        ),
        title: const Text(
          'Platform Support',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          unread > 0 ? '$unread unread message${unread == 1 ? '' : 's'}'
                     : 'Direct line to the Msabato team',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: unread > 0
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              )
            : const Icon(Icons.chevron_right),
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const PlatformMessagesScreen(),
            ),
          );
          _loadPlatformUnread();
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading announcements...'),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: AppTheme.errorColor,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadAnnouncements,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.campaign,
              size: 64,
              color: AppTheme.textTertiary,
            ),
            const SizedBox(height: 16),
            Text(
              'No announcements available',
              style: TextStyle(
                fontSize: 18,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for church announcements',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);
      
      if (difference.inDays == 0) {
        return 'Today';
      } else if (difference.inDays == 1) {
        return 'Yesterday';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} days ago';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateString;
    }
  }
}
