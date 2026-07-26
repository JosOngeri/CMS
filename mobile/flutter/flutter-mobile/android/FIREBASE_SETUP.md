# Firebase Setup Instructions

## Current Status
Firebase is configured with placeholder values. The app will work without Firebase configuration, but push notifications will not function.

## Required Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "SDA Church Kiserian Mobile"
3. Enable Cloud Messaging (FCM) for the project

### 2. Add Android App
1. In Firebase Console, add an Android app
2. Package name: `com.sdachurch.sda_church_mobile`
3. Download `google-services.json`
4. Replace the placeholder `google-services.json` in `android/app/` directory

### 3. Configure SHA-1 Certificate
1. Get your SHA-1 certificate:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore
   ```
2. Add SHA-1 certificate to Firebase Console settings

### 4. Update google-services.json
Replace the placeholder values in `android/google-services.json`:
- `PLACEHOLDER_PROJECT_NUMBER` → Your project number
- `placeholder-project-id` → Your project ID
- `PLACEHOLDER_APP_ID` → Your app ID
- `PLACEHOLDER_CERTIFICATE_HASH` → Your SHA-1 certificate hash
- `PLACEHOLDER_CLIENT_ID` → Your OAuth client ID
- `PLACEHOLDER_API_KEY` → Your API key

### 5. Notification Channels
The app uses the following notification channels:
- `sda_church_channel` - General notifications

### 6. Topics
The app subscribes to these Firebase topics:
- `announcements` - Church announcements
- `payments` - Payment notifications
- `events` - Event notifications

## Testing Firebase

### Test FCM Token
After setup, check the FCM token in debug logs:
```
FCM Token: your_fcm_token_here
```

### Test Notification
Use Firebase Console to send a test notification to your device.

## Troubleshooting

### Firebase initialization fails
- Ensure `google-services.json` is in the correct location
- Check that the package name matches Firebase configuration
- Verify Google Services plugin is applied in build.gradle

### Notifications not received
- Check notification permission is granted
- Verify device has Google Play Services
- Check app is not in battery optimization
- Test with app in foreground and background

### Build errors
- Ensure all Firebase dependencies are compatible
- Check that Android SDK versions are correct
- Verify Google Services plugin version

## Notes
- The app works without Firebase configuration (notifications will be disabled)
- Firebase initialization is non-blocking to prevent app crashes
- Local notifications are used for foreground messages
- Background messages require proper Firebase setup