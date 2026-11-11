# Watchy desktop (Flutter): macOS, Windows, Linux

Desktop version of the Watchy TV apps: **Home** (one row per live game, click a stream to
play) and **Guide** (TV-guide grid). Users sign in with a Watchy account at the stream
server's `/auth/key` endpoint, which returns the stream key; nothing secret is built in.
Video plays through `media_kit` (libmpv) on all three platforms. Installs from the
DMG, the Windows installer and the AppImage update themselves from the latest GitHub release
(`lib/updater.dart`).

Player keys: ↑/↓ change stream, Space pause, Enter retry, Esc back. Clicking a stream chip
at the bottom switches between feeds of the same game.

## Build

Releases are built by GitHub Actions (`.github/workflows/apps.yml`): DMG, Windows
installer + portable zip, Linux AppImage + tar.gz. Locally, on each platform:

```bash
flutter build macos   --release --dart-define=APP_VERSION=2.0.0   # or: ./build_dmg.sh 2.0.0
flutter build windows --release --dart-define=APP_VERSION=2.0.0   # installer: packaging/installer.iss
flutter build linux   --release --dart-define=APP_VERSION=2.0.0   # AppImage: packaging/build_appimage.sh 2.0.0
```

Linux needs `clang cmake ninja-build pkg-config libgtk-3-dev libmpv-dev`. Builds without
`APP_VERSION` never offer updates. `--dart-define=AUTH_URL=` overrides the sign-in endpoint.

`assets/public` is a symlink to the website's `public/` folder (logos and matchup art).

## Tests / screenshots (any OS)

```bash
flutter test                                   # parser checks
flutter test --update-goldens test/screens_test.dart   # re-render test/goldens/*.png
```
