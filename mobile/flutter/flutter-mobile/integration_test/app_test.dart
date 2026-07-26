import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sda_church_mobile/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const SDAChurchApp());

    // Verify app title is present.
    expect(find.text('SDA Church Kiserian'), findsOneWidget);

    // Verify app loads without crashing
    await tester.pumpAndSettle();
  });
}