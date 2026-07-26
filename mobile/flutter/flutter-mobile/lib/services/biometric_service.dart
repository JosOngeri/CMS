import 'package:flutter/foundation.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;
  
  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricCredentialsKey = 'biometric_credentials';
  
  // Check if device supports biometric authentication
  Future<bool> isDeviceSupported() async {
    try {
      final isSupported = await _localAuth.isDeviceSupported();
      return isSupported;
    } catch (e) {
      debugPrint('Error checking device support: $e');
      return false;
    }
  }
  
  // Check if biometric authentication is available
  Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      if (!isAvailable) return false;
      
      final availableBiometrics = await _localAuth.getAvailableBiometrics();
      return availableBiometrics.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking biometric availability: $e');
      return false;
    }
  }
  
  // Check if user has enabled biometric authentication
  Future<bool> isBiometricEnabled() async {
    try {
      if (_prefs == null) {
        _prefs = await SharedPreferences.getInstance();
      }
      final isEnabled = _prefs!.getString(_biometricEnabledKey);
      return isEnabled == 'true';
    } catch (e) {
      debugPrint('Error checking biometric enabled status: $e');
      return false;
    }
  }
  
  // Enable biometric authentication
  Future<bool> enableBiometric(String email, String password) async {
    try {
      // First authenticate to verify user identity
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to enable biometric login',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
      
      if (!authenticated) return false;
      
      // Store credentials securely
      final credentials = '$email:$password';
      await _secureStorage.write(key: _biometricCredentialsKey, value: credentials);
      
      // Mark biometric as enabled
      if (_prefs == null) {
        _prefs = await SharedPreferences.getInstance();
      }
      await _prefs!.setString(_biometricEnabledKey, 'true');
      
      return true;
    } catch (e) {
      debugPrint('Error enabling biometric: $e');
      return false;
    }
  }
  
  // Disable biometric authentication
  Future<bool> disableBiometric() async {
    try {
      // Remove stored credentials from secure storage
      await _secureStorage.delete(key: _biometricCredentialsKey);
      
      // Mark biometric as disabled
      if (_prefs == null) {
        _prefs = await SharedPreferences.getInstance();
      }
      await _prefs!.setString(_biometricEnabledKey, 'false');
      
      return true;
    } catch (e) {
      debugPrint('Error disabling biometric: $e');
      return false;
    }
  }
  
  // Authenticate using biometrics
  Future<Map<String, String>?> authenticateWithBiometric() async {
    try {
      // Check if biometric is enabled
      final isEnabled = await isBiometricEnabled();
      if (!isEnabled) return null;
      
      // Authenticate with biometrics
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to login',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
      
      if (!authenticated) return null;
      
      // Retrieve stored credentials
      final credentials = await _secureStorage.read(key: _biometricCredentialsKey);
      if (credentials == null) return null;
      
      // Parse credentials
      final parts = credentials.split(':');
      if (parts.length != 2) return null;
      
      return {
        'email': parts[0],
        'password': parts[1],
      };
    } catch (e) {
      debugPrint('Error authenticating with biometric: $e');
      return null;
    }
  }
  
  // Get available biometric types
  Future<List<String>> getAvailableBiometrics() async {
    try {
      final availableBiometrics = await _localAuth.getAvailableBiometrics();
      return availableBiometrics.map((type) => type.toString()).toList();
    } catch (e) {
      debugPrint('Error getting available biometrics: $e');
      return [];
    }
  }
  
  // Get user-friendly biometric type name
  String getBiometricTypeName(String type) {
    switch (type) {
      case 'BiometricType.face':
        return 'Face ID';
      case 'BiometricType.fingerprint':
        return 'Fingerprint';
      case 'BiometricType.iris':
        return 'Iris Scanner';
      case 'BiometricType.strong':
        return 'Biometric';
      default:
        return 'Biometric';
    }
  }
}

// Global biometric service instance
final biometricService = BiometricService();