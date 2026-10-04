import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    // Google Services plugin for Firebase (commented out until Firebase is configured)
    // id("com.google.gms.google-services")
}

// Load the upload-keystore credentials (android/key.properties, not committed to git).
// When absent (e.g. CI or a fresh clone), release builds fall back to debug signing.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.sdachurch.sda_church_mobile"
    // SDK versions are managed by Flutter for consistency
    compileSdk = 35
    // NDK version for native code compatibility
    ndkVersion = "28.2.13676358"

    compileOptions {
        // Java 17 for compatibility with current Flutter and Android Gradle Plugin
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Required by flutter_local_notifications
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.sdachurch.sda_church_mobile"
        minSdk = 23 // another_telephony requires API 23+ (Android 6.0)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Two launchers from one codebase:
    //   client — "Msabato"        com.sdachurch.sda_church_mobile
    //   admin  — "Msabato Admin"  com.sdachurch.sda_church_mobile.admin
    // Different applicationIds → both install side-by-side on one phone.
    flavorDimensions += "app"
    productFlavors {
        create("client") {
            dimension = "app"
            manifestPlaceholders["appName"] = "Msabato"
        }
        create("admin") {
            dimension = "app"
            applicationIdSuffix = ".admin"
            manifestPlaceholders["appName"] = "Msabato Admin"
        }
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = keystoreProperties["storeFile"]?.let { file(it) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists())
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")

            // Enable code shrinking and obfuscation for release builds
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
