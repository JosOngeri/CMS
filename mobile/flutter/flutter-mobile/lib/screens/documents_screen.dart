import 'package:flutter/material.dart';
import '../services/api_service.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  ApiService? _apiService;
  List<dynamic>? _documents;
  bool _isLoading = true;
  String? _errorMessage;
  final Set<String> _downloading = {};

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
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
      final result = await _apiService!.getDocuments();
      if (result['success'] == true) {
        setState(() {
          _documents = result['documents'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load documents';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load documents. Please check your connection.';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _download(Map<String, dynamic> document) async {
    final documentId = document['id']?.toString();
    if (documentId == null || _downloading.contains(documentId)) return;

    final fileName = document['name'] ?? document['title'] ?? 'document';
    setState(() => _downloading.add(documentId));

    try {
      final result = await _apiService!.downloadDocument(documentId, fileName);
      if (!mounted) return;

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Saved to ${result['path']}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        _showErrorSnackBar(result['error'] ?? 'Download failed');
      }
    } catch (e) {
      _showErrorSnackBar('Download failed');
    } finally {
      if (mounted) {
        setState(() => _downloading.remove(documentId));
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  IconData _iconForCategory(String? category) {
    switch (category?.toLowerCase()) {
      case 'quarterly':
      case 'sabbath school':
        return Icons.menu_book;
      case 'bulletin':
        return Icons.newspaper;
      case 'policy':
      case 'policies':
        return Icons.policy;
      default:
        return Icons.description;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadDocuments,
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
                  Text('Loading documents...'),
                ],
              ),
            )
          : _errorMessage != null
              ? _buildErrorState()
              : _documents == null || _documents!.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadDocuments,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _documents!.length,
                        itemBuilder: (context, index) =>
                            _buildDocumentTile(_documents![index]),
                      ),
                    ),
    );
  }

  Widget _buildDocumentTile(Map<String, dynamic> document) {
    final documentId = document['id']?.toString() ?? '';
    final isDownloading = _downloading.contains(documentId);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.blue[50],
          child: Icon(
            _iconForCategory(document['category']),
            color: Colors.blue,
          ),
        ),
        title: Text(document['name'] ?? document['title'] ?? 'Document'),
        subtitle: Text(
          [
            if (document['category'] != null) document['category'],
            if (document['created_at'] != null) _formatDate(document['created_at']),
          ].join(' • '),
          style: const TextStyle(fontSize: 12),
        ),
        trailing: isDownloading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : IconButton(
                icon: const Icon(Icons.download),
                onPressed: () => _download(document),
              ),
      ),
    );
  }

  String _formatDate(dynamic dateString) {
    try {
      final date = DateTime.parse(dateString.toString());
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return '';
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
              onPressed: _loadDocuments,
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
            Icon(Icons.folder_open, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No documents available',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Quarterlies, bulletins and policies will appear here',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }
}
