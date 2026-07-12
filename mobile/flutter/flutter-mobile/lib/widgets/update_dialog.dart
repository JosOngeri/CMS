import 'package:flutter/material.dart';
import '../services/update_service.dart';

class UpdateDialog extends StatefulWidget {
  const UpdateDialog({super.key});

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<UpdateDialog> {
  final UpdateService _updateService = UpdateService();
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _errorMessage;

  Future<void> _downloadUpdate() async {
    setState(() {
      _isDownloading = true;
      _errorMessage = null;
      _downloadProgress = 0.0;
    });

    await _updateService.downloadAndInstallUpdate(
      onProgress: (progress) {
        setState(() {
          _downloadProgress = progress;
        });
      },
      onError: (error) {
        setState(() {
          _errorMessage = error;
          _isDownloading = false;
        });
      },
      onSuccess: () {
        setState(() {
          _isDownloading = false;
        });
        // APK will open automatically
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Update Available'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('A new version of the app is available. Would you like to update now?'),
          if (_isDownloading) ...[
            const SizedBox(height: 16),
            LinearProgressIndicator(value: _downloadProgress),
            const SizedBox(height: 8),
            Text('${(_downloadProgress * 100).toStringAsFixed(0)}%'),
          ],
          if (_errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isDownloading ? null : () => Navigator.of(context).pop(),
          child: const Text('Later'),
        ),
        ElevatedButton(
          onPressed: _isDownloading ? null : _downloadUpdate,
          child: _isDownloading
              ? const Text('Downloading...')
              : const Text('Update Now'),
        ),
      ],
    );
  }
}
