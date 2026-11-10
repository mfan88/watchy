# Watchy for Android TV / Google TV

A native Android TV client for Watchy. It connects straight to the stream server
(`HTV_BASE_URL/HTV_SECRET/playlist.m3u`, `guide.xml` and the `.m3u8` streams), the same
source the website's server reads, so it does not need the Vercel site and has no sign-in.
Team logos, provider logos and matchup art are bundled from `../public`.

- **Home**: one row per live (or starting-soon) game. The big tile plays the first
  feed; the chips beside it jump straight into each feed (home/away feeds are labelled
  and listed first when the feed name says so).
- **Guide**: a TV-guide grid, one row per stream on a 3-hour time axis, with a "now" line.
- **Player**: full-screen ExoPlayer. Up/Down (or CH+/CH−) flips streams, OK shows
  controls, Back exits.

Minimum Android 6.0 (API 23), so it runs on the Mi Box 3/3S.

## Build

Needs JDK 17+ and the Android SDK (`sdk.dir` in `local.properties` or `ANDROID_HOME`).

```bash
cp secrets.properties.example secrets.properties   # then fill in htvSecret (same as HTV_SECRET)
./gradlew assembleRelease
```

The secret is baked into the APK, so anyone who has the APK can extract it: share it
only with people you'd give the stream server address to. Built without `htvSecret`,
the app asks for the key once on first launch and remembers it.

The APK is at `app/build/outputs/apk/release/app-release.apk` (signed with the debug
key so it installs directly).

## Install on the Mi Box over adb

Enable Developer options → USB/Network debugging on the box, then:

```bash
adb connect <box-ip>:5555
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Screenshots without a device

```bash
./gradlew recordPaparazziDebug   # writes app/src/test/snapshots/images/*.png
```
