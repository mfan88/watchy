#!/usr/bin/env bash
# Builds Watchy.app and wraps it in a DMG (macOS only; CI runs this).
#   ./build_dmg.sh <version>
# No stream key is built in: the app signs in with a Watchy account.
set -euo pipefail
cd "$(dirname "$0")"
VERSION=${1:-0.0.0}

flutter pub get
flutter build macos --release --build-name="$VERSION" --dart-define=APP_VERSION="$VERSION"

APP=build/macos/Build/Products/Release/Watchy.app
codesign --force --deep --sign - "$APP"   # ad-hoc signature so Apple Silicon Macs run it

mkdir -p dist
STAGE=$(mktemp -d)
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
DMG="dist/Watchy-$VERSION-macos.dmg"
rm -f "$DMG"
hdiutil create -volname Watchy -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"
echo "Done: $(pwd)/$DMG"
