import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("app.cash.paparazzi")
}

android {
    namespace = "me.watchy.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "me.watchy.tv"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        // Stream server connection, same values as the website's HTV_BASE_URL / HTV_SECRET.
        // Put them in android/secrets.properties (never committed) or pass -PhtvSecret=...
        val secrets = Properties().apply {
            rootProject.file("secrets.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
        }
        fun setting(name: String, default: String = "") =
            ((project.findProperty(name) as String?) ?: secrets.getProperty(name) ?: default).trim()
        buildConfigField("String", "HTV_BASE_URL", "\"${setting("htvBaseUrl", "https://tv.zuxi.me")}\"")
        buildConfigField("String", "HTV_SECRET", "\"${setting("htvSecret").trim('/')}\"")
    }

    buildFeatures { buildConfig = true }
    // Team logos, provider logos and matchup art come from the website's public/ folder.
    sourceSets["main"].assets.srcDir(rootProject.file("../public"))
    lint { checkReleaseBuilds = false }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the debug key so the APK installs straight over adb.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil:2.7.0")
    implementation("io.coil-kt:coil-svg:2.7.0")
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.4.1")
    implementation("androidx.media3:media3-datasource-okhttp:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
}
