import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:sda_church_mobile/services/auth_service.dart';

// Generate mocks with: flutter pub run build_runner build
@GenerateMocks([SharedPreferences])
void main() {
  group('AuthService', () {
    late AuthService authService;
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
      authService = AuthService();
    });

    tearDown(() {
      container.dispose();
    });

    test('initial state should be unauthenticated', () {
      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, false);
      expect(authState.user, null);
      expect(authState.token, null);
    });

    test('login should update auth state', () async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
      };
      final mockToken = 'mock_token';

      await container.read(authProvider.notifier).login(mockUser, mockToken);

      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, true);
      expect(authState.user, mockUser);
      expect(authState.token, mockToken);
    });

    test('logout should clear auth state', () async {
      // First login
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
      };
      final mockToken = 'mock_token';

      await container.read(authProvider.notifier).login(mockUser, mockToken);
      expect(container.read(authProvider).isAuthenticated, true);

      // Then logout
      await container.read(authProvider.notifier).logout();

      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, false);
      expect(authState.user, null);
      expect(authState.token, null);
    });

    test('updateUser should update user data', () async {
      final initialUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
      };
      final updatedUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'Updated',
        'last_name': 'User',
      };

      await container.read(authProvider.notifier).login(initialUser, 'mock_token');
      await container.read(authProvider.notifier).updateUser(updatedUser);

      final authState = container.read(authProvider);
      expect(authState.user?['first_name'], 'Updated');
    });
  });
}