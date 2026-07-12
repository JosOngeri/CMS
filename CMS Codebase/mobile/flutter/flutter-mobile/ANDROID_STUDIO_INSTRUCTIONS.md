# Android Studio Instructions for AI Agent

## Project: SDA Church Mobile App (Flutter)

**Goal:** Build and run the Flutter app with the latest changes without writing new code.

---

## Step 1: Install Dependencies

Run the following command in the terminal at the project root (`flutter-mobile/`):

```bash
flutter pub get
```

This will install the newly added `path_provider` dependency.

---

## Step 2: Verify Flutter Environment

Check that Flutter is properly configured:

```bash
flutter doctor
```

Ensure all required components are installed (Flutter SDK, Android SDK, Android Studio, etc.).

---

## Step 3: Clean Build

Clean the project to ensure no cached build artifacts cause issues:

```bash
flutter clean
```

---

## Step 4: Build the App

### For Debug Build (Development)

```bash
flutter build apk --debug
```

### For Release Build (Production)

```bash
flutter build apk --release
```

---

## Step 5: Run on Emulator or Device

### Option A: Using Android Studio
1. Open Android Studio
2. Open the Flutter project (`flutter-mobile/` folder)
3. Wait for Gradle sync to complete
4. Select an emulator or physical device from the device dropdown
5. Click the green "Run" button (or press Shift+F10)

### Option B: Using Command Line

List available devices:
```bash
flutter devices
```

Run on specific device:
```bash
flutter run -d <device_id>
```

Run on first available device:
```bash
flutter run
```

---

## Step 6: Verify Functionality

After the app launches, test the following features:

1. **Login Screen** - Verify login form is displayed
2. **Dashboard** - Navigate to `/dashboard` and verify stats cards and activities load
3. **Announcements** - Navigate to `/announcements` and verify announcements list loads
4. **Profile** - Navigate to `/profile` and verify profile form is displayed
5. **Forgot Password** - Navigate to `/forgot-password` and verify reset form is displayed
6. **Payments** - Navigate to `/payments` and verify payment screen loads

---

## Step 7: Check for Build Errors

If build errors occur:

1. Check the "Run" tab in Android Studio for error messages
2. Check the terminal output for specific error details
3. Common issues:
   - Missing dependencies → Run `flutter pub get` again
   - Gradle sync issues → Click "Sync Project with Gradle Files"
   - Android SDK issues → Open SDK Manager in Android Studio and install missing components

---

## Step 8: Generate APK (Optional)

If you need an APK file for distribution:

```bash
flutter build apk --release
```

The APK will be located at:
`flutter-mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## Step 9: Run Tests (Optional)

If tests exist in the project:

```bash
flutter test
```

---

## Troubleshooting

### Issue: "path_provider" not found
- Solution: Run `flutter pub get` to install the dependency

### Issue: Gradle sync fails
- Solution: In Android Studio, go to File → Invalidate Caches → Invalidate and Restart

### Issue: Emulator not starting
- Solution: Open AVD Manager in Android Studio and create a new virtual device

### Issue: API connection fails
- Note: The app uses `http://localhost:5005/api` for development. Ensure the backend server is running on port 5005.

---

## Important Notes

- The app requires a backend server running on `http://localhost:5005/api` for full functionality
- For production, update the production URL in `lib/services/api_service.dart`
- The app uses secure storage for tokens - ensure the device is unlocked for biometric auth features
