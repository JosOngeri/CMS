import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_button.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  ApiService? _apiService;
  final _formKey = GlobalKey<FormState>();
  
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _profileImageUrl;

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    final user = ref.watch(userProvider);
    
    if (user != null) {
      setState(() {
        _firstNameController.text = user['first_name'] ?? '';
        _lastNameController.text = user['last_name'] ?? '';
        _emailController.text = user['email'] ?? '';
        _phoneController.text = user['phone'] ?? '';
        _profileImageUrl = user['profile_photo'];
        _isLoading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    if (_apiService == null) {
      setState(() {
        _errorMessage = 'Service not initialized';
      });
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final profileData = {
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'phone': _phoneController.text.trim(),
      };

      final result = await _apiService!.updateProfile(profileData);

      if (result['success'] && mounted) {
        // Update user data in auth state
        final currentUser = ref.read(userProvider);
        if (currentUser != null) {
          final updatedUser = Map<String, dynamic>.from(currentUser);
          updatedUser.addAll(profileData);
          ref.read(authProvider.notifier).updateUser(updatedUser);
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to update profile';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Network error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
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

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(userProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildProfilePhoto(),
                    const SizedBox(height: 24),
                    _buildFirstNameField(),
                    const SizedBox(height: 16),
                    _buildLastNameField(),
                    const SizedBox(height: 16),
                    _buildEmailField(),
                    const SizedBox(height: 16),
                    _buildPhoneField(),
                    const SizedBox(height: 24),
                    if (_errorMessage != null) ...[
                      Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    LoadingButton(
                      onPressed: _isSaving ? null : _saveProfile,
                      isLoading: _isSaving,
                      text: 'Save Profile',
                      fullWidth: true,
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProfilePhoto() {
    return Center(
      child: Stack(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundImage: _profileImageUrl != null
                ? NetworkImage(_profileImageUrl!)
                : null,
            child: _profileImageUrl == null
                ? const Icon(Icons.person, size: 50)
                : null,
          ),
          // Temporarily disabled due to package compatibility
          // Positioned(
          //   bottom: 0,
          //   right: 0,
          //   child: IconButton(
          //     icon: const Icon(Icons.camera_alt),
          //     onPressed: _isUploadingImage ? null : _pickImage,
          //   ),
          // ),
        ],
      ),
    );
  }

  Widget _buildFirstNameField() {
    return CustomTextField(
      name: 'firstName',
      controller: _firstNameController,
      label: 'First Name',
      hintText: 'Enter your first name',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'First name is required';
        }
        if (value.trim().length < 2) {
          return 'First name must be at least 2 characters';
        }
        return null;
      },
    );
  }

  Widget _buildLastNameField() {
    return CustomTextField(
      name: 'lastName',
      controller: _lastNameController,
      label: 'Last Name',
      hintText: 'Enter your last name',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Last name is required';
        }
        if (value.trim().length < 2) {
          return 'Last name must be at least 2 characters';
        }
        return null;
      },
    );
  }

  Widget _buildEmailField() {
    return CustomTextField(
      name: 'email',
      controller: _emailController,
      label: 'Email',
      hintText: 'Enter your email',
      enabled: false, // Email cannot be changed
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Email is required';
        }
        return null;
      },
    );
  }

  Widget _buildPhoneField() {
    return CustomTextField(
      name: 'phone',
      controller: _phoneController,
      label: 'Phone',
      hintText: 'Enter your phone number',
      keyboardType: TextInputType.phone,
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Phone number is required';
        }
        return null;
      },
    );
  }
}