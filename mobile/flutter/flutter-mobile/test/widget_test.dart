// Smoke test: the app boots and lands on the login screen.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sda_church_mobile/main.dart';

import 'helpers/fake_secure_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(installFakeSecureStorage);
  tearDown(removeFakeSecureStorage);

  testWidgets('App boots to the login screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      const ProviderScope(child: SDAChurchApp()),
    );
    // Auth restore is async — settle past it so the router leaves /loading.
    await tester.pumpAndSettle();

    // The router redirects unauthenticated users to /login.
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Msabato'), findsOneWidget);
  });
}
