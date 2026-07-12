import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _stats;
  List<dynamic>? _activities;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Load stats
      final statsResponse = await _apiService.dio.get('/dashboard/stats');
      if (statsResponse.statusCode == 200) {
        setState(() {
          _stats = statsResponse.data['stats'];
        });
      }

      // Load activities
      final activityResponse = await _apiService.dio.get('/dashboard/activity?limit=10');
      if (activityResponse.statusCode == 200) {
        setState(() {
          _activities = activityResponse.data['activities'];
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load dashboard data';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_errorMessage!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDashboardData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDashboardData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_stats != null) _buildStatsCards(),
                        const SizedBox(height: 24),
                        if (_activities != null && _activities!.isNotEmpty)
                          _buildRecentActivities()
                        else
                          const Text('No recent activities'),
                      ],
                    ),
                  ),
                ),
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
    return Card(
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
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: _getActivityIcon(activity['type']),
                title: Text(activity['title'] ?? 'Activity'),
                subtitle: Text(activity['description'] ?? ''),
                trailing: Text(activity['time'] ?? ''),
              ),
            );
          },
        ),
      ],
    );
  }

  Icon _getActivityIcon(String? type) {
    switch (type) {
      case 'payment':
        return const Icon(Icons.attach_money, color: Colors.green);
      case 'announcement':
        return const Icon(Icons.campaign, color: Colors.blue);
      case 'event':
        return const Icon(Icons.event, color: Colors.purple);
      default:
        return const Icon(Icons.info, color: Colors.grey);
    }
  }
}
