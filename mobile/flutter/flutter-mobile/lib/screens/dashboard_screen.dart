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
  Map<String, dynamic>? _roleData;
  List<dynamic>? _transactions;
  List<dynamic>? _activities;
  dynamic _unreadNotifications;
  dynamic _pendingApprovals;
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
        // API wraps the payload as data.data.stats — unwrap until stats found
        dynamic data = result['data'];
        while (data is Map && data['stats'] == null && data['data'] is Map) {
          data = data['data'];
        }
        setState(() {
          _stats = data is Map ? data['stats'] : null;
          _unreadNotifications = data is Map && data['notifications'] is Map
              ? data['notifications']['unread']
              : null;
          _pendingApprovals = data is Map && data['approvals'] is Map
              ? data['approvals']['pending']
              : null;
          _activities = data is Map ? data['activities'] : null;
        });

        await _loadRoleData();
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
            icon: Badge(
              isLabelVisible:
                  (int.tryParse('${_unreadNotifications ?? 0}') ?? 0) > 0,
              label: Text('${_unreadNotifications ?? 0}'),
              child: const Icon(Icons.notifications_outlined),
            ),
            onPressed: () => context.push('/notifications'),
          ),
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
                        if (_stats != null) _buildStatsCards(user),
                        const SizedBox(height: 24),
                        _buildDepartmentsHero(),
                        if (_primaryRole(user) == 'Treasurer' &&
                            _transactions != null &&
                            _transactions!.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          _buildRecentTransactions(),
                        ],
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
    final firstName = user?['firstName'] ?? user?['first_name'] ?? 'Member';
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

  /// Departments centre-stage: my departments strip + finance shortcuts.
  Widget _buildDepartmentsHero() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('My Departments',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            TextButton(
              onPressed: () => context.push('/departments'),
              child: const Text('See all'),
            ),
          ],
        ),
        FutureBuilder<Map<String, dynamic>>(
          future: _apiService?.getMyDepartments() ??
              Future.value({'success': false}),
          builder: (context, snap) {
            if (!snap.hasData) {
              return const SizedBox(
                  height: 96,
                  child: Center(child: CircularProgressIndicator()));
            }
            final depts = snap.data?['departments'] as List? ?? [];
            if (snap.data?['success'] != true || depts.isEmpty) {
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.groups),
                  title: const Text('Browse departments'),
                  subtitle: const Text('Join a department to get involved'),
                  onTap: () => context.push('/departments'),
                ),
              );
            }
            return SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: depts.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final d = depts[i] as Map<String, dynamic>;
                  return SizedBox(
                    width: 180,
                    child: Card(
                      child: InkWell(
                        onTap: () => context.push('/departments/${d['id']}',
                            extra: d),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                d['name']?.toString() ?? 'Department',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              Text(
                                (d['role_in_department'] ?? d['role'] ?? 'member')
                                    .toString(),
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.task_alt, size: 18),
                label: const Text('My Obligations'),
                onPressed: () => context.push('/obligations'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.swap_horiz, size: 18),
                label: const Text('Handovers'),
                onPressed: () => context.push('/handovers'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// The user's highest-privilege role determines which dashboard they see.
  String _primaryRole(Map<String, dynamic>? user) {
    const precedence = [
      'Super Admin',
      'Treasurer',
      'Pastor',
      'Department Head',
      'First Elder',
    ];
    final roles = (user?['roles'] as List?)?.map((e) => e.toString()).toList() ?? [];
    for (final role in precedence) {
      if (roles.contains(role)) return role;
    }
    return 'Member';
  }

  /// Fetch the extra metrics this role's dashboard needs.
  Future<void> _loadRoleData() async {
    if (_apiService == null) return;
    final role = _primaryRole(ref.read(userProvider));
    try {
      switch (role) {
        case 'Super Admin':
          final r = await _apiService!.dio.get('/dashboard/system-health');
          _roleData = Map<String, dynamic>.from(r.data['data'] ?? {});
          break;
        case 'Pastor':
        case 'First Elder':
          final r = await _apiService!.dio.get('/dashboard/ministry-health');
          _roleData = Map<String, dynamic>.from(r.data['data'] ?? {});
          break;
        case 'Treasurer':
          final stats = await _apiService!.dio.get('/dashboard/financial-stats');
          final health = await _apiService!.dio.get('/dashboard/financial-health');
          final tx = await _apiService!.dio.get('/dashboard/transactions',
              queryParameters: {'limit': 5});
          _roleData = {
            ...Map<String, dynamic>.from(stats.data['data'] ?? {}),
            ...Map<String, dynamic>.from(health.data['data'] ?? {}),
          };
          _transactions = tx.data['data'] as List? ?? [];
          break;
        case 'Department Head':
          final stats = await _apiService!.dio.get('/dashboard/department-stats');
          final health = await _apiService!.dio.get('/dashboard/department-health');
          _roleData = {
            ...Map<String, dynamic>.from(stats.data['data'] ?? {}),
            ...Map<String, dynamic>.from(health.data['data'] ?? {}),
          };
          break;
      }
    } catch (_) {
      // Role metrics are additive — keep base stats even if they fail
    }
    if (mounted) setState(() {});
  }

  Widget _buildStatsCards(Map<String, dynamic>? user) {
    final role = _primaryRole(user);
    final children = _cardsForRole(role);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (role != 'Member')
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              '$role Dashboard',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
                letterSpacing: 0.5,
              ),
            ),
          ),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.5,
          children: children,
        ),
      ],
    );
  }

  List<Widget> _cardsForRole(String role) {
    switch (role) {
      case 'Member':
        return _memberCards();
      case 'Super Admin':
        return _superAdminCards();
      case 'Pastor':
      case 'First Elder':
        return _pastorCards();
      case 'Treasurer':
        return _treasurerCards();
      case 'Department Head':
        return _departmentHeadCards();
      default:
        return _memberCards();
    }
  }

  List<Widget> _memberCards() {
    return [
      _buildStatCard(
        'My Contributions',
        'KES ${_stats!['personal_contributions'] ?? 0}',
        Icons.volunteer_activism,
        Colors.green,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'My Departments',
        '${_stats!['my_departments'] ?? 0}',
        Icons.groups,
        Colors.teal,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Upcoming Events',
        '${_stats!['upcoming_events'] ?? 0}',
        Icons.event,
        Colors.blue,
        onTap: () => context.go('/events'),
      ),
      _buildStatCard(
        'Unread Notices',
        '${_stats!['unread_announcements'] ?? _unreadNotifications ?? 0}',
        Icons.notifications,
        Colors.orange,
        onTap: () => context.push('/announcements'),
      ),
    ];
  }

  List<Widget> _superAdminCards() {
    return [
      _buildStatCard(
        'Total Members',
        '${_stats!['total_members'] ?? 0}',
        Icons.people,
        Colors.blue,
        onTap: () => context.push('/members'),
      ),
      _buildStatCard(
        'Departments',
        '${_stats!['total_departments'] ?? 0}',
        Icons.groups,
        Colors.teal,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Financial Overview',
        'KES ${_stats!['total_payments'] ?? _stats!['monthly_income'] ?? 0}',
        Icons.account_balance,
        Colors.green,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'Pending Approvals',
        '${_pendingApprovals ?? 0}',
        Icons.approval,
        Colors.purple,
        onTap: () => context.push('/approvals'),
      ),
      _buildStatCard(
        'System Health',
        (_roleData?['database'] == 'healthy' && _roleData?['api'] == 'healthy')
            ? 'Healthy'
            : 'Degraded',
        Icons.monitor_heart,
        (_roleData?['database'] == 'healthy') ? Colors.green : Colors.red,
      ),
      _buildStatCard(
        'Active Users',
        '${_roleData?['activeUsers'] ?? 0}',
        Icons.people_alt,
        Colors.indigo,
        onTap: () => context.push('/members'),
      ),
    ];
  }

  List<Widget> _pastorCards() {
    return [
      _buildStatCard(
        'Total Members',
        '${_stats!['total_members'] ?? 0}',
        Icons.people,
        Colors.blue,
        onTap: () => context.push('/members'),
      ),
      _buildStatCard(
        'Member Engagement',
        '${_roleData?['memberEngagement'] ?? 0}%',
        Icons.volunteer_activism,
        Colors.teal,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Spiritual Growth',
        '${_roleData?['spiritualGrowth'] ?? 0}%',
        Icons.self_improvement,
        Colors.indigo,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Dept Activity',
        '${_roleData?['departmentActivity'] ?? 0}%',
        Icons.groups,
        Colors.orange,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Upcoming Events',
        '${_stats!['upcoming_events'] ?? 0}',
        Icons.event,
        Colors.blue,
        onTap: () => context.go('/events'),
      ),
      _buildStatCard(
        'Pending Approvals',
        '${_pendingApprovals ?? 0}',
        Icons.approval,
        Colors.purple,
        onTap: () => context.push('/approvals'),
      ),
    ];
  }

  List<Widget> _treasurerCards() {
    return [
      _buildStatCard(
        'Total Balance',
        'KES ${_roleData?['total_balance'] ?? 0}',
        Icons.account_balance_wallet,
        Colors.green,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'Income (Month)',
        'KES ${_roleData?['monthly_income'] ?? 0}',
        Icons.trending_up,
        Colors.teal,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'Expenses (Month)',
        'KES ${_roleData?['monthly_expenses'] ?? 0}',
        Icons.trending_down,
        Colors.red,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'Pending Payments',
        '${_roleData?['pending_payments'] ?? 0}',
        Icons.pending_actions,
        Colors.orange,
        onTap: () => context.go('/payments'),
      ),
      _buildStatCard(
        'Budget Used',
        '${_roleData?['budgetUtilization'] ?? 0}%',
        Icons.pie_chart,
        Colors.blue,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Collection Rate',
        '${_roleData?['collectionRate'] ?? 0}%',
        Icons.savings,
        Colors.indigo,
        onTap: () => context.go('/payments'),
      ),
    ];
  }

  List<Widget> _departmentHeadCards() {
    return [
      _buildStatCard(
        'Dept Members',
        '${_roleData?['department_members'] ?? 0}',
        Icons.people,
        Colors.blue,
        onTap: () => context.push('/members'),
      ),
      _buildStatCard(
        'Pending Tasks',
        '${_roleData?['pending_tasks'] ?? 0}',
        Icons.task_alt,
        Colors.orange,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Dept Events',
        '${_roleData?['department_events'] ?? 0}',
        Icons.event,
        Colors.teal,
        onTap: () => context.go('/events'),
      ),
      _buildStatCard(
        'Dept Budget',
        'KES ${_roleData?['department_budget'] ?? 0}',
        Icons.account_balance,
        Colors.green,
        onTap: () => context.push('/departments'),
      ),
      _buildStatCard(
        'Task Completion',
        '${_roleData?['taskCompletionRate'] ?? 0}%',
        Icons.check_circle,
        Colors.indigo,
      ),
      _buildStatCard(
        'Participation',
        '${_roleData?['memberParticipationCount'] ?? 0}',
        Icons.how_to_reg,
        Colors.teal,
        onTap: () => context.push('/departments'),
      ),
    ];
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color,
      {VoidCallback? onTap}) {
    return Semantics(
      label: '$title: $value',
      value: value,
      hint: 'Statistics card showing $title. Tap for details.',
      button: onTap != null,
      child: Card(
        elevation: 2,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        style: const TextStyle(fontSize: 12),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (onTap != null) ...[
                      const SizedBox(width: 2),
                      Icon(Icons.chevron_right, size: 14, color: Colors.grey[400]),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Transactions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () => context.go('/payments'),
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _transactions!.length,
          itemBuilder: (context, index) {
            final tx = _transactions![index];
            final isIncome = tx['transaction_type'] == 'income';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                leading: CircleAvatar(
                  backgroundColor:
                      isIncome ? Colors.green.shade50 : Colors.red.shade50,
                  child: Icon(
                    isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                    color: isIncome ? Colors.green : Colors.red,
                    size: 18,
                  ),
                ),
                title: Text(
                  tx['description'] ??
                      '${isIncome ? 'Income' : 'Expense'} transaction',
                  style: const TextStyle(fontSize: 14),
                ),
                subtitle: Text(
                  _formatTxDate(tx['transaction_date'] ?? tx['created_at']),
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                trailing: Text(
                  '${isIncome ? '+' : '-'} KES ${tx['amount']}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isIncome ? Colors.green : Colors.red,
                  ),
                ),
                onTap: () => context.go('/payments'),
              ),
            );
          },
        ),
      ],
    );
  }

  String _formatTxDate(dynamic dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString.toString());
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateString.toString();
    }
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
    String? route;

    switch (type) {
      case 'payment':
        icon = Icons.payment;
        color = Colors.green;
        route = '/payments';
        break;
      case 'announcement':
        icon = Icons.announcement;
        color = Colors.orange;
        route = '/announcements';
        break;
      case 'event':
        icon = Icons.event;
        color = Colors.purple;
        route = '/events';
        break;
      default:
        icon = Icons.info;
        color = Colors.blue;
    }

    return Semantics(
      label: 'Activity: $description',
      hint: route != null ? 'Recent activity item. Tap to view.' : 'Recent activity item',
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          leading: Icon(icon, color: color),
          title: Text(description ?? 'Unknown activity'),
          subtitle: Text(createdAt ?? 'Unknown time'),
          trailing: route != null
              ? Icon(Icons.chevron_right, color: Colors.grey[400])
              : null,
          onTap: route != null ? () => context.go(route!) : null,
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