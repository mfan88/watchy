# Watchy for macOS (Flutter)

Desktop version of the Watchy TV apps: **Home** (one row per live game, click a stream to
play) and **Guide** (TV-guide grid). Like the Android TV and Tizen apps it reads the
playlist and guide straight from the stream server and has no login. Video plays through
`video_player`, which uses Apple's AVPlayer (native HLS).

Player keys: ↑/↓ change stream, Space pause, Enter retry, Esc back. Clicking a stream chip
at the bottom switches between feeds of the same game.

## Make a DMG with the key baked in (on a Mac)

Needs Flutter 3.24+ and Xcode.

```bash
cp secrets.properties.example secrets.properties   # fill in htvSecret (git-ignored)
./build_dmg.sh                                     # -> mac/Watchy.dmg
```

Anyone with the DMG can extract the key, so only share it with people you trust. The app
is ad-hoc signed, not notarized: the first time, right-click Watchy → **Open** (or System
Settings → Privacy & Security → Open Anyway).

Without `build_dmg.sh`, `flutter build macos --release` builds an app that asks for the key once.

`assets/public` is a symlink to the website's `public/` folder (logos and matchup art).

## Tests / screenshots (any OS)

```bash
flutter test                                   # parser checks
flutter test --update-goldens test/screens_test.dart   # re-render test/goldens/*.png
```
