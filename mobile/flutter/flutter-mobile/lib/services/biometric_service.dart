import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Biometric unlock that stores a *refresh token* — never the password (L649).
/// After biometric auth the app exchanges the token via /auth/refresh-token,
/// which rotates it server-side; a stolen token is single-use.
class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricEmailKey = 'biometric_email';
  static const String _biometricRefreshTokenKey = 'biometric_refresh_token';

  Future<bool> isBiometricAvailable() async {
    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return canCheck && isDeviceSupported;
    } on PlatformException {
      return false;
    }
  }

  Future<bool> isBiometricEnabled() async {
    final value = await _secureStorage.read(key: _biometricEnabledKey);
    return value == 'true';
  }

  /// [email] identifies the account shown on the login screen;
  /// [refreshToken] is the long-lived credential exchanged on biometric login.
  Future<bool> enableBiometric(String email, String refreshToken) async {
    final isAvailable = await isBiometricAvailable();
    if (!isAvailable) return false;

    try {
      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Authenticate to enable biometric login',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (!didAuthenticate) return false;

      await _secureStorage.write(key: _biometricEnabledKey, value: 'true');
      await _secureStorage.write(key: _biometricEmailKey, value: email);
      await _secureStorage.write(key: _biometricRefreshTokenKey, value: refreshToken);
      return true;
    } on PlatformException {
      return false;
    }
  }

  /// Returns {'email', 'refreshToken'} after a successful biometric check.
  Future<Map<String, String>?> authenticateWithBiometric() async {
    final isAvailable = await isBiometricAvailable();
    final isEnabled = await isBiometricEnabled();
    if (!isAvailable || !isEnabled) return null;

    try {
      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Login with biometric',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (!didAuthenticate) return null;

      final email = await _secureStorage.read(key: _biometricEmailKey);
      final refreshToken = await _secureStorage.read(key: _biometricRefreshTokenKey);

      if (email == null || refreshToken == null) return null;
      return {'email': email, 'refreshToken': refreshToken};
    } on PlatformException {
      return null;
    }
  }

  /// Update the stored refresh token after a rotation (call after refreshSession).
  Future<void> updateRefreshToken(String refreshToken) async {
    await _secureStorage.write(key: _biometricRefreshTokenKey, value: refreshToken);
  }

  Future<void> disableBiometric() async {
    await _secureStorage.delete(key: _biometricEnabledKey);
    await _secureStorage.delete(key: _biometricEmailKey);
    await _secureStorage.delete(key: _biometricRefreshTokenKey);
  }
}
