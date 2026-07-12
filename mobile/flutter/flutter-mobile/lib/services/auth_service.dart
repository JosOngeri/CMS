import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  
  Map<String, dynamic>? _user;
  String? _token;
  bool _isAuthenticated = false;
  bool _isLoading = true;

  Map<String, dynamic>? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;

  AuthService() {
    _loadStoredAuth();
  }

  Future<void> _loadStoredAuth() async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');
      final userData = await _secureStorage.read(key: 'user_data');

      if (token != null && userData != null) {
        _token = token;
        _user = jsonDecode(userData);
        _isAuthenticated = true;
      }
    } catch (e) {
      _isAuthenticated = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void login(Map<String, dynamic> user, String token) {
    _user = user;
    _token = token;
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiService().logout();
    _user = null;
    _token = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  Future<void> updateUser(Map<String, dynamic> updatedUser) async {
    _user = updatedUser;
    await _secureStorage.write(
      key: 'user_data',
      value: jsonEncode(updatedUser),
    );
    notifyListeners();
  }
}
