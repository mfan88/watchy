#!/usr/bin/env bash
# Builds Watchy.app and wraps it in a DMG (macOS only; CI runs this).
#   ./build_dmg.sh <version>
#
# With these env vars set, the app and DMG are signed with your Developer ID and
# notarized by Apple, so they open without any Gatekeeper warning:
#   MACOS_CERT_P12_BASE64, MACOS_CERT_PASSWORD   Developer ID Application cert + key (.p12)
#   APPLE_ID, APPLE_APP_PASSWORD, APPLE_TEAM_ID  for notarytool
# Without them the app is ad-hoc signed (users must allow it in Privacy & Security).
# No stream key is built in: the app signs in with a Watchy account.
set -euo pipefail
cd "$(dirname "$0")"
VERSION=${1:-0.0.0}
RUNNER_TEMP=${RUNNER_TEMP:-$(mktemp -d)}

flutter pub get
flutter build macos --release --build-name="$VERSION" --dart-define=APP_VERSION="$VERSION"

APP=build/macos/Build/Products/Release/Watchy.app
ENTITLEMENTS=macos/Runner/Release.entitlements
mkdir -p dist
DMG="dist/Watchy-$VERSION-macos.dmg"
rm -f "$DMG"

NOTARIZE=false
if [ -n "${MACOS_CERT_P12_BASE64:-}" ]; then
  # Import the certificate into a throwaway keychain.
  KEYCHAIN="$RUNNER_TEMP/watchy-signing.keychain-db"
  KC_PASS=$(uuidgen)
  echo "$MACOS_CERT_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/cert.p12"
  security create-keychain -p "$KC_PASS" "$KEYCHAIN"
  security set-keychain-settings -lut 21600 "$KEYCHAIN"
  security unlock-keychain -p "$KC_PASS" "$KEYCHAIN"
  security import "$RUNNER_TEMP/cert.p12" -P "$MACOS_CERT_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN"
  security set-key-partition-list -S apple-tool:,apple: -s -k "$KC_PASS" "$KEYCHAIN" >/dev/null
  security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')
  rm -f "$RUNNER_TEMP/cert.p12"
  IDENTITY=$(security find-identity -v -p codesigning "$KEYCHAIN" | grep "Developer ID Application" | head -1 | sed -E 's/.*"(.*)"/\1/')
  [ -n "$IDENTITY" ] || { echo "No 'Developer ID Application' identity in the certificate"; exit 1; }
  echo "Signing as: $IDENTITY"

  # Sign inside-out: every nested library and framework, then the app, with the
  # hardened runtime and a secure timestamp (both required for notarization).
  find "$APP/Contents" \( -name "*.dylib" -o -name "*.so" \) -type f -print0 | while IFS= read -r -d '' f; do
    codesign --force --timestamp --options runtime --sign "$IDENTITY" "$f"
  done
  find "$APP/Contents" -name "*.framework" -type d | awk '{ print length, $0 }' | sort -rn | cut -d' ' -f2- | while read -r fw; do
    codesign --force --timestamp --options runtime --sign "$IDENTITY" "$fw"
  done
  codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$APP"
  codesign --verify --deep --strict --verbose=2 "$APP"
  NOTARIZE=true
else
  echo "::warning::No Developer ID certificate: the app is ad-hoc signed and macOS will warn on first open."
  codesign --force --deep --sign - "$APP"   # ad-hoc signature so Apple Silicon Macs run it
fi

STAGE=$(mktemp -d)
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname Watchy -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"

if [ "$NOTARIZE" = true ]; then
  codesign --force --timestamp --sign "$IDENTITY" "$DMG"
  # Apple scans it (usually a few minutes); --wait fails the build if it's rejected.
  xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_APP_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" --wait --timeout 30m --output-format json | tee "$RUNNER_TEMP/notary.json"
  if ! grep -q '"status" *: *"Accepted"' "$RUNNER_TEMP/notary.json"; then
    ID=$(sed -nE 's/.*"id" *: *"([^"]+)".*/\1/p' "$RUNNER_TEMP/notary.json" | head -1)
    [ -n "$ID" ] && xcrun notarytool log "$ID" --apple-id "$APPLE_ID" --password "$APPLE_APP_PASSWORD" --team-id "$APPLE_TEAM_ID" || true
    echo "Notarization was not accepted"; exit 1
  fi
  xcrun stapler staple "$DMG"
  spctl --assess --type open --context context:primary-signature -v "$DMG"
fi
echo "Done: $(pwd)/$DMG"
