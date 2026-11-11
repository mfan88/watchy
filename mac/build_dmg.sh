#!/usr/bin/env bash
# Builds Watchy.app with the access key baked in and wraps it in Watchy.dmg.
# Run on a Mac with Flutter and Xcode. The key is read from mac/secrets.properties
# (htvSecret=..., git-ignored); htvBaseUrl= is optional.
set -euo pipefail
cd "$(dirname "$0")"

[ -f secrets.properties ] || { echo "Create mac/secrets.properties from secrets.properties.example first"; exit 1; }
prop() { grep -E "^$1=" secrets.properties | tail -1 | cut -d= -f2- || true; }
SECRET=$(prop htvSecret); SECRET=${SECRET#/}; SECRET=${SECRET%/}
BASE=$(prop htvBaseUrl); BASE=${BASE:-https://tv.zuxi.me}
[ -n "$SECRET" ] || { echo "htvSecret is empty in mac/secrets.properties"; exit 1; }

flutter pub get
flutter build macos --release --dart-define=HTV_SECRET="$SECRET" --dart-define=HTV_BASE_URL="$BASE"

APP=build/macos/Build/Products/Release/Watchy.app
codesign --force --deep --sign - "$APP"   # ad-hoc signature so Apple Silicon Macs run it

STAGE=$(mktemp -d)
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f Watchy.dmg
hdiutil create -volname Watchy -srcfolder "$STAGE" -ov -format UDZO Watchy.dmg
rm -rf "$STAGE"
echo "Done: $(pwd)/Watchy.dmg"
