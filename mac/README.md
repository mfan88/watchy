# Watchy for macOS (Flutter)

Desktop version of the Watchy TV apps: **Home** (one row per live game, click a stream to
play) and **Guide** (TV-guide grid). Like the Android TV and Tizen apps it reads the
playlist and guide straight from the stream server and has no login. Video plays through
`video_player`, which uses Apple's AVPlayer (native HLS).

Player keys: ↑/↓ change stream, Space pause, Enter retry, Esc back. Clicking a stream chip
at the bottom switches between feeds of the same game.

## Build (on a Mac)

Needs Flutter 3.24+ and Xcode.

```bash
flutter pub get
flutter build macos --release --dart-define=HTV_SECRET=<your key>
```

The app is at `build/macos/Build/Products/Release/Watchy.app`; drag it to Applications.
Leave out `--dart-define=HTV_SECRET` and the app asks for the key once (and shows a key
button in the toolbar to change it). `--dart-define=HTV_BASE_URL=...` overrides
`https://tv.zuxi.me`.

The build isn't notarized, so the first launch needs right-click → **Open** (or System
Settings → Privacy & Security → Open Anyway).

`assets/public` is a symlink to the website's `public/` folder (logos and matchup art).

## Tests / screenshots (any OS)

```bash
flutter test                                   # parser checks
flutter test --update-goldens test/screens_test.dart   # re-render test/goldens/*.png
```
