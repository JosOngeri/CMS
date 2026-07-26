# Android App Implementation To-Do List

## Scope and current baseline

The Flutter Android project already has an Android module, application ID, routing, authentication storage, and initial screens. This list covers completing, validating, and releasing the Android app rather than starting a new application.

- **Existing Flutter entry point:** `mobile/flutter/flutter-mobile/lib/main.dart`
- **Existing Android module:** `mobile/flutter/flutter-mobile/android/`
- **Existing Android application ID:** `com.sdachurch.sda_church_mobile`
- **Existing routes:** login, dashboard, payments, announcements, profile, and forgot-password

---

## Phase 1: Make the Android build reliable

- [ ] **1.1 Configure the supported build JDK**
  - [ ] Install/select JDK 21 as the Gradle JVM.
  - [ ] Confirm the Gradle server no longer runs on JDK 25.
  - [ ] Verify: `flutter build apk --debug` completes successfully.

- [ ] **1.2 Validate Android project settings**
  - [ ] Confirm the package name, minimum Android version, target Android version, and version number in `android/app/build.gradle.kts`.
  - [ ] Confirm the installed Android SDK and NDK match the values required by the project.
  - [ ] Verify: Gradle sync completes without errors or compatibility warnings.

- [ ] **1.3 Remove unnecessary Android permissions**
  - [ ] Review each permission in `android/app/src/main/AndroidManifest.xml` against a current app feature.
  - [ ] Remove permissions that are not required, especially storage, package-install, foreground-service, wake-lock, and boot-completed permissions if their related feature is not implemented.
  - [ ] Verify: the app still launches and each retained permission has a tested user-facing feature.

---

## Phase 2: Complete the app foundation

- [ ] **2.1 Establish one state-management approach**
  - [ ] Choose Riverpod or Provider as the primary app-state solution.
  - [ ] Refactor `lib/main.dart`, authentication state, and screen consumers to use the chosen approach consistently.
  - [ ] Verify: login state is preserved across an app restart and logout returns users to the login screen.

- [ ] **2.2 Protect authenticated routes**
  - [ ] Add route redirects in `lib/app/router.dart` based on the authenticated state.
  - [ ] Add an initial loading state while stored credentials are restored.
  - [ ] Verify: unauthenticated users cannot open dashboard, payments, announcements, or profile routes.

- [ ] **2.3 Consolidate API configuration**
  - [ ] Make `lib/services/api_service.dart` and `lib/services/config.dart` use one API base-URL source.
  - [ ] Support a local Android-emulator address, a physical-device development address, and the production API without hardcoding changes for each build.
  - [ ] Verify: authentication and at least one authenticated API request succeed on both an emulator and a physical Android device.

- [ ] **2.4 Strengthen session handling**
  - [ ] Clear secure credentials and redirect to login after an API `401` response.
  - [ ] Show clear offline, timeout, and server-error messages instead of raw failures.
  - [ ] Verify: expired tokens, disabled network access, and API failures are handled without a crash.

---

## Phase 3: Finish the initial church-member experience

- [ ] **3.1 Complete authentication flows**
  - [ ] Validate login form fields and show server-side errors clearly.
  - [ ] Connect and test forgot-password and password-reset flows with the backend API.
  - [ ] Add biometric sign-in only after users can securely opt in and opt out.
  - [ ] Verify: a new and an existing user can sign in, recover access, and sign out.

- [ ] **3.2 Complete dashboard content**
  - [ ] Define the dashboard data contract with the backend before building additional widgets.
  - [ ] Add loading, empty, error, and refreshed states for dashboard content.
  - [ ] Verify: dashboard data is accurate for the signed-in member and a failed request can be retried.

- [ ] **3.3 Complete payments**
  - [ ] Confirm the payment API contract, supported payment methods, callback/status handling, and receipts with the Treasury/Payment backend APIs.
  - [ ] Implement payment initiation, status updates, cancellation/error feedback, and payment history.
  - [ ] Verify: a test payment reaches a final status and has an auditable receipt/history record.

- [ ] **3.4 Complete announcements and profile**
  - [ ] Implement announcement list, detail, unread/read state, and refresh behavior.
  - [ ] Implement profile display, editing, validation, and secure credential-related actions.
  - [ ] Verify: updates made by the user persist after an app restart.

---

## Phase 4: Android-specific integrations

- [ ] **4.1 Configure Firebase services**
  - [ ] Add the Android Firebase configuration for the production package name.
  - [ ] Implement notification permission prompts only when notifications provide clear user value.
  - [ ] Handle foreground, background, and tapped-notification navigation.
  - [ ] Verify: a test notification is received on a real Android device and opens the intended screen.

- [ ] **4.2 Complete camera and media flows**
  - [ ] Request camera/media access only at the moment a user selects the related feature.
  - [ ] Implement image selection, validation, compression if required, upload progress, and failure recovery.
  - [ ] Verify: users can select or capture a supported image and receive a clear result for success or failure.

- [ ] **4.3 Finish app identity and accessibility**
  - [ ] Generate and apply the configured launcher icon.
  - [ ] Replace default Android launch assets with the approved brand assets.
  - [ ] Test text scaling, dark theme, screen readers, landscape behavior, and small screens.
  - [ ] Verify: core flows remain usable on supported Android screen sizes and accessibility settings.

---

## Phase 5: Testing and release preparation

- [ ] **5.1 Add automated tests**
  - [ ] Replace the current smoke-only widget test with tests for authentication state, route guards, API error states, and each core screen.
  - [ ] Add integration tests for login, logout, dashboard loading, and payment status handling.
  - [ ] Verify: `flutter test` passes consistently from a clean checkout.

- [ ] **5.2 Test Android release behavior**
  - [ ] Test debug and release builds on a physical Android device.
  - [ ] Confirm the release build uses the production API and contains no development-only configuration.
  - [ ] Verify: `flutter build apk --release` and `flutter build appbundle --release` complete successfully.

- [ ] **5.3 Configure secure signing and distribution**
  - [ ] Create a protected Android signing key and keep passwords outside source control.
  - [ ] Replace the debug release signing configuration in `android/app/build.gradle.kts` with the protected release configuration.
  - [ ] Set the final app version, prepare Play Store listing assets, privacy policy, data-safety disclosure, and internal-test release notes.
  - [ ] Verify: a signed Android App Bundle is accepted by the Google Play internal testing track.

---

## Completion criteria

- [ ] Android debug and release builds succeed using JDK 21.
- [ ] Authentication, dashboard, payments, announcements, and profile work against the documented backend APIs.
- [ ] Required Android permissions and Firebase behavior are tested on a physical device.
- [ ] Automated tests pass and a signed App Bundle is ready for internal testing.
