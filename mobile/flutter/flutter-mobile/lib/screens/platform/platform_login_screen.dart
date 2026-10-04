import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../services/platform_auth_service.dart';
import '../../services/platform_api_service.dart';

/// Platform-admin sign-in — separate realm from church login.
/// Hits POST /platform/auth/login, which returns the Bearer token in the
/// body (mobile can't use the web console's httpOnly cookie).
class PlatformLoginScreen extends ConsumerStatefulWidget {
  const PlatformLoginScreen({super.key});

  @override
  ConsumerState<PlatformLoginScreen> createState() => _PlatformLoginScreenState();
}

class _PlatformLoginScreenState extends ConsumerState<PlatformLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _totpController = TextEditingController();
  bool _loading = false;
  bool _mfaRequired = false;
  bool _checkingServer = false;
  String? _serverStatus;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _totpController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(platformApiProvider);
      final res = await api.login(
        _emailController.text.trim(),
        _passwordController.text,
        totp: _mfaRequired ? _totpController.text.trim() : null,
      );
      final token = res['token'] as String?;
      final user = res['user'] as Map<String, dynamic>?;
      if (token == null || user == null) {
        throw PlatformApiException(500, 'Malformed login response');
      }
      if (user['mfa_setup_required'] == true) {
        setState(() {
          _error = 'MFA setup required — enroll an authenticator in the web console first.';
          _loading = false;
        });
        return;
      }
      await ref.read(platformAuthProvider.notifier).login(user, token);
      if (mounted) context.go('/platform');
    } on PlatformApiException catch (e) {
      if (e.code == 'MFA_REQUIRED' || e.code == 'MFA_INVALID') {
        setState(() {
          _mfaRequired = true;
          _error = e.code == 'MFA_INVALID' ? 'Invalid authenticator code' : null;
          _loading = false;
        });
        return;
      }
      setState(() {
        _error = e.statusCode == 429
            ? '${e.message}. Wait 15 minutes before trying again.'
            : e.message;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Sign-in failed — check connection and server URL';
        _loading = false;
      });
    }
  }

  Future<void> _checkServer() async {
    setState(() {
      _checkingServer = true;
      _serverStatus = null;
    });
    try {
      await ref.read(platformApiProvider).getPublicStatus();
      if (mounted) setState(() => _serverStatus = 'Server reachable');
    } on PlatformApiException catch (error) {
      if (mounted) setState(() => _serverStatus = error.message);
    } finally {
      if (mounted) setState(() => _checkingServer = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(Icons.admin_panel_settings,
                      size: 64, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(height: 16),
                  const Text(
                    'Msabato Admin',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Msabato superadmin console',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 32),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppTheme.errorLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(color: AppTheme.errorColor)),
                    ),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Platform email',
                      prefixIcon: Icon(Icons.email_outlined),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                        v == null || !v.contains('@') ? 'Enter your platform email' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Enter your password' : null,
                  ),
                  if (_mfaRequired) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _totpController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: 'Authenticator code',
                        prefixIcon: Icon(Icons.pin_outlined),
                        border: OutlineInputBorder(),
                        counterText: '',
                      ),
                      validator: (v) =>
                          v == null || v.length != 6 ? 'Enter the 6-digit code' : null,
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _login,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Sign in', style: TextStyle(fontSize: 16)),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _checkingServer ? null : _checkServer,
                    icon: _checkingServer
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.cloud_outlined),
                    label: const Text('Check server connection'),
                  ),
                  if (_serverStatus != null) ...[
                    const SizedBox(height: 8),
                    Text(_serverStatus!, textAlign: TextAlign.center),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
