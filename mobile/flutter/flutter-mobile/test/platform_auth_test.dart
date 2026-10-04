import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sda_church_mobile/services/platform_auth_service.dart';

import 'helpers/fake_secure_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, String> secure;
  late ProviderContainer container;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    secure = installFakeSecureStorage();
    container = ProviderContainer();
  });

  tearDown(() {
    container.dispose();
    removeFakeSecureStorage();
  });

  Future<void> settle() async {
    container.read(platformAuthProvider);
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
  }

  test('platform login stores its token separately', () async {
    await settle();
    await container.read(platformAuthProvider.notifier).login(
      {'id': 'p1', 'name': 'Owner', 'role': 'platform_owner'},
      'platform.jwt',
    );

    final prefs = await SharedPreferences.getInstance();
    expect(secure['platform_token'], 'platform.jwt');
    expect(secure['auth_token'], isNull);
    expect(jsonDecode(prefs.getString('platform_user_data')!)['role'], 'platform_owner');
    expect(container.read(platformAuthProvider).isAuthenticated, isTrue);
  });

  test('platform session restores from secure storage', () async {
    secure['platform_token'] = 'restored.jwt';
    SharedPreferences.setMockInitialValues({
      'platform_user_data': jsonEncode({'id': 'p1', 'role': 'support_staff'}),
    });
    await settle();

    final state = container.read(platformAuthProvider);
    expect(state.isAuthenticated, isTrue);
    expect(state.token, 'restored.jwt');
    expect(state.user?['role'], 'support_staff');
  });

  test('session expiry removes only platform credentials', () async {
    secure['platform_token'] = 'platform.jwt';
    secure['auth_token'] = 'church.jwt';
    await settle();
    await container.read(platformAuthProvider.notifier).sessionExpired();

    expect(secure['platform_token'], isNull);
    expect(secure['auth_token'], 'church.jwt');
    expect(container.read(platformAuthProvider).isAuthenticated, isFalse);
  });
}
