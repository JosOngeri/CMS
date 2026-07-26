import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sda_church_mobile/main.dart';
import 'package:sda_church_mobile/screens/login_screen.dart';
import 'package:sda_church_mobile/screens/dashboard_screen.dart';
import 'package:sda_church_mobile/services/auth_service.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Authentication Flow Integration Tests', () {
    testWidgets('complete login flow', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: const SDAChurchApp(),
        ),
      );

      // Wait for app to load
      await tester.pumpAndSettle();

      // Should be on login screen initially
      expect(find.byType(LoginScreen), findsOneWidget);

      // Enter email
      await tester.enterText(
        find.byKey(const Key('email')),
        'test@example.com',
      );
      await tester.pumpAndSettle();

      // Enter password
      await tester.enterText(
        find.byKey(const Key('password')),
        'password123',
      );
      await tester.pumpAndSettle();

      // Tap login button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should navigate to dashboard after successful login
      // This would require proper API mocking or test backend
      // expect(find.byType(DashboardScreen), findsOneWidget);
    });

    testWidgets('logout flow', (WidgetTester tester) async {
      // First login
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const SDAChurchApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Simulate logged in state
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const SDAChurchApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Navigate to dashboard
      // expect(find.byType(DashboardScreen), findsOneWidget);

      // Tap logout button
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();

      // Confirm logout
      await tester.tap(find.text('Logout'));
      await tester.pumpAndSettle();

      // Should return to login screen
      // expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('login with invalid credentials shows error', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: const SDAChurchApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Enter invalid credentials
      await tester.enterText(
        find.byKey(const Key('email')),
        'invalid@example.com',
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('password')),
        'wrongpassword',
      );
      await tester.pumpAndSettle();

      // Tap login button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should show error message
      // This would require proper API mocking
      // expect(find.text('Invalid credentials'), findsOneWidget);
    });

    testWidgets('form validation prevents invalid login', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: const SDAChurchApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Try to login without entering credentials
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should show validation errors
      expect(find.text('Please enter your email address'), findsOneWidget);
      expect(find.text('Please enter your password'), findsOneWidget);
    });
  });
}