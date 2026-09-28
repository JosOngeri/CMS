import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';

class DepartmentsScreen extends StatefulWidget {
  const DepartmentsScreen({super.key});

  @override
  State<DepartmentsScreen> createState() => _DepartmentsScreenState();
}

class _DepartmentsScreenState extends State<DepartmentsScreen> {
  ApiService? _apiService;
  List<dynamic>? _departments;
  List<dynamic>? _allDepartments;
  final Set<String> _requestedIds = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadDepartments();
  }

  Future<void> _loadDepartments() async {
    if (_apiService == null) {
      setState(() {
        _errorMessage = 'Service not initialized';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await _apiService!.getMyDepartments();
      final allResult = await _apiService!.getAllDepartments();
      if (result['success'] == true) {
        setState(() {
          _departments = result['departments'] ?? [];
          _allDepartments = allResult['departments'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load departments';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load departments. Please check your connection.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Departments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadDepartments,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading departments...'),
                ],
              ),
            )
          : _errorMessage != null
              ? _buildErrorState()
              : RefreshIndicator(
              onRefresh: _loadDepartments,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('My Departments',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_departments == null || _departments!.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('You have not joined any departments yet'),
                    )
                  else
                    ..._departments!.map((d) => _buildDepartmentCard(d)),
                  const SizedBox(height: 24),
                  const Text('All Departments',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_allDepartments != null)
                    ..._allDepartments!.map((d) => _buildBrowseCard(d)),
                ],
              ),
            ),
    );
  }

  Set<String> get _myDeptIds =>
      {for (final d in _departments ?? []) '${d['id']}'};

  Future<void> _requestJoin(Map<String, dynamic> dept) async {
    final id = '${dept['id']}';
    setState(() => _requestedIds.add(id));
    final res = await _apiService!.joinDepartment(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'Join request sent to ${dept['name']}'
            : (res['error'] ?? 'Request failed')),
      ));
      if (res['success'] != true) setState(() => _requestedIds.remove(id));
    }
  }

  Widget _buildBrowseCard(Map<String, dynamic> dept) {
    final id = '${dept['id']}';
    final isMember = _myDeptIds.contains(id);
    final requested = _requestedIds.contains(id);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.groups_outlined),
        title: Text(dept['name'] ?? 'Department'),
        subtitle: Text(
          [
            if (dept['category'] != null) dept['category'],
            if (dept['dept_type'] != null) dept['dept_type'],
          ].join('  ·  '),
        ),
        trailing: isMember
            ? const Chip(label: Text('Member'), visualDensity: VisualDensity.compact)
            : requested
                ? const Chip(label: Text('Pending'), visualDensity: VisualDensity.compact)
                : TextButton(
                    onPressed: () => _requestJoin(dept),
                    child: const Text('Request to join'),
                  ),
        onTap: () => context.push('/departments/$id', extra: dept),
      ),
    );
  }

  Widget _buildDepartmentCard(Map<String, dynamic> department) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () =>
            context.push('/departments/${department['id']}', extra: department),
        child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: const Icon(Icons.groups, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        department['name'] ?? 'Department',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (department['category'] != null)
                        Text(
                          department['category'],
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
                if (department['role_in_department'] != null)
                  Chip(
                    label: Text(
                      department['role_in_department'],
                      style: const TextStyle(fontSize: 11),
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            if (department['description'] != null &&
                department['description'].toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                department['description'],
                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
              ),
            ],
            if (department['joined_at'] != null) ...[
              const SizedBox(height: 8),
              Text(
                'Member since ${_formatDate(department['joined_at'])}',
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
            ],
          ],
        ),
        ),
      ),
    );
  }

  String _formatDate(dynamic dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString.toString());
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString.toString();
    }
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadDepartments,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

}
