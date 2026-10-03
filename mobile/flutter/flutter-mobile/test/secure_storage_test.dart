// Regression guard for the B8 token-storage fix.
//
// The bug: api_service wrote auth_token/refresh_token to plaintext
// SharedPreferences while auth_service's migration deleted that copy on
// every cold start — after one restart the interceptor had no Bearer
// token, every request 401'd, and the session was silently wiped.
//
// These tests pin the storage contract: credentials live ONLY in
// FlutterSecureStorage (platform Keystore/Keychain), SharedPreferences
// keeps nothing but the non-sensitive user_data profile cache.

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sda_church_mobile/services/auth_service.dart';

import 'helpers/fake_secure_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, String> secure;
  late ProviderContainer container;

  setUp(() {
    secure = installFakeSecureStorage();
    container = ProviderContainer();
  });

  tearDown(() {
    container.dispose();
    removeFakeSecureStorage();
  });

  /// Read authProvider (starts the notifier's async _init), then spin the
  /// event loop so the restore completes before assertions run.
  Future<void> settle() async {
    container.read(authProvider);
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
  }

  group('AuthNotifier token storage', () {
    test('login writes auth_token to secure storage, never to prefs', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await settle();

      await container
          .read(authProvider.notifier)
          .login({'id': 'u1', 'name': 'Ada'}, 'jwt.abc.def');

      expect(secure['auth_token'], 'jwt.abc.def');
      // THE regression assertion — a plaintext token must never land here.
      expect(prefs.getString('auth_token'), isNull);
      expect(prefs.getString('refresh_token'), isNull);
      // user_data is the only permitted prefs write (profile cache).
      expect(jsonDecode(prefs.getString('user_data')!),
          {'id': 'u1', 'name': 'Ada'});
      expect(container.read(authProvider).isAuthenticated, isTrue);
    });

    test('logout clears auth_token AND refresh_token from secure storage',
        () async {
      SharedPreferences.setMockInitialValues({});
      await settle();
      secure['auth_token'] = 'jwt.abc';
      secure['refresh_token'] = 'rt.123';
      // biometric enrollment is opt-in and must survive logout.
      secure['biometric_refresh_token'] = 'bio.rt';

      await container.read(authProvider.notifier).logout();

      expect(secure.containsKey('auth_token'), isFalse);
      expect(secure.containsKey('refresh_token'), isFalse);
      expect(secure['biometric_refresh_token'], 'bio.rt');
      expect(container.read(authProvider).isAuthenticated, isFalse);
    });

    test('legacy plaintext tokens migrate to secure storage on init',
        () async {
      SharedPreferences.setMockInitialValues({
        'auth_token': 'legacy.jwt',
        'refresh_token': 'legacy.rt',
        'user_data': jsonEncode({'id': 'u1'}),
      });
      final prefs = await SharedPreferences.getInstance();
      await settle();

      expect(secure['auth_token'], 'legacy.jwt');
      expect(secure['refresh_token'], 'legacy.rt');
      expect(prefs.getString('auth_token'), isNull);
      expect(prefs.getString('refresh_token'), isNull);
      expect(container.read(authProvider).isAuthenticated, isTrue);
      expect(container.read(authProvider).token, 'legacy.jwt');
    });

    test('no stored token → unauthenticated', () async {
      SharedPreferences.setMockInitialValues({});
      await settle();

      expect(container.read(authProvider).isAuthenticated, isFalse);
      expect(container.read(authProvider).isLoading, isFalse);
    });
  });
}
