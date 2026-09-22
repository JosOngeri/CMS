import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/media_service.dart';
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
  bool _isUploadingImage = false;
  String? _errorMessage;
  String? _profileImageUrl;
  Map<String, dynamic>? _membershipCard;

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

    setState(() {
      if (user != null) {
        _firstNameController.text = user['first_name'] ?? user['firstName'] ?? '';
        _lastNameController.text = user['last_name'] ?? user['lastName'] ?? '';
        _emailController.text = user['email'] ?? '';
        _phoneController.text = user['phone'] ?? user['phone_number'] ?? '';
        final avatar = user['avatar_url'] ?? user['avatarUrl'] ?? user['profile_photo'];
        _profileImageUrl =
            avatar != null ? _apiService?.resolveFileUrl(avatar) : null;
      }
      _isLoading = false;
    });

    _loadMembershipCard();
  }

  Future<void> _loadMembershipCard() async {
    if (_apiService == null) return;
    final result = await _apiService!.getMembershipCard();
    if (result['success'] == true && mounted) {
      setState(() {
        _membershipCard = result['data'];
      });
    }
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.of(context).pop('gallery'),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a Photo'),
              onTap: () => Navigator.of(context).pop('camera'),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final File? image = source == 'camera'
        ? await mediaService.captureImageFromCamera()
        : await mediaService.pickImageFromGallery();

    if (image == null) return;
    if (!await mediaService.validateImageFile(image)) {
      _showErrorSnackBar('Invalid image. Please choose a JPG/PNG under 5MB.');
      return;
    }

    setState(() => _isUploadingImage = true);

    try {
      final result = await _apiService!.uploadProfilePhoto(image);
      if (result['success'] == true && mounted) {
        final avatarUrl = result['avatarUrl'];
        setState(() {
          _profileImageUrl = _apiService!.resolveFileUrl(avatarUrl);
        });

        final currentUser = ref.read(userProvider);
        if (currentUser != null) {
          final updatedUser = Map<String, dynamic>.from(currentUser);
          updatedUser['avatar_url'] = avatarUrl;
          updatedUser['avatarUrl'] = avatarUrl;
          ref.read(authProvider.notifier).updateUser(updatedUser);
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile photo updated'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        _showErrorSnackBar(result['error'] ?? 'Failed to upload photo');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Photo upload failed: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingImage = false);
      }
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
                    _buildMembershipCard(),
                    const SizedBox(height: 16),
                    _buildNavigationTiles(),
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
            backgroundImage: _profileImageUrl != null && _profileImageUrl!.isNotEmpty
                ? NetworkImage(_profileImageUrl!)
                : null,
            child: _profileImageUrl == null || _profileImageUrl!.isEmpty
                ? const Icon(Icons.person, size: 50)
                : null,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: CircleAvatar(
              radius: 18,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: _isUploadingImage
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : IconButton(
                      icon: const Icon(Icons.camera_alt, size: 18),
                      color: Colors.white,
                      onPressed: _pickImage,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembershipCard() {
    final card = _membershipCard;
    final user = ref.watch(userProvider);
    final memberName = card?['memberName'] ??
        '${_firstNameController.text} ${_lastNameController.text}'.trim();
    final membershipNo = card?['membershipNumber'] ?? 'Not assigned';
    final churchName = card?['churchName'] ?? 'Church';
    final verificationData =
        card?['verificationCode'] ?? 'KMC:${user?['id'] ?? 'unknown'}';

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.badge,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Digital Membership Card',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        memberName.isEmpty ? 'Member' : memberName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Member No: $membershipNo',
                        style: TextStyle(color: Colors.grey[700]),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        churchName,
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                  ),
                ),
                QrImageView(
                  data: verificationData,
                  version: QrVersions.auto,
                  size: 90,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavigationTiles() {
    return Column(
      children: [
        Card(
          child: ListTile(
            leading: const Icon(Icons.groups, color: Colors.teal),
            title: const Text('My Departments'),
            subtitle: const Text('Departments you belong to'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/departments'),
          ),
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.folder, color: Colors.blue),
            title: const Text('Document Library'),
            subtitle: const Text('Quarterlies, bulletins & policies'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/documents'),
          ),
        ),
      ],
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