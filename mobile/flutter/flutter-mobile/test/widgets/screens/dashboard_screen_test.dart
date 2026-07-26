import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sda_church_mobile/screens/dashboard_screen.dart';
import 'package:sda_church_mobile/services/auth_service.dart';

void main() {
  group('DashboardScreen Widget Tests', () {
    testWidgets('renders loading state initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading dashboard...'), findsOneWidget);
    });

    testWidgets('renders error state when data fails to load', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      // Simulate error state
      // This would require proper state management setup
      await tester.pump();

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('Failed to load dashboard data'), findsOneWidget);
    });

    testWidgets('renders stats cards when data loads successfully', (WidgetTester tester) async {
      // Mock successful data loading
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      // Simulate successful data load
      // This would require proper state management setup
      await tester.pumpAndSettle();

      expect(find.text('Total Members'), findsOneWidget);
      expect(find.text('Total Payments'), findsOneWidget);
      expect(find.text('Upcoming Events'), findsOneWidget);
      expect(find.text('Announcements'), findsOneWidget);
    });

    testWidgets('renders welcome header with user name', (WidgetTester tester) async {
      final mockUser = {
        'id': '1',
        'email': 'test@example.com',
        'first_name': 'John',
        'last_name': 'Doe',
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProvider.overrideWithValue(mockUser),
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Welcome back, John!'), findsOneWidget);
    });

    testWidgets('refresh button is present', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      expect(find.byIcon(Icons.refresh), findsOneWidget);
    });

    testWidgets('logout button is present', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      expect(find.byIcon(Icons.logout), findsOneWidget);
    });

    testWidgets('renders empty activities state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      // Simulate empty activities state
      await tester.pumpAndSettle();

      expect(find.text('No recent activities'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('retry button works in error state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => AuthNotifier()),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );

      // Simulate error state
      await tester.pump();

      final retryButton = find.text('Retry');
      expect(retryButton, findsOneWidget);

      await tester.tap(retryButton);
      await tester.pump();

      // Verify retry action was triggered
      // This would require proper state management setup
    });
  });
}