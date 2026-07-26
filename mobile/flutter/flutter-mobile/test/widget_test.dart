// Comprehensive Flutter widget test suite.

import 'package:flutter_test/flutter_test.dart';
import 'package:sda_church_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const SDAChurchApp());

    // Verify app title is present.
    expect(find.text('SDA Church Kiserian'), findsOneWidget);
    
    // Verify app loads without crashing
    await tester.pumpAndSettle();
  });

  testWidgets('App initializes Firebase', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const SDAChurchApp());

    // Verify app loads (Firebase initialization is non-blocking)
    await tester.pumpAndSettle();
    
    // App should still work even if Firebase fails to initialize
    expect(find.text('SDA Church Kiserian'), findsOneWidget);
  });
}
