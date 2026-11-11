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
        // Release builds pass -PappVersion=2.0.0 (from the git tag); local builds are 0.0.0-dev.
        val ver = ((project.findProperty("appVersion") as String?) ?: "0.0.0").trimStart('v')
        val nums = ver.split('.', '-').map { it.toIntOrNull() ?: 0 } + listOf(0, 0, 0)
        versionCode = maxOf(1, nums[0] * 10000 + nums[1] * 100 + nums[2])
        versionName = ver
        // Where the app logs in and where it looks for updates. No key is built in.
        val authUrl = (project.findProperty("authUrl") as String?) ?: "https://tv.zuxi.me/auth/key"
        val updateRepo = (project.findProperty("updateRepo") as String?) ?: "mfan88/watchy"
        buildConfigField("String", "AUTH_URL", "\"$authUrl\"")
        buildConfigField("String", "UPDATE_REPO", "\"$updateRepo\"")
    }

    // A fixed signing key is required so updates install over the previous version.
    // CI provides it via environment variables; local builds fall back to the debug key.
    val ks = System.getenv("ANDROID_KEYSTORE_FILE")
    signingConfigs {
        if (ks != null) create("release") {
            storeFile = file(ks)
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "watchy"
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
        }
    }

    buildFeatures { buildConfig = true }
    // Team logos, provider logos and matchup art come from the website's public/ folder.
    sourceSets["main"].assets.srcDir(rootProject.file("../public"))
    lint { checkReleaseBuilds = false }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
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
