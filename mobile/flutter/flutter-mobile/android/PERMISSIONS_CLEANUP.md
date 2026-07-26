# Android Permissions Cleanup - Phase 1.3

## Removed Permissions

The following permissions were removed as they are not currently used by the app:

1. **USE_FINGERPRINT** - Redundant with USE_BIOMETRIC
2. **RECEIVE_BOOT_COMPLETED** - No auto-start functionality implemented
3. **WAKE_LOCK** - No background services requiring wake locks
4. **FOREGROUND_SERVICE** - No foreground services implemented
5. **REQUEST_INSTALL_PACKAGES** - No app update/install functionality
6. **WRITE_EXTERNAL_STORAGE** - Not needed with modern scoped storage

## Retained Permissions

The following permissions are retained with justifications:

1. **INTERNET** - Required for API communication with backend
2. **CAMERA** - Required for image picker functionality in profile
3. **USE_BIOMETRIC** - Required for biometric authentication in login
4. **VIBRATE** - Required for notification feedback
5. **READ_EXTERNAL_STORAGE** (maxSdkVersion="32") - Required for image picker on Android 12 and below
6. **POST_NOTIFICATIONS** - Required for Firebase Cloud Messaging on Android 13+

## Permission Usage Mapping

| Permission | Used By | Feature |
|------------|----------|---------|
| INTERNET | ApiService | All API calls |
| CAMERA | image_picker | Profile photo upload |
| USE_BIOMETRIC | local_auth | Biometric login |
| VIBRATE | Notifications | Alert feedback |
| READ_EXTERNAL_STORAGE | image_picker | Image selection (Android ≤12) |
| POST_NOTIFICATIONS | firebase_messaging | Push notifications (Android 13+) |

## Runtime Permission Handling

The app should request runtime permissions at the point of use:

1. **Camera**: When user taps to select/capture image
2. **Biometric**: When user enables biometric login
3. **Notifications**: When enabling push notifications
4. **Storage**: When user tries to select image (Android ≤12)

## Compliance Notes

- Permissions follow Android's principle of least privilege
- Removed permissions that could trigger Google Play Policy warnings
- Added POST_NOTIFICATIONS for Android 13+ compliance
- Scoped READ_EXTERNAL_STORAGE to Android 12 and below only
- All retained permissions have corresponding user-facing features

## Testing Required

After permission cleanup, test the following:
1. [ ] App launches without permission-related crashes
2. [ ] Camera/image picker works when requested
3. [ ] Biometric authentication works when enabled
4. [ ] Notifications work on Android 13+ devices
5. [ ] Image selection works on Android 12 and below
6. [ ] API communication works normally
