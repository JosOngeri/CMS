import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/config.dart';

class ServerUrlScreen extends StatefulWidget {
  const ServerUrlScreen({super.key});

  @override
  State<ServerUrlScreen> createState() => _ServerUrlScreenState();
}

class _ServerUrlScreenState extends State<ServerUrlScreen> {
  final _urlController = TextEditingController();
  static const String _savedUrlKey = 'saved_api_url';

  @override
  void initState() {
    super.initState();
    _loadSavedUrl();
  }

  Future<void> _loadSavedUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_savedUrlKey);
    if (saved != null && saved.isNotEmpty) {
      _urlController.text = saved;
    } else {
      _urlController.text = AppConfig.effectiveApiUrl;
    }
  }

  Future<void> _saveUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      _showMessage('Please enter a server URL');
      return;
    }

    final normalized = url.endsWith('/api') ? url : '$url/api';
    AppConfig.setCustomApiUrl(normalized);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_savedUrlKey, normalized);

    if (mounted) {
      _showMessage('Server URL saved');
      context.go('/login');
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Server URL')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Enter the CMS server URL',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _urlController,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'https://cms.example.com',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saveUrl,
              child: const Text('Save & Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
