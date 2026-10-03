import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod/riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// B8: auth_token lives in platform secure storage (Android Keystore /
// iOS Keychain). user_data stays in SharedPreferences — it is profile
// display data, not a credential. On first run after this change we
// migrate any legacy plaintext token out of SharedPreferences.
const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

// Auth State Class
class AuthState {
  final Map<String, dynamic>? user;
  final String? token;
  final bool isAuthenticated;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.user,
    this.token,
    this.isAuthenticated = false,
    this.isLoading = true,
    this.errorMessage,
  });

  AuthState copyWith({
    Map<String, dynamic>? user,
    String? token,
    bool? isAuthenticated,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// Auth State Notifier with ChangeNotifier for GoRouter
class AuthNotifier extends StateNotifier<AuthState> {
  SharedPreferences? _prefs;

  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    _prefs = await SharedPreferences.getInstance();
    await _migrateLegacyToken();
    await _loadStoredAuth();
  }

  /// Move a token stored by the pre-secure-storage version out of
  /// SharedPreferences and into secure storage, then delete the plaintext copy.
  Future<void> _migrateLegacyToken() async {
    final legacy = _prefs!.getString('auth_token');
    if (legacy != null) {
      await _secureStorage.write(key: 'auth_token', value: legacy);
      await _prefs!.remove('auth_token');
      debugPrint('Auth: migrated legacy plaintext token to secure storage');
    }
  }

  Future<void> _loadStoredAuth() async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');
      final userData = _prefs!.getString('user_data');

      if (token != null && userData != null) {
        state = state.copyWith(
          token: token,
          user: jsonDecode(userData),
          isAuthenticated: true,
          isLoading: false,
        );
      } else {
        state = state.copyWith(isAuthenticated: false, isLoading: false);
      }
    } catch (e) {
      debugPrint('Auth: error loading stored auth: $e');
      state = state.copyWith(
        isAuthenticated: false,
        isLoading: false,
        errorMessage: 'Failed to load authentication data',
      );
    }
  }

  Future<void> login(Map<String, dynamic> user, String token) async {
    try {
      await _secureStorage.write(key: 'auth_token', value: token);
      await _prefs!.setString('user_data', jsonEncode(user));

      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
        errorMessage: null,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed to save authentication data');
    }
  }

  Future<void> logout() async {
    try {
      await _secureStorage.delete(key: 'auth_token');
      await _prefs!.remove('user_data');

      state = const AuthState(isAuthenticated: false, isLoading: false);
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed to clear authentication data');
    }
  }

  Future<void> updateUser(Map<String, dynamic> updatedUser) async {
    try {
      await _prefs!.setString('user_data', jsonEncode(updatedUser));
      state = state.copyWith(user: updatedUser);
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed to update user data');
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

// Riverpod Providers
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

// Convenience providers
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final userProvider = Provider<Map<String, dynamic>?>((ref) {
  return ref.watch(authProvider).user;
});

final tokenProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).token;
});
