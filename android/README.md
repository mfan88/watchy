# Watchy for Android TV / Google TV

A native Android TV client for the Watchy web app. It signs in with the same
usernames and passwords (`HTV_USERS`) by calling the server's `/api/login`, keeps
the same 7-day session cookie, and plays streams from `/api/channels`, `/api/guide`
and `/api/stream`. No server changes are needed.

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
./gradlew assembleRelease -PwatchyServer=https://your-watchy-host
```

`-PwatchyServer` only prefills the server field on the sign-in screen; it can be left
out and typed on the TV. The APK is at `app/build/outputs/apk/release/app-release.apk`
(signed with the debug key so it installs directly).

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
