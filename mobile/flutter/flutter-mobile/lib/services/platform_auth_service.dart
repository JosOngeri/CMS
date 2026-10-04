import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Platform-realm auth state — kept entirely separate from the church
// authProvider. Token lives in secure storage as 'platform_token' so a
// church session and a platform session can coexist on one device.
const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

class PlatformAuthState {
  final Map<String, dynamic>? user;
  final String? token;
  final bool isAuthenticated;
  final bool isLoading;
  final String? errorMessage;

  const PlatformAuthState({
    this.user,
    this.token,
    this.isAuthenticated = false,
    this.isLoading = true,
    this.errorMessage,
  });

  PlatformAuthState copyWith({
    Map<String, dynamic>? user,
    String? token,
    bool? isAuthenticated,
    bool? isLoading,
    String? errorMessage,
  }) {
    return PlatformAuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class PlatformAuthNotifier extends StateNotifier<PlatformAuthState> {
  SharedPreferences? _prefs;

  PlatformAuthNotifier() : super(const PlatformAuthState()) {
    _init();
  }

  Future<void> _init() async {
    _prefs = await SharedPreferences.getInstance();
    await _loadStoredAuth();
  }

  Future<void> _loadStoredAuth() async {
    try {
      final token = await _secureStorage.read(key: 'platform_token');
      final userData = _prefs!.getString('platform_user_data');
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
      debugPrint('PlatformAuth: error loading stored auth: $e');
      state = state.copyWith(isAuthenticated: false, isLoading: false);
    }
  }

  Future<void> login(Map<String, dynamic> user, String token) async {
    await _secureStorage.write(key: 'platform_token', value: token);
    await _prefs!.setString('platform_user_data', jsonEncode(user));
    state = state.copyWith(
      user: user,
      token: token,
      isAuthenticated: true,
      isLoading: false,
      errorMessage: null,
    );
  }

  Future<void> logout() async {
    await _secureStorage.delete(key: 'platform_token');
    await _prefs!.remove('platform_user_data');
    state = const PlatformAuthState(isAuthenticated: false, isLoading: false);
  }

  /// 401 from any platform call — the session was revoked or expired.
  Future<void> sessionExpired() async {
    await logout();
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final platformAuthProvider =
    StateNotifierProvider<PlatformAuthNotifier, PlatformAuthState>((ref) {
  return PlatformAuthNotifier();
});

final platformUserProvider = Provider<Map<String, dynamic>?>((ref) {
  return ref.watch(platformAuthProvider).user;
});
