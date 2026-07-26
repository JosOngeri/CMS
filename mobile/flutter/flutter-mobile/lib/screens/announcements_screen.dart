import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    _initApiService();
    _loadAnnouncements();
    _loadReadAnnouncements();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
  }

  Future<void> _loadReadAnnouncements() async {
    // Load read announcements from local storage
    // For now, this is a placeholder
    // TODO: Implement local storage for read announcements
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

  void _markAsRead(String announcementId) {
    setState(() {
      _readAnnouncements.add(announcementId);
    });
    // TODO: Save to local storage
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
              const Icon(Icons.priority_high, color: Colors.red),
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
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(
                _formatDate(announcement['created_at']),
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
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
                            style: const TextStyle(color: Colors.blue),
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
                        itemCount: _announcements!.length,
                        itemBuilder: (context, index) {
                          final announcement = _announcements![index];
                          final isRead = _readAnnouncements.contains(announcement['id']?.toString());
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isRead ? Colors.grey[300] : Colors.blue,
                                child: Icon(
                                  isRead ? Icons.check : Icons.announcement,
                                  color: isRead ? Colors.grey[600] : Colors.white,
                                ),
                              ),
                              title: Text(
                                announcement['title'] ?? 'Announcement',
                                style: TextStyle(
                                  fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                  color: isRead ? Colors.grey[600] : null,
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
                                        color: Colors.red,
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
              color: Colors.red,
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
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No announcements available',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for church announcements',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
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
