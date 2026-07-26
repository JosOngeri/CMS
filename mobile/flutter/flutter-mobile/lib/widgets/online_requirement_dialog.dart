import 'package:flutter/material.dart';

class OnlineRequirementDialog extends StatelessWidget {
  final String? featureName;
  final VoidCallback onGoOnline;
  final VoidCallback onCancel;

  const OnlineRequirementDialog({
    super.key,
    this.featureName,
    required this.onGoOnline,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Connection Required'),
      content: Text(
        featureName != null
            ? 'You need to be online to $featureName. Please check your internet connection.'
            : 'You need to be online to use this feature. Please check your internet connection.',
      ),
      actions: [
        TextButton(
          onPressed: onCancel,
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: onGoOnline,
          child: const Text('Go Online'),
        ),
      ],
    );
  }

  static Future<bool> show(
    BuildContext context, {
    String? featureName,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => OnlineRequirementDialog(
        featureName: featureName,
        onGoOnline: () {
          // Open network settings
          Navigator.of(context).pop(true);
        },
        onCancel: () {
          Navigator.of(context).pop(false);
        },
      ),
    );
    return result ?? false;
  }
}