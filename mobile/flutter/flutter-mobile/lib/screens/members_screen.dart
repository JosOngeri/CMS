import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  ApiService? _apiService;
  List<dynamic>? _members;
  bool _isLoading = true;
  String? _errorMessage;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadMembers();
  }

  Future<void> _loadMembers() async {
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
      final result = await _apiService!.getMembers(
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );
      if (result['success'] == true) {
        setState(() {
          _members = result['members'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load members';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load members. Please check your connection.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Members'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadMembers,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          _loadMembers();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onSubmitted: (value) {
                setState(() => _searchQuery = value.trim());
                _loadMembers();
              },
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading members...'),
                ],
              ),
            )
          : _errorMessage != null
              ? _buildErrorState()
              : _members == null || _members!.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadMembers,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _members!.length,
                        itemBuilder: (context, index) =>
                            _buildMemberCard(_members![index]),
                      ),
                    ),
    );
  }

  Widget _buildMemberCard(Map<String, dynamic> member) {
    final name = '${member['first_name'] ?? ''} ${member['last_name'] ?? ''}'.trim();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary,
          child: Text(
            name.isNotEmpty ? name[0].toUpperCase() : '?',
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(name.isEmpty ? 'Unknown' : name),
        subtitle: Text(
          [
            if (member['membership_number'] != null) member['membership_number'],
            if (member['gender'] != null) member['gender'],
            if (member['membership_status'] != null) member['membership_status'],
          ].join(' • '),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _showMemberDetails(member),
      ),
    );
  }

  void _showMemberDetails(Map<String, dynamic> member) {
    final name = '${member['first_name'] ?? ''} ${member['last_name'] ?? ''}'.trim();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.85,
        expand: false,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: CircleAvatar(
                radius: 36,
                backgroundColor: Theme.of(context).colorScheme.primary,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(color: Colors.white, fontSize: 28),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                name.isEmpty ? 'Unknown' : name,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 20),
            _detailRow(Icons.badge, 'Membership No.', member['membership_number']),
            _detailRow(Icons.email, 'Email', member['email']),
            _detailRow(Icons.phone, 'Phone', member['phone']),
            _detailRow(Icons.cake, 'Date of Birth', _formatDate(member['date_of_birth'])),
            _detailRow(Icons.wc, 'Gender', member['gender']),
            _detailRow(Icons.favorite, 'Marital Status', member['marital_status']),
            _detailRow(Icons.work, 'Occupation', member['occupation']),
            _detailRow(Icons.calendar_today, 'Joined', _formatDate(member['joined_date'])),
            _detailRow(Icons.water_drop, 'Baptized', _formatDate(member['baptism_date'])),
            _detailRow(Icons.verified_user, 'Status', member['membership_status']),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, dynamic value) {
    if (value == null || value.toString().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text('$label: ', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
          Expanded(
            child: Text(
              value.toString(),
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  String? _formatDate(dynamic dateString) {
    if (dateString == null) return null;
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
              onPressed: _loadMembers,
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
            Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No members match "$_searchQuery"' : 'No members found',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Pull down to refresh',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }
}
