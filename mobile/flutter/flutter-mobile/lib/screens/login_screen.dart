import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import '../widgets/loading_button.dart';
import '../widgets/custom_text_field.dart';
import '../app/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _isBiometricAvailable = false;
  bool _isBiometricEnabled = false;
  bool _enableBiometricNextTime = false;
  
  final BiometricService _biometricService = BiometricService();

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkBiometricAvailability() async {
    final isAvailable = await _biometricService.isBiometricAvailable();
    final isEnabled = await _biometricService.isBiometricEnabled();
    
    if (mounted) {
      setState(() {
        _isBiometricAvailable = isAvailable;
        _isBiometricEnabled = isEnabled;
      });
    }
  }


  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final apiService = await ApiService.getInstance();
      final result = await apiService.login(
        _emailController.text.trim(), // Now used as identifier (username/email/phone)
        _passwordController.text,
      );

      // Let the OS password manager offer to save the credentials
      TextInput.finishAutofillContext(shouldSave: result['success'] == true);

      if (result['success']) {
        // Update auth state using Riverpod
        if (mounted) {
          ref.read(authProvider.notifier).login(result['user'], result['token']);

          // Store the refresh token for biometric if opted in — the password
          // itself is never persisted (L649).
          if ((_rememberMe || _enableBiometricNextTime) && result['refreshToken'] != null) {
            await _storeCredentialsForBiometric(result['refreshToken'] as String);
          }

          // Navigate to dashboard
          context.go('/dashboard');
        }
      } else {
        if (mounted) {
          _showErrorSnackBar(result['error'] ?? 'Login failed');
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Network error: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _storeCredentialsForBiometric(String refreshToken) async {
    try {
      final success = await _biometricService.enableBiometric(
        _emailController.text.trim(),
        refreshToken,
      );

      if (success) {
        if (mounted) {
          setState(() => _isBiometricEnabled = true);
          _showSuccessSnackBar('Biometric login enabled');
        }
      }
    } catch (e) {
      debugPrint('Error storing credentials for biometric: $e');
    }
  }

  Future<void> _biometricLogin() async {
    try {
      final credentials = await _biometricService.authenticateWithBiometric();

      if (credentials == null || !mounted) return;
      final refreshToken = credentials['refreshToken'];
      if (refreshToken == null) return;

      setState(() => _isLoading = true);
      final apiService = await ApiService.getInstance();
      final result = await apiService.refreshSession(refreshToken);

      if (result['success'] == true && mounted) {
        // Refresh tokens rotate server-side — persist the new one.
        final prefs = await SharedPreferences.getInstance();
        final rotated = prefs.getString('refresh_token');
        if (rotated != null) await _biometricService.updateRefreshToken(rotated);

        final userData = prefs.getString('user_data');
        ref.read(authProvider.notifier).login(
          userData != null ? jsonDecode(userData) as Map<String, dynamic> : {},
          result['token'] as String,
        );
        context.go('/dashboard');
      } else if (mounted) {
        await _biometricService.disableBiometric();
        _showErrorSnackBar('Session expired — please sign in with your password');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Biometric authentication failed');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.successColor,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLowest,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              
              // Logo and Title
              Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.warningColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.church,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Welcome Back',
                    style: Theme.of(context).textTheme.displaySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Msabato',
                    style: Theme.of(context).textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
              
              const SizedBox(height: 40),
              
              // Login Form
              FormBuilder(
                key: _formKey,
                child: AutofillGroup(
                  child: Column(
                  children: [
                    // Email Field
                    Semantics(
                      label: 'Username, email, or phone input field',
                      hint: 'Enter your username, email, or phone',
                      textField: true,
                      child: CustomTextField(
                        key: const Key('identifier'),
                        name: 'identifier',
                        controller: _emailController,
                        label: 'Username, Email, or Phone',
                        prefixIcon: Icons.person_outline,
                        autofillHints: const [AutofillHints.username, AutofillHints.email],
                        helperText: 'Enter your username, email address, or phone number',
                        validator: FormBuilderValidators.compose([
                          FormBuilderValidators.required(
                            errorText: 'Please enter your username, email, or phone',
                          ),
                        ]),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Password Field
                    Semantics(
                      label: 'Password input field',
                      hint: 'Enter your password',
                      textField: true,
                      child: CustomTextField(
                        key: const Key('password'),
                        name: 'password',
                        controller: _passwordController,
                        label: 'Password',
                        prefixIcon: Icons.lock_outline,
                        autofillHints: const [AutofillHints.password],
                        obscureText: _obscurePassword,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility : Icons.visibility_off,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                        validator: FormBuilderValidators.required(
                          errorText: 'Please enter your password',
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Remember Me and Forgot Password
                    Row(
                      children: [
                        Checkbox(
                          value: _rememberMe,
                          onChanged: (value) {
                            setState(() {
                              _rememberMe = value ?? false;
                            });
                          },
                        ),
                        const Text('Remember me'),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            context.go('/forgot-password');
                          },
                          child: const Text('Forgot Password?'),
                        ),
                      ],
                    ),

                    // Fingerprint opt-in (shown when device supports biometrics)
                    if (_isBiometricAvailable && !_isBiometricEnabled)
                      Row(
                        children: [
                          Checkbox(
                            value: _enableBiometricNextTime,
                            onChanged: (value) {
                              setState(() {
                                _enableBiometricNextTime = value ?? false;
                              });
                            },
                          ),
                          const Expanded(
                            child: Text('Sign in with fingerprint next time'),
                          ),
                        ],
                      ),

                    const SizedBox(height: 24),
                    
                    // Login Button
                    Semantics(
                      label: 'Login button',
                      hint: 'Sign in to your account',
                      button: true,
                      child: LoadingButton(
                        onPressed: _isLoading ? null : _login,
                        isLoading: _isLoading,
                        text: 'Sign In',
                        fullWidth: true,
                      ),
                    ),
                    
                    const SizedBox(height: 16),

                    // Server URL configuration
                    TextButton.icon(
                      onPressed: () => context.go('/server-url'),
                      icon: const Icon(Icons.settings),
                      label: const Text('Configure Server URL'),
                    ),

                    const SizedBox(height: 16),
                    
                    // Biometric Login Button (only when the user enabled it)
                    if (_isBiometricEnabled)
                      OutlinedButton.icon(
                        onPressed: _isLoading ? null : _biometricLogin,
                        icon: const Icon(Icons.fingerprint),
                        label: const Text('Sign in with Biometrics'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),

                  ],
                ),
              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
