import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/pull_sync_service.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  ApiService? _apiService;
  final PullSyncService _pullSyncService = PullSyncService();
  Map<String, dynamic>? _stats;
  List<dynamic>? _activities;
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _errorMessage;
  
  @override
  void initState() {
    super.initState();
    _initApiService();
    _pullSyncService.startPolling();
  }

  @override
  void dispose() {
    _pullSyncService.dispose();
    super.dispose();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    if (_apiService == null) {
      setState(() {
        _errorMessage = 'Service not initialized';
        _isLoading = false;
      });
      return;
    }

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
      final result = await _apiService!.getDashboardData();
      
      if (result['success']) {
        final data = result['data'];
        setState(() {
          _stats = data['stats'];
          _activities = data['activities'];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load dashboard data';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load dashboard data. Please check your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  Future<void> _refreshData() async {
    setState(() {
      _isRefreshing = true;
    });
    await _loadDashboardData();
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
    final user = ref.watch(userProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshData,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _errorMessage != null
              ? _buildErrorState()
              : RefreshIndicator(
                  onRefresh: _refreshData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildWelcomeHeader(user),
                        const SizedBox(height: 24),
                        if (_stats != null) _buildStatsCards(),
                        const SizedBox(height: 24),
                        if (_activities != null && _activities!.isNotEmpty)
                          _buildRecentActivities()
                        else
                          _buildEmptyActivitiesState(),
                      ],
                    ),
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
          Text('Loading dashboard...'),
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
              onPressed: _loadDashboardData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(Map<String, dynamic>? user) {
    final firstName = user?['first_name'] ?? 'Member';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome back, $firstName!',
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Here\'s what\'s happening with your church',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsCards() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Total Members',
          '${_stats!['totalMembers'] ?? 0}',
          Icons.people,
          Colors.blue,
        ),
        _buildStatCard(
          'Total Payments',
          'KES ${_stats!['totalPayments'] ?? 0}',
          Icons.payments,
          Colors.green,
        ),
        _buildStatCard(
          'Upcoming Events',
          '${_stats!['upcomingEvents'] ?? 0}',
          Icons.event,
          Colors.purple,
        ),
        _buildStatCard(
          'Announcements',
          '${_stats!['recentAnnouncements'] ?? 0}',
          Icons.announcement,
          Colors.orange,
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Semantics(
      label: '$title: $value',
      value: value,
      hint: 'Statistics card showing $title',
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: const TextStyle(fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentActivities() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Activities',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _activities!.length,
          itemBuilder: (context, index) {
            final activity = _activities![index];
            return _buildActivityItem(activity);
          },
        ),
      ],
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity) {
    final type = activity['type'] as String?;
    final description = activity['description'] as String?;
    final createdAt = activity['created_at'] as String?;
    
    IconData icon;
    Color color;
    
    switch (type) {
      case 'payment':
        icon = Icons.payment;
        color = Colors.green;
        break;
      case 'announcement':
        icon = Icons.announcement;
        color = Colors.orange;
        break;
      case 'event':
        icon = Icons.event;
        color = Colors.purple;
        break;
      default:
        icon = Icons.info;
        color = Colors.blue;
    }
    
    return Semantics(
      label: 'Activity: $description',
      hint: 'Recent activity item',
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          leading: Icon(icon, color: color),
          title: Text(description ?? 'Unknown activity'),
          subtitle: Text(createdAt ?? 'Unknown time'),
        ),
      ),
    );
  }

  Widget _buildEmptyActivitiesState() {
    return Semantics(
      label: 'No recent activities',
      hint: 'Empty state for activities',
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(
                Icons.inbox,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No recent activities',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}