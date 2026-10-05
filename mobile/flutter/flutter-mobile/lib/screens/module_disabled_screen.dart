import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Shown when the platform has switched a module off for this church.
/// Pushed by the dio error interceptor on a MODULE_DISABLED 403.
class ModuleDisabledScreen extends StatelessWidget {
  final String? message;

  const ModuleDisabledScreen({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Module unavailable')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: scheme.errorContainer,
                child: Icon(Icons.block, size: 36, color: scheme.error),
              ),
              const SizedBox(height: 24),
              Text(
                'This feature is unavailable',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Text(
                message ??
                    'This module has been turned off for your church.',
                textAlign: TextAlign.center,
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              Text(
                'If you believe this is a mistake, please contact your platform administrator.',
                textAlign: TextAlign.center,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: () => context.go('/dashboard'),
                icon: const Icon(Icons.home_outlined),
                label: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
