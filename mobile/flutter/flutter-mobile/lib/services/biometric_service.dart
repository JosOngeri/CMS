import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _biometricEmailKey = 'biometric_email';
  static const String _biometricPasswordKey = 'biometric_password';

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

  Future<bool> enableBiometric(String email, String password) async {
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
      await _secureStorage.write(key: _biometricPasswordKey, value: password);
      return true;
    } on PlatformException {
      return false;
    }
  }

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
      final password = await _secureStorage.read(key: _biometricPasswordKey);

      if (email == null || password == null) return null;
      return {'email': email, 'password': password};
    } on PlatformException {
      return null;
    }
  }

  Future<void> disableBiometric() async {
    await _secureStorage.delete(key: _biometricEnabledKey);
    await _secureStorage.delete(key: _biometricEmailKey);
    await _secureStorage.delete(key: _biometricPasswordKey);
  }
}
