import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import '../services/update_service.dart';
import '../widgets/loading_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/update_dialog.dart';

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
  
  final BiometricService _biometricService = BiometricService();

  @override
  void initState() {
    super.initState();
    _checkForUpdates();
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

  Future<void> _checkForUpdates() async {
    try {
      // Temporarily disabled due to package compatibility
      // final updateService = UpdateService();
      // final hasUpdate = await updateService.checkForUpdate();
      // if (hasUpdate && mounted) {
      //   showDialog(
      //     context: context,
      //     builder: (context) => const UpdateDialog(),
      //   );
      // }
    } catch (e) {
      debugPrint('Update check failed: $e');
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

      if (result['success']) {
        // Update auth state using Riverpod
        if (mounted) {
          ref.read(authProvider.notifier).login(result['user'], result['token']);
          
          // Store credentials for biometric if remember me is checked
          if (_rememberMe) {
            await _storeCredentialsForBiometric();
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

  Future<void> _storeCredentialsForBiometric() async {
    try {
      if (_rememberMe) {
        final success = await _biometricService.enableBiometric(
          _emailController.text.trim(),
          _passwordController.text,
        );
        
        if (success && mounted) {
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
      
      if (credentials != null && mounted) {
        // Auto-fill credentials
        _emailController.text = credentials['email'] ?? '';
        _passwordController.text = credentials['password'] ?? '';
        
        // Auto-login
        await _login();
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Biometric authentication failed');
      }
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
        backgroundColor: Colors.green,
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
                        colors: [Color(0xFF3B82F6), Color(0xFFF59E0B)],
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
                    
                    // Biometric Login Button (only show if available)
                    if (_isBiometricAvailable)
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
            ],
          ),
        ),
      ),
    );
  }
}
