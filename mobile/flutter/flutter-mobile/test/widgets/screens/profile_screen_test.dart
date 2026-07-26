import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sda_church_mobile/screens/profile_screen.dart';
import 'package:sda_church_mobile/services/auth_service.dart';

void main() {
  group('ProfileScreen Widget Tests', () {
    testWidgets('renders loading state initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading profile...'), findsOneWidget);
    });

    testWidgets('renders profile form when data loads', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Profile'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(4));
      expect(find.text('Save Profile'), findsOneWidget);
    });

    testWidgets('shows validation error for empty first name', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Clear first name field
      await tester.enterText(find.byKey(const Key('first_name')), '');
      await tester.tap(find.text('Save Profile'));
      await tester.pump();

      expect(find.text('First name is required'), findsOneWidget);
    });

    testWidgets('shows validation error for short first name', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Enter short first name
      await tester.enterText(find.byKey(const Key('first_name')), 'J');
      await tester.tap(find.text('Save Profile'));
      await tester.pump();

      expect(find.text('First name must be at least 2 characters'), findsOneWidget);
    });

    testWidgets('email field is disabled', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      final emailField = find.byKey(const Key('email'));
      final textField = tester.widget<TextField>(emailField);
      expect(textField.enabled, false);
    });

    testWidgets('shows validation error for invalid phone number', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Enter invalid phone number
      await tester.enterText(find.byKey(const Key('phone_number')), 'invalid');
      await tester.tap(find.text('Save Profile'));
      await tester.pump();

      expect(find.text('Please enter a valid phone number'), findsOneWidget);
    });

    testWidgets('logout button shows confirmation dialog', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();

      expect(find.text('Logout'), findsOneWidget);
      expect(find.text('Are you sure you want to logout?'), findsOneWidget);
    });

    testWidgets('profile photo picker shows source selection', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone_number': '+254712345678',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap on profile photo
      await tester.tap(find.byType(CircleAvatar));
      await tester.pumpAndSettle();

      expect(find.text('Select Photo'), findsOneWidget);
      expect(find.text('Gallery'), findsOneWidget);
      expect(find.text('Camera'), findsOneWidget);
    });
  });
}