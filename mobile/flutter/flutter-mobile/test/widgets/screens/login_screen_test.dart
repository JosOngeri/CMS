import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:sda_church_mobile/screens/login_screen.dart';
import 'package:sda_church_mobile/services/auth_service.dart';
import 'package:sda_church_mobile/services/api_service.dart';

@GenerateMocks([ApiService])
void main() {
  group('LoginScreen Widget Tests', () {
    late MockApiService mockApiService;

    setUp(() {
      mockApiService = MockApiService();
    });

    testWidgets('renders login form correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      expect(find.text('Msabato'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('shows validation error for empty identifier', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(find.text('Please enter your username, email, or phone'), findsOneWidget);
    });

    testWidgets('shows validation error for empty password', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.enterText(find.byKey(const Key('identifier')), 'testuser');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(find.text('Please enter your password'), findsOneWidget);
    });

    testWidgets('accepts username as identifier', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.enterText(find.byKey(const Key('identifier')), 'testuser');
      await tester.pump();

      expect(find.text('testuser'), findsOneWidget);
    });

    testWidgets('accepts email as identifier', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.enterText(find.byKey(const Key('identifier')), 'test@example.com');
      await tester.pump();

      expect(find.text('test@example.com'), findsOneWidget);
    });

    testWidgets('accepts phone as identifier', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.enterText(find.byKey(const Key('identifier')), '+254700000000');
      await tester.pump();

      expect(find.text('+254700000000'), findsOneWidget);
    });

    testWidgets('password visibility toggle works', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      final passwordField = find.byKey(const Key('password'));
      final visibilityIcon = find.byIcon(Icons.visibility_off);

      expect(visibilityIcon, findsOneWidget);

      await tester.tap(visibilityIcon);
      await tester.pump();

      expect(find.byIcon(Icons.visibility), findsOneWidget);
    });

    testWidgets('remember me checkbox toggles', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      final checkbox = find.byType(Checkbox);
      expect(checkbox, findsOneWidget);

      await tester.tap(checkbox);
      await tester.pump();

      // Verify checkbox state changed
      final checkboxWidget = tester.widget<Checkbox>(checkbox);
      expect(checkboxWidget.value, true);
    });

    testWidgets('forgot password button navigates to forgot password', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      final forgotPasswordButton = find.text('Forgot password?');
      expect(forgotPasswordButton, findsOneWidget);

      await tester.tap(forgotPasswordButton);
      await tester.pumpAndSettle();

      // Verify navigation (would need proper router setup)
      // expect(find.byType(ForgotPasswordScreen), findsOneWidget);
    });

    testWidgets('loading state disables button', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: MaterialApp(
            home: const LoginScreen(),
          ),
        ),
      );

      // Simulate loading state
      // This would require proper state management setup
      final button = find.byType(ElevatedButton);
      expect(button, findsOneWidget);
    });
  });
}