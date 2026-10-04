import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

/// Chat thread between this church's admins and the Msabato platform
/// team — the mobile mirror of the web PlatformMessagesCard.
/// Opened from the banner on AnnouncementsScreen (admin roles only).
class PlatformMessagesScreen extends ConsumerStatefulWidget {
  const PlatformMessagesScreen({super.key});

  @override
  ConsumerState<PlatformMessagesScreen> createState() =>
      _PlatformMessagesScreenState();
}

class _PlatformMessagesScreenState
    extends ConsumerState<PlatformMessagesScreen> {
  ApiService? _api;
  final TextEditingController _draft = TextEditingController();
  final ScrollController _scroll = ScrollController();

  List<dynamic> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _draft.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    _api ??= await ApiService.getInstance();
    final res = await _api!.getPlatformMessages();
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() {
        _messages = res['data'] as List<dynamic>;
        _isLoading = false;
      });
      _scrollToEnd();
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Failed to load messages';
        _isLoading = false;
      });
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    });
  }

  Future<void> _send() async {
    final body = _draft.text.trim();
    if (body.isEmpty || _isSending) return;
    setState(() => _isSending = true);
    _api ??= await ApiService.getInstance();
    final res = await _api!.sendPlatformMessage(body);
    if (!mounted) return;
    if (res['success'] == true) {
      _draft.clear();
      setState(() {
        _messages = [..._messages, res['data']];
        _isSending = false;
      });
      _scrollToEnd();
    } else {
      setState(() => _isSending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['error'] ?? 'Failed to send'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Platform Support', style: TextStyle(fontSize: 18)),
            Text('Direct line to the Msabato team',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? _buildError()
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: _messages.isEmpty
                            ? ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: const [
                                  SizedBox(height: 120),
                                  Icon(Icons.support_agent,
                                      size: 64,
                                      color: AppTheme.textTertiary),
                                  SizedBox(height: 16),
                                  Center(
                                    child: Text(
                                      'No messages yet — say hello if you need a hand.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                          color: AppTheme.textSecondary),
                                    ),
                                  ),
                                ],
                              )
                            : ListView.builder(
                                controller: _scroll,
                                padding: const EdgeInsets.all(16),
                                itemCount: _messages.length,
                                itemBuilder: (context, index) =>
                                    _buildBubble(_messages[index]),
                              ),
                      ),
          ),
          _buildComposer(),
        ],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> m) {
    final isPlatform = m['sender_type'] == 'platform';
    return Align(
      alignment: isPlatform ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isPlatform ? AppTheme.primaryLight : AppTheme.dividerColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isPlatform ? 4 : 16),
            bottomRight: Radius.circular(isPlatform ? 16 : 4),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              m['body'] ?? '',
              style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              '${isPlatform ? "Platform · ${m['sender_label']}" : 'You'} · ${_fmtTime(m['created_at'])}',
              style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComposer() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: const BoxDecoration(
          color: AppTheme.surfaceColor,
          border: Border(top: BorderSide(color: AppTheme.dividerColor)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _draft,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Write to the platform team…',
                  filled: true,
                  fillColor: AppTheme.backgroundColor,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: AppTheme.primaryColor,
              child: IconButton(
                icon: _isSending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send, color: Colors.white, size: 20),
                onPressed: _isSending ? null : _send,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline,
              size: 64, color: AppTheme.errorColor),
          const SizedBox(height: 16),
          Text(_errorMessage!),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }

  String _fmtTime(String? ts) {
    if (ts == null) return '';
    try {
      final d = DateTime.parse(ts).toLocal();
      final now = DateTime.now();
      if (d.year == now.year && d.month == now.month && d.day == now.day) {
        return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
      }
      return '${d.day}/${d.month} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}
