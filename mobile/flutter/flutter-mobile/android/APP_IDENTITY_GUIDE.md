# App Identity and Branding Guide

## Current App Identity

### Package Information
- **Package Name**: `com.sdachurch.sda_church_mobile`
- **App Name**: SDA Church Kiserian
- **Version**: 1.0.0 (1)
- **Min SDK**: Flutter managed
- **Target SDK**: Flutter managed

### Current Launcher Icons
- **Status**: Default Flutter launcher icons
- **Location**: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- **Adaptive Icons**: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`

## Branding Requirements

### App Icon Specifications
- **Style**: Modern, clean, recognizable
- **Colors**: Blue (#3B82F6) and Gold (#F59E0B) gradient
- **Symbol**: Church icon or cross symbol
- **Background**: White (#FFFFFF) for adaptive icons
- **Foreground**: Church icon with gradient colors

### Icon Sizes Required
- **mdpi**: 48x48px
- **hdpi**: 72x72px
- **xhdpi**: 96x96px
- **xxhdpi**: 144x144px
- **xxxhdpi**: 192x192px
- **Adaptive**: 108x108px (foreground), 108x108px (background)

## Launcher Icon Generation

### Using Flutter Launcher Icons
The app is configured to use `flutter_launcher_icons` for icon generation.

**Current Configuration** (pubspec.yaml):
```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/images/app_icon.png"
  adaptive_icon_background: "#ffffff"
  adaptive_icon_foreground: "assets/images/app_icon.png"
```

### Steps to Generate Custom Icons

1. **Create App Icon**:
   - Design a 1024x1024px app icon
   - Use church icon with blue/gold gradient
   - Ensure it's recognizable at small sizes
   - Save as `assets/images/app_icon.png`

2. **Generate Icons**:
   ```bash
   flutter pub get
   flutter pub run flutter_launcher_icons
   ```

3. **Verify Icons**:
   - Check generated icons in `android/app/src/main/res/`
   - Test on different screen sizes
   - Verify adaptive icons work correctly

## App Branding Elements

### Color Scheme
- **Primary Color**: #3B82F6 (Blue)
- **Secondary Color**: #F59E0B (Gold)
- **Background**: #FEFDFB (Off-white)
- **Surface**: #FFFFFF (White)
- **Error**: #EF4444 (Red)
- **Success**: #22C55E (Green)

### Typography
- **Font Family**: System default (Roboto on Android)
- **Font Weights**: Regular (400), Medium (500), Semi-bold (600), Bold (700)
- **Font Sizes**: 12px to 32px

### App Bar Branding
- **Title**: SDA Church Kiserian
- **Color**: Off-white background with dark text
- **Elevation**: 0 (flat design)
- **Center Title**: Yes

## Splash Screen

### Current Splash Screen
- **Status**: Default Flutter splash screen
- **Location**: `android/app/src/main/res/drawable-*/launch_background.xml`

### Custom Splash Screen Requirements
- **Background**: Blue (#3B82F6) to Gold (#F59E0B) gradient
- **Logo**: Church icon in center
- **App Name**: SDA Church Kiserian
- **Animation**: Subtle fade-in effect

### Splash Screen Implementation
1. Create custom splash screen drawable
2. Add to `android/app/src/main/res/drawable-*/`
3. Update `android/app/src/main/res/values/styles.xml`
4. Test on different devices

## Notification Icon

### Current Status
- **Status**: Default notification icon
- **Requirement**: White version of app icon
- **Location**: `android/app/src/main/res/drawable-*/ic_notification.png`

### Notification Icon Specifications
- **Size**: 24x24px (white on transparent)
- **Style**: Simplified church icon
- **Color**: White (#FFFFFF)
- **Background**: Transparent

## App Store Assets

### Google Play Store Requirements
- **High-res Icon**: 512x512px
- **Feature Graphic**: 1024x500px
- **Screenshots**: At least 2 screenshots (phone and tablet)
- **Promo Graphic**: 180x120px (optional)
- **TV Banner**: 1280x720px (optional)

### Asset Creation Guidelines
1. **High-res Icon**: Use same design as app icon
2. **Feature Graphic**: Wide banner with app branding
3. **Screenshots**: Show key features (dashboard, payments, announcements)
4. **Promo Graphic**: Simplified app logo
5. **TV Banner**: App name and logo for Android TV

## Branding Consistency

### Web vs Mobile Consistency
- **Colors**: Match web app color scheme
- **Typography**: Use similar font weights
- **Logo**: Consistent church icon
- **Layout**: Similar card-based design
- **Navigation**: Consistent navigation patterns

### Cross-Platform Consistency
- **iOS**: Match Android branding when iOS app is developed
- **Web**: Ensure consistent branding across platforms
- **Materials**: Use consistent colors and fonts
- **Voice**: Consistent tone in copy and messaging

## Testing Branding

### Visual Testing Checklist
- [ ] Launcher icon displays correctly on home screen
- [ ] App icon appears in app switcher
- [ ] Notification icon is visible in status bar
- [ ] Splash screen displays correctly
- [ ] App bar title is readable
- [ ] Color scheme is consistent across screens
- [ ] Icons are recognizable at different sizes
- [ ] Dark theme maintains brand colors

### Device Testing
- [ ] Test on small phones (5" screen)
- [ ] Test on medium phones (6" screen)
- [ ] Test on large phones (6.5"+ screen)
- [ ] Test on tablets
- [ ] Test with different pixel densities
- [ ] Test in landscape orientation

## Branding Updates

### Version 1.0.0 Current Status
- [x] Basic app identity configured
- [x] Color scheme defined
- [x] Typography system established
- [ ] Custom launcher icons (pending)
- [ ] Custom splash screen (pending)
- [ ] Notification icon (pending)
- [ ] Play Store assets (pending)

### Future Enhancements
1. Generate custom launcher icons
2. Create custom splash screen
3. Design notification icon
4. Create Play Store assets
5. Implement app shortcuts
6. Add dynamic icons for notifications

## Branding Resources

### Design Tools
- [Canva](https://www.canva.com/) - Design app icons and graphics
- [Figma](https://www.figma.com/) - Design mockups and assets
- [Android Asset Studio](https://developer.android.com/studio/write/icon-designer) - Generate icons
- [Photopea](https://www.photopea.com/) - Edit images online

### Icon Generators
- [Android Asset Studio](https://developer.android.com/studio/write/icon-designer)
- [AppIconGenerator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)
- [IconKitchen](https://icon.kitchen/)

### Color Tools
- [Coolors](https://coolors.co/) - Color palette generator
- [Adobe Color](https://color.adobe.com/) - Color wheel and tools
- [Material Design Color Tool](https://material.io/resources/color/)

## Current Status Summary

### Completed
- ✅ Package name configured
- ✅ App name set
- ✅ Color scheme defined
- ✅ Typography system established
- ✅ Basic launcher icons (default)
- ✅ Adaptive icon configuration

### Pending
- ⚠️ Custom launcher icons
- ⚠️ Custom splash screen
- ⚠️ Notification icon
- ⚠️ Play Store assets
- ⚠️ App shortcuts
- ⚠️ Dynamic notification icons

## Next Steps

1. Design custom app icon with church branding
2. Generate launcher icons using flutter_launcher_icons
3. Create custom splash screen
4. Design notification icon
5. Create Play Store assets
6. Test branding across different devices
7. Ensure consistency with web app