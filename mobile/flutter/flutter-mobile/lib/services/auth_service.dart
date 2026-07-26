import 'dart:convert';
import 'package:flutter/foundation.dart';
// import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod/riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  // final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;

  AuthNotifier() : super(const AuthState()) {
    _initPrefs();
  }

  Future<void> _initPrefs() async {
    debugPrint('=== Auth: Initializing SharedPreferences ===');
    _prefs = await SharedPreferences.getInstance();
    debugPrint('=== Auth: SharedPreferences initialized ===');
    _loadStoredAuth();
  }

  Future<void> _loadStoredAuth() async {
    debugPrint('=== Auth: Starting to load stored auth ===');
    if (_prefs == null) {
      debugPrint('=== Auth: Prefs is null, cannot load auth ===');
      return;
    }
    
    try {
      final token = _prefs!.getString('auth_token');
      final userData = _prefs!.getString('user_data');
      debugPrint('=== Auth: Token found: ${token != null}, User data found: ${userData != null} ===');

      if (token != null && userData != null) {
        debugPrint('=== Auth: User is authenticated, setting loading to false ===');
        state = state.copyWith(
          token: token,
          user: jsonDecode(userData),
          isAuthenticated: true,
          isLoading: false,
        );
      } else {
        debugPrint('=== Auth: No stored auth, user not authenticated ===');
        state = state.copyWith(
          isAuthenticated: false,
          isLoading: false,
        );
      }
    } catch (e) {
      debugPrint('=== Auth: Error loading auth: $e ===');
      state = state.copyWith(
        isAuthenticated: false,
        isLoading: false,
        errorMessage: 'Failed to load authentication data',
      );
    }
    debugPrint('=== Auth: Loading complete, isLoading: ${state.isLoading} ===');
  }

  Future<void> login(Map<String, dynamic> user, String token) async {
    try {
      await _prefs!.setString('auth_token', token);
      await _prefs!.setString('user_data', jsonEncode(user));
      
      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
        errorMessage: null,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to save authentication data',
      );
    }
  }

  Future<void> logout() async {
    try {
      await _prefs!.remove('auth_token');
      await _prefs!.remove('user_data');
      
      state = const AuthState(
        isAuthenticated: false,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to clear authentication data',
      );
    }
  }

  Future<void> updateUser(Map<String, dynamic> updatedUser) async {
    try {
      await _prefs!.setString('auth_token', state.token ?? '');
      await _prefs!.setString('user_data', jsonEncode(updatedUser));
      
      state = state.copyWith(user: updatedUser);
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to update user data',
      );
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
