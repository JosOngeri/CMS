# Android Signing and Distribution Guide

## Overview
This guide covers the secure signing and distribution process for the SDA Church Mobile Android app.

## Prerequisites

### Required Tools
- Java Development Kit (JDK) 17+
- Android SDK
- Flutter SDK
- Keytool (included with JDK)

### Required Accounts
- Google Play Developer account ($25 one-time fee)
- Google Cloud project (for Firebase)

## Signing Configuration

### 1. Generate Signing Key

#### Create Keystore
```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

#### Important Notes
- **Store the keystore securely** - never commit to source control
- **Remember passwords** - store in secure password manager
- **Keep backup** - store keystore in secure location
- **Document aliases** - note the alias used

### 2. Configure Signing in build.gradle.kts

#### Create keystore.properties
Create `android/keystore.properties` (add to .gitignore):
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=upload
storeFile=/path/to/your/upload-keystore.jks
```

#### Update build.gradle.kts
```kotlin
// Load keystore properties
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

### 3. Update .gitignore
Add these lines to `.gitignore`:
```
android/keystore.properties
*.jks
*.keystore
```

## Build Configuration

### Debug Build
```bash
flutter build apk --debug
```

### Release APK
```bash
flutter build apk --release
```

### Release App Bundle (Recommended for Play Store)
```bash
flutter build appbundle --release
```

## Release Testing

### 1. Test Debug Build
```bash
flutter build apk --debug
flutter install
```

### 2. Test Release Build
```bash
flutter build apk --release
flutter install
```

### 3. Verify Release Configuration
- Check that production API is used
- Verify debug logging is disabled
- Confirm no development features are active
- Test on physical device
- Test on different Android versions

## Play Store Preparation

### 1. App Information
- **App Name**: SDA Church Kiserian
- **Short Description**: Official mobile app for SDA Church Kiserian
- **Full Description**: Comprehensive app description
- **Category**: Lifestyle
- **Content Rating**: Everyone

### 2. Store Listing Assets
- **High-res Icon**: 512x512px
- **Feature Graphic**: 1024x500px
- **Screenshots**: At least 2 (phone and tablet)
- **Promo Graphic**: 180x120px (optional)
- **TV Banner**: 1280x720px (optional)

### 3. Privacy Policy
- Create privacy policy page
- Include data collection practices
- Explain user data handling
- Provide contact information
- Host on church website

### 4. Data Safety Disclosure
- Declare data collection practices
- Specify data sharing policies
- List security practices
- Explain data deletion process

### 5. Content Rating
- Complete content rating questionnaire
- Provide accurate information
- Submit for review

## Release Process

### 1. Internal Testing
```bash
flutter build appbundle --release
```
- Upload to Google Play Console
- Add internal testers
- Test thoroughly
- Fix any issues

### 2. Closed Testing
- Add trusted testers
- Collect feedback
- Fix bugs
- Update as needed

### 3. Open Testing (Optional)
- Open to wider audience
- Monitor crash reports
- Gather user feedback
- Prepare for production

### 4. Production Release
- Final testing complete
- All issues resolved
- Release notes prepared
- Deploy to production

## Version Management

### Update Version Numbers
Update `pubspec.yaml`:
```yaml
version: 1.0.0+1  # version+buildNumber
```

### Update build.gradle.kts
```kotlin
defaultConfig {
    versionCode = flutter.versionCode
    versionName = flutter.versionName
}
```

## Security Best Practices

### Keystore Security
- Never commit keystore to version control
- Store in secure location (encrypted drive)
- Use strong passwords
- Document keystore location
- Keep backups in secure locations

### Build Security
- Use separate signing keys for different environments
- Rotate signing keys if compromised
- Monitor for unauthorized builds
- Use code obfuscation in release
- Remove debug code from release builds

### API Security
- Use production API in release builds
- Never hardcode API keys
- Use environment-specific configurations
- Implement proper authentication
- Use HTTPS for all API calls

## Troubleshooting

### Build Errors
- **Keystore not found**: Check keystore.properties path
- **Password errors**: Verify keystore passwords
- **Signing config errors**: Check build.gradle.kts configuration
- **ProGuard errors**: Update proguard-rules.pro

### Installation Issues
- **Signature mismatch**: Ensure consistent signing
- **Version conflicts**: Update version numbers
- **Permission errors**: Check AndroidManifest.xml
- **Install failed**: Check device compatibility

### Play Store Issues
- **Policy violations**: Review Play Store policies
- **Content rating**: Complete content rating questionnaire
- **Asset issues**: Verify all required assets
- **Privacy policy**: Ensure privacy policy is accessible

## Monitoring

### Crash Reporting
- Set up Firebase Crashlytics
- Monitor crash reports
- Fix critical issues promptly
- Track crash-free users

### Analytics
- Set up Firebase Analytics
- Monitor user engagement
- Track feature usage
- Analyze user behavior

### Performance Monitoring
- Monitor app performance
- Track ANR rates
- Monitor startup time
- Optimize as needed

## Current Status

### Completed
- ✅ Debug build configuration
- ✅ Release build configuration
- ✅ Environment-specific manifests
- ✅ ProGuard rules
- ✅ Build configuration

### Pending
- ⏳ Generate signing keystore
- ⏳ Configure signing in build.gradle.kts
- ⏳ Create Play Store assets
- ⏳ Write privacy policy
- ⏳ Complete data safety disclosure
- ⏳ Set up internal testing track

## Next Steps

1. Generate signing keystore
2. Configure signing in build.gradle.kts
3. Create Play Store assets
4. Write privacy policy
5. Complete Play Store setup
6. Test release build on physical device
7. Upload to internal testing track
8. Monitor and iterate