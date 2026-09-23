import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  ApiService? _apiService;
  List<dynamic>? _approvals;
  bool _isLoading = true;
  String? _errorMessage;
  String _filter = 'pending';
  final Set<String> _processing = {};

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadApprovals();
  }

  Future<void> _loadApprovals() async {
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
      final result = await _apiService!.getApprovals(
        status: _filter == 'all' ? null : _filter,
      );
      if (result['success'] == true) {
        setState(() {
          _approvals = result['approvals'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load approvals';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load approvals. Please check your connection.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleAction(Map<String, dynamic> approval, bool approve) async {
    final id = approval['id']?.toString();
    if (id == null || _apiService == null) return;

    setState(() => _processing.add(id));

    final result = approve
        ? await _apiService!.approveRequest(id)
        : await _apiService!.rejectRequest(id);

    if (!mounted) return;
    setState(() => _processing.remove(id));

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approve ? 'Request approved' : 'Request rejected')),
      );
      _loadApprovals();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error'] ?? 'Action failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Approvals'),
        actions: [
          PopupMenuButton<String>(
            initialValue: _filter,
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _filter = value);
              _loadApprovals();
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'pending', child: Text('Pending')),
              PopupMenuItem(value: 'approved', child: Text('Approved')),
              PopupMenuItem(value: 'rejected', child: Text('Rejected')),
              PopupMenuItem(value: 'all', child: Text('All')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadApprovals,
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
                  Text('Loading approvals...'),
                ],
              ),
            )
          : _errorMessage != null
              ? _buildErrorState()
              : _approvals == null || _approvals!.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadApprovals,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _approvals!.length,
                        itemBuilder: (context, index) =>
                            _buildApprovalCard(_approvals![index]),
                      ),
                    ),
    );
  }

  Widget _buildApprovalCard(Map<String, dynamic> approval) {
    final id = approval['id']?.toString() ?? '';
    final status = (approval['status'] ?? 'pending').toString();
    final isPending = status == 'pending';
    final busy = _processing.contains(id);

    Color statusColor;
    switch (status) {
      case 'approved':
        statusColor = Colors.green;
        break;
      case 'rejected':
        statusColor = Colors.red;
        break;
      default:
        statusColor = Colors.orange;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    approval['title'] ?? approval['request_type'] ?? 'Request',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Chip(
                  label: Text(
                    status.toUpperCase(),
                    style: const TextStyle(fontSize: 11, color: Colors.white),
                  ),
                  backgroundColor: statusColor,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (approval['description'] != null &&
                approval['description'].toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                approval['description'],
                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              [
                if (approval['request_type'] != null) 'Type: ${approval['request_type']}',
                if (approval['created_at'] != null)
                  'Submitted ${_formatDate(approval['created_at'])}',
              ].join(' • '),
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
            ),
            if (isPending) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: busy ? null : () => _handleAction(approval, false),
                    icon: const Icon(Icons.close, color: Colors.red),
                    label: const Text('Reject', style: TextStyle(color: Colors.red)),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: busy ? null : () => _handleAction(approval, true),
                    icon: busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check),
                    label: const Text('Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ],
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
              onPressed: _loadApprovals,
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
            Icon(Icons.check_circle_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _filter == 'pending' ? 'No pending approvals' : 'No $_filter approvals',
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
