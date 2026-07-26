# Testing Guide for SDA Church Mobile App

## Test Structure

### Unit Tests
- **Location**: `test/unit/`
- **Purpose**: Test individual functions and classes
- **Files**:
  - `services/auth_service_test.dart` - Authentication service tests
  - `services/api_service_test.dart` - API service tests
  - `services/firebase_service_test.dart` - Firebase service tests

### Widget Tests
- **Location**: `test/widgets/`
- **Purpose**: Test individual widgets in isolation
- **Files**:
  - `screens/login_screen_test.dart` - Login screen widget tests
  - `screens/dashboard_screen_test.dart` - Dashboard screen widget tests
  - `screens/profile_screen_test.dart` - Profile screen widget tests
  - `components/custom_text_field_test.dart` - Custom text field tests

### Integration Tests
- **Location**: `test/integration/` and `integration_test/`
- **Purpose**: Test complete user flows
- **Files**:
  - `auth_flow_test.dart` - Authentication flow tests
  - `payment_flow_test.dart` - Payment flow tests
  - `navigation_test.dart` - Navigation tests
  - `app_test.dart` - App-level integration tests

## Running Tests

### Run All Tests
```bash
flutter test
```

### Run Specific Test File
```bash
flutter test test/unit/services/auth_service_test.dart
```

### Run Widget Tests Only
```bash
flutter test test/widgets/
```

### Run Integration Tests
```bash
flutter test integration_test/
```

### Run with Coverage
```bash
flutter test --coverage
```

### Generate Coverage Report
```bash
genhtml coverage/lcov.info -o coverage/html
```

## Test Coverage Goals

- **Overall Coverage**: 80%+
- **Critical Path Coverage**: 90%+
- **Widget Coverage**: 85%+
- **Service Coverage**: 90%+

## Test Dependencies

### Required Packages
- `flutter_test` - Built-in testing framework
- `mockito` - Mocking framework
- `build_runner` - Code generation for mocks
- `integration_test` - Integration testing

### Setup
```bash
flutter pub get
flutter pub run build_runner build
```

## Test Writing Guidelines

### Unit Tests
1. Test individual functions in isolation
2. Mock external dependencies
3. Test both success and failure cases
4. Use descriptive test names
5. Follow Arrange-Act-Assert pattern

### Widget Tests
1. Test widget rendering
2. Test user interactions
3. Test state changes
4. Mock providers and services
5. Use keys for widget identification

### Integration Tests
1. Test complete user flows
2. Test navigation between screens
3. Test API interactions
4. Test error handling
5. Test edge cases

## Common Test Patterns

### Mocking Services
```dart
final mockApiService = MockApiService();
when(mockApiService.getData()).thenAnswer((_) async => mockData);
```

### Provider Overrides
```dart
ProviderScope(
  overrides: [
    authProvider.overrideWith((ref) => AuthNotifier()),
    userProvider.overrideWithValue(mockUser),
  ],
  child: TestWidget(),
)
```

### Widget Testing
```dart
testWidgets('widget description', (WidgetTester tester) async {
  await tester.pumpWidget(TestWidget());
  await tester.pumpAndSettle();
  
  expect(find.text('Expected'), findsOneWidget);
});
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Flutter Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test
      - run: flutter test --coverage
```

## Test Maintenance

### Regular Tasks
- Update tests when code changes
- Remove obsolete tests
- Add tests for new features
- Monitor test coverage
- Fix flaky tests

### Test Documentation
- Document complex test scenarios
- Explain mock setup
- Note test limitations
- Keep test comments concise

## Troubleshooting

### Common Issues
- **Async test failures**: Use `pumpAndSettle()` for async operations
- **Provider issues**: Use ProviderScope with overrides
- **Mock issues**: Ensure mocks are properly generated
- **Navigation issues**: Mock router dependencies
- **Flaky tests**: Add proper waits and delays

## Current Test Status

### Completed Tests
- ✅ Unit tests for AuthService
- ✅ Widget tests for LoginScreen
- ✅ Widget tests for DashboardScreen
- ✅ Widget tests for ProfileScreen
- ✅ Integration tests for authentication flow
- ✅ App smoke test

### Pending Tests
- ⏳ Unit tests for ApiService
- ⏳ Unit tests for FirebaseService
- ⏳ Widget tests for other screens
- ⏳ Integration tests for payment flow
- ⏳ Integration tests for navigation

## Next Steps

1. Generate mocks: `flutter pub run build_runner build`
2. Run all tests: `flutter test`
3. Generate coverage report: `flutter test --coverage`
4. Review coverage and add missing tests
5. Set up CI/CD pipeline
6. Monitor test results regularly