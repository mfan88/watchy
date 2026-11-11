# Watchy for Android TV / Google TV

A native Android TV client for Watchy. Users sign in with a Watchy account at the stream
server's `/auth/key` endpoint (see [docs/pi-auth-service.md](../docs/pi-auth-service.md)),
which returns the stream key. The app then reads `playlist.m3u` and `guide.xml` and plays
the streams straight from the stream server. No key is built into the APK. It re-checks
the login on every launch and updates itself from the latest GitHub release.

- **Home**: one row per live (or starting-soon) game. The big tile plays the first
  feed; the chips beside it jump straight into each feed (home/away feeds are labelled
  and listed first when the feed name says so).
- **Guide**: a TV-guide grid, one row per stream on a 3-hour time axis, with a "now" line.
- **Player**: full-screen ExoPlayer. Up/Down (or CH+/CH−) flips streams, OK shows
  controls, Back exits.

Minimum Android 6.0 (API 23), so it runs on the Mi Box 3/3S.

## Build

Releases are built by GitHub Actions (`.github/workflows/apps.yml`). Locally:

```bash
./gradlew assembleRelease -PappVersion=2.0.0
```

Options: `-PauthUrl=` (default `https://tv.zuxi.me/auth/key`), `-PupdateRepo=` (default
`mfan88/watchy`). For updates to install over an existing install, every release must be
signed with the same key: CI uses `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD`.
Local builds use the debug key.

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
