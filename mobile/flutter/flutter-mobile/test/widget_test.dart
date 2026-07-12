// Basic Flutter widget test.

import 'package:flutter_test/flutter_test.dart';
import 'package:sda_church_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const SDAChurchApp());

    // Verify app title is present.
    expect(find.text('SDA Church Kiserian'), findsOneWidget);
  });
}
